# frozen_string_literal: true

module Finance
  class RejectPayment
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(payment:)
      @payment = payment
    end

    attr_reader :payment, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      validate_payment
      return false if errors.any?

      payment.status = :rejected
      payment.confirmed_by = nil
      payment.confirmed_at = nil
      return true if payment.save

      errors.merge!(payment.errors)
      false
    end

    def error_messages
      (errors.full_messages + Array(payment&.errors&.full_messages)).uniq
    end

    private

    def validate_payment
      errors.add(:payment, 'is not a payment') if !payment.transaction_payment?
      errors.add(:payment, 'is not pending') if !payment.pending?
    end
  end
end
