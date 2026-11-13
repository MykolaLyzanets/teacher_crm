# frozen_string_literal: true

module Finance
  class RefundPayment
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(payment:, created_by:, amount_cents:, reason: nil)
      @payment = payment
      @created_by = created_by
      @amount_cents = amount_cents.to_i
      @reason = reason
    end

    attr_reader :refund_transaction, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      validate_inputs
      return false if errors.any?

      ActiveRecord::Base.transaction do
        payment.lock!
        remaining = FinanceHelper.remaining_refundable_cents(payment)
        if amount_cents > remaining
          errors.add(:amount_cents, 'exceeds refundable amount')
          raise ActiveRecord::Rollback
        end

        @refund_transaction = StudentTransaction.create!(
          workspace: payment.workspace,
          student_profile: payment.student_profile,
          currency: payment.currency,
          transaction_type: :refund,
          amount_cents: -amount_cents,
          status: :confirmed,
          related_transaction: payment,
          internal_note: reason,
          created_by:,
          confirmed_by: created_by,
          confirmed_at: Time.current
        )
      end

      return false if errors.any? || refund_transaction.nil?

      true
    rescue ActiveRecord::RecordInvalid => e
      errors.add(:base, e.message)
      false
    end

    def error_messages
      (errors.full_messages + Array(refund_transaction&.errors&.full_messages)).uniq
    end

    private

    attr_reader :payment, :created_by, :amount_cents, :reason

    def validate_inputs
      errors.add(:payment, 'must be a confirmed payment') if !payment.transaction_payment? || !payment.confirmed?
      if payment.currency&.code != FinanceHelper::FINANCE_CURRENCY_CODE
        errors.add(:payment, 'must be in UAH')
      end
      errors.add(:amount_cents, 'must be positive') if amount_cents <= 0
      return if errors.any?

      remaining = FinanceHelper.remaining_refundable_cents(payment)
      errors.add(:amount_cents, 'exceeds refundable amount') if amount_cents > remaining
    end
  end
end
