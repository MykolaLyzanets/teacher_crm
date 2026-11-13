# frozen_string_literal: true

module FinanceUahCurrency
  extend ActiveSupport::Concern

  included do
    validate :finance_currency_must_be_uah
  end

  private

  def finance_currency_must_be_uah
    return if currency.blank?

    if currency.code != Finance::FinanceHelper::FINANCE_CURRENCY_CODE
      errors.add(:currency, 'must be UAH')
    end
  end
end
