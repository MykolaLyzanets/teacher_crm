# frozen_string_literal: true

module Finance
  class UndoTransaction
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    CAN_UNDO_TYPES = %w[lesson_charge cancellation_charge adjustment].freeze

    def initialize(transaction:, created_by:, reason: nil)
      @transaction = transaction
      @created_by = created_by
      @reason = reason
    end

    attr_reader :undo_transaction, :errors

    def save(use_transaction: true)
      @errors = ActiveModel::Errors.new(self)
      validate_transaction
      return false if errors.any?

      existing = StudentTransaction.confirmed
                                   .transaction_charge_reversal
                                   .find_by(related_transaction_id: transaction.id)
      if existing
        @undo_transaction = existing
        return true
      end

      run_undo = lambda do
        transaction.lock!
        @undo_transaction = create_undo_row!
        mark_teacher_earning_reversed! if transaction.lesson_id.present?
      end

      if use_transaction
        ActiveRecord::Base.transaction { run_undo.call }
      else
        run_undo.call
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      errors.add(:base, e.message)
      false
    end

    def error_messages
      (errors.full_messages + Array(undo_transaction&.errors&.full_messages)).uniq
    end

    private

    attr_reader :transaction, :created_by, :reason

    def validate_transaction
      type = transaction.transaction_type
      errors.add(:transaction, 'is not confirmed') if !transaction.confirmed?
      errors.add(:transaction, 'cannot be undone') if !CAN_UNDO_TYPES.include?(type)
      errors.add(:transaction, 'use RefundPayment for payments') if transaction.transaction_payment?
    end

    def create_undo_row!
      row_type = transaction.transaction_adjustment? ? :adjustment : :charge_reversal
      StudentTransaction.create!(
        workspace: transaction.workspace,
        student_profile: transaction.student_profile,
        lesson: transaction.lesson,
        currency: transaction.currency,
        transaction_type: row_type,
        amount_cents: -transaction.amount_cents,
        status: :confirmed,
        related_transaction: transaction,
        internal_note: reason,
        created_by:,
        confirmed_by: created_by,
        confirmed_at: Time.current,
        meta: { reversed_transaction_id: transaction.id }
      )
    end

    def mark_teacher_earning_reversed!
      earning_kind = transaction.transaction_lesson_charge? ? :lesson_completed : :cancellation_charged
      earning = TeacherEarning.find_by(
        lesson_id: transaction.lesson_id,
        student_profile_id: transaction.student_profile_id,
        kind: earning_kind,
        reversed_at: nil
      )
      return if earning.blank?

      earning.update!(reversed_at: Time.current)
    end
  end
end
