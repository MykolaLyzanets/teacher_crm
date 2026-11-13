# frozen_string_literal: true

module Finance
  class ChangeStudentBalance
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(workspace:, student_profile:, created_by:, amount_cents:, reason:)
      @workspace = workspace
      @student_profile = student_profile
      @created_by = created_by
      @amount_cents = amount_cents.to_i
      @reason = reason.to_s.strip
    end

    attr_reader :student_transaction, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      validate_inputs
      return false if errors.any?

      currency = FinanceHelper.finance_currency!
      @student_transaction = StudentTransaction.create!(
        workspace:,
        student_profile:,
        currency:,
        transaction_type: :adjustment,
        amount_cents:,
        status: :confirmed,
        internal_note: reason,
        created_by:,
        confirmed_by: created_by,
        confirmed_at: Time.current
      )
      true
    rescue ActiveRecord::RecordInvalid => e
      errors.add(:base, e.message)
      false
    end

    def error_messages
      (errors.full_messages + Array(student_transaction&.errors&.full_messages)).uniq
    end

    private

    attr_reader :workspace, :student_profile, :created_by, :amount_cents, :reason

    def validate_inputs
      errors.add(:amount_cents, 'must be non-zero') if amount_cents.zero?
      errors.add(:reason, "can't be blank") if reason.blank?
      if student_profile.present? && workspace.present? && student_profile.workspace_id != workspace.id
        errors.add(:student_profile_id, 'must belong to the workspace')
      end
    end
  end
end
