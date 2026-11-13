# frozen_string_literal: true

module Finance
  module StudentLedgerCategories
    MAP = {
      'payment' => 'top_ups',
      'opening_balance' => 'top_ups',
      'lesson_charge' => 'lessons',
      'cancellation_charge' => 'lessons',
      'adjustment' => 'adjustments',
      'refund' => 'refunds',
      'charge_reversal' => 'refunds'
    }.freeze

    FILTER_KEYS = %w[top_ups lessons adjustments refunds].freeze

    module_function

    def category_for(transaction_type)
      MAP[transaction_type.to_s]
    end
  end
end
