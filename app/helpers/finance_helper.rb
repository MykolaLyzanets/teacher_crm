# frozen_string_literal: true

module FinanceHelper
  PAYMENT_METHOD_KEYS = %w[cash bank_transfer card online other].freeze

  def payment_method_keys
    PAYMENT_METHOD_KEYS
  end

  def payment_method_label(method_key)
    key = method_key.to_s.presence
    return '—' if key.blank?

    I18n.t("app.payments.methods.#{key}", default: key.humanize)
  end

  def money_label(cents, currency = 'UAH')
    format_money_cents(cents, currency)
  end

  def balance_money_label(cents, currency = 'UAH')
    return "−#{money_label(cents, currency)}" if cents.to_i.negative?

    money_label(cents, currency)
  end

  def signed_money_label(cents, currency = 'EUR')
    label = money_label(cents.abs, currency)
    return "+#{label}" if cents.to_i.positive?
    return "−#{label}" if cents.to_i.negative?

    label
  end

  def grouped_money_label(totals)
    return '—' if totals.blank?

    totals.map { |currency, amount| format_money_cents(amount, currency) }.join(' + ')
  end

  def format_money_cents(cents, currency_code)
    record = Currency.find_by(code: currency_code.to_s.upcase)
    symbol = record&.symbol.presence || currency_code.to_s
    amount = (cents.to_i.abs / 100.0).round
    prefix = symbol.length == 1 ? symbol : "#{symbol} "
    "#{prefix}#{amount}"
  end

  def initials_for(name)
    parts = name.to_s.split(/\s+/).compact_blank
    return 'U' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def pay_balance_class(status)
    {
      'debt' => 'pay-balance--debt',
      'low_balance' => 'pay-balance--low',
      'payment_pending' => 'pay-balance--low'
    }[status.to_s] || 'pay-balance--ok'
  end

  def pay_balance_value_class(cents, health_status)
    return 'pay-balance--debt' if cents.to_i.negative?
    return 'pay-balance--low' if health_status.to_s == 'low_balance'

    'pay-balance--ok'
  end

  def pay_health_badge_icon(health_status)
    case health_status.to_s
    when 'debt' then 'alert-triangle'
    when 'low_balance' then 'bell'
    else 'circle-check'
    end
  end

  def pay_health_status_badge(health_status)
    tone = payment_status_tone(health_status)
    label = t("app.payments.status_#{health_status}", default: health_status.to_s.humanize)
    icon = pay_health_badge_icon(health_status)
    tag.span(class: "pay-status-badge pay-status-badge--#{tone}") do
      safe_join([
        icon_tag(icon, size: 14),
        label
      ])
    end
  end

  def pay_pending_payment_badge
    tag.span(class: 'pay-status-badge pay-status-badge--pending') do
      t('app.payments.pending_payment_badge')
    end
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
