# frozen_string_literal: true

module Finance
  class ConfirmPayment
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(payment:, confirmed_by:)
      @payment = payment
      @confirmed_by = confirmed_by
    end

    attr_reader :payment, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      validate_payment
      return false if errors.any?

      payment.assign_attributes(status: :confirmed, confirmed_by:, confirmed_at: Time.current)
      return true if payment.save

      errors.merge!(payment.errors)
      false
    end

    def error_messages
      (errors.full_messages + Array(payment&.errors&.full_messages)).uniq
    end

    private

    attr_reader :confirmed_by

    def validate_payment
      errors.add(:payment, 'is not a payment') if !payment.transaction_payment?
      errors.add(:payment, 'is not pending') if !payment.pending?
    end
  end
end
