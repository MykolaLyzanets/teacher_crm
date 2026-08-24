# frozen_string_literal: true

module FinanceHelper
  def money_label(cents, currency = 'EUR')
    Demo::Finance.format_money(cents, currency)
  end

  def signed_money_label(cents, currency = 'EUR')
    Demo::Finance.format_signed_money(cents, currency)
  end

  def grouped_money_label(totals)
    Demo::Finance.grouped_money(totals)
  end

  def initials_for(name)
    parts = name.to_s.split(/\s+/).compact_blank
    return 'U' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def payment_status_tone(status)
    {
      'healthy' => 'olive',
      'low_balance' => 'amber',
      'debt' => 'rose',
      'payment_pending' => 'neutral'
    }[status.to_s] || 'neutral'
  end

  def availability_tone(status)
    {
      'teaching_now' => 'olive',
      'finished' => 'neutral',
      'available' => 'olive',
      'absent' => 'amber',
      'replacement_needed' => 'rose'
    }[status.to_s] || 'neutral'
  end
end
