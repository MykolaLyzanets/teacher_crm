# frozen_string_literal: true

module StudentPortal
  class Finance
    LEDGER_CATEGORIES = ::Finance::StudentLedgerCategories::MAP

    def initialize(student_profile:)
      @student_profile = student_profile
      profile_finance = Students::ProfileFinance.new(student_profile:)
      @profile_data = profile_finance.summary
      @pricing = profile_finance.pricing
    end

    def call
      return nil if student_profile.blank?

      currency = @profile_data[:currency]
      balance = @profile_data[:balanceCents]
      lesson_price = @pricing[:defaultPriceCents]
      ledger = ledger_rows
      confirmed_rows = ledger.select { |item| counted?(item) }.reverse
      pending_rows = ledger.select { |item| item[:confirmationStatus].to_s == 'pending' }.reverse

      {
        currency:,
        balanceCents: balance,
        availableBalanceCents: @profile_data[:availableBalanceCents],
        debtCents: @profile_data[:debtCents],
        lessonPriceCents: lesson_price,
        nextLessonCovered: next_lesson_covered?(balance, lesson_price),
        status: balance_status(balance, currency, lesson_price),
        lastConfirmedPayment: last_payment(confirmed_rows),
        pendingPayments: pending_rows.map { |item| portal_row(item, with_balance: false) },
        transactions: confirmed_rows.map { |item| portal_row(item, with_balance: true) }
      }.with_indifferent_access
    end

    private

    attr_reader :student_profile

    def scoped_transactions
      StudentTransaction.where(workspace_id: student_profile.workspace_id, student_profile_id: student_profile.id)
                        .includes(:currency, :lesson, :related_transactions)
                        .order(:created_at, :id)
    end

    def ledger_rows
      running = 0
      scoped_transactions.map do |item|
        row = build_row(item)
        running += row[:amountCents].to_i if counted?(row)
        row.merge(
          balanceAfterCents: running,
          reversed: charge_reversed?(item)
        )
      end.reject { |item| item[:type].to_s == 'debt_allocation' }
    end

    def build_row(item)
      {
        id: item.id,
        date: item.created_at.to_date.iso8601,
        type: item.transaction_type,
        confirmationStatus: item.transaction_payment? ? item.status : nil,
        transactionStatus: transaction_status(item),
        amountCents: item.amount_cents,
        currency: item.currency.code,
        method: item.transaction_payment? ? item.method : nil,
        description: student_safe_description(item),
        relatedLessonId: item.lesson_id,
        relatedPaymentId: item.related_transaction_id
      }.with_indifferent_access
    end

    def transaction_status(item)
      return item.status if item.transaction_payment?

      return 'reversed' if item.related_transactions.confirmed.transaction_charge_reversal.exists?

      'confirmed'
    end

    def student_safe_description(item)
      return item.reference if item.transaction_payment? && item.reference.present?

      nil
    end

    def counted?(item)
      item[:type].to_s != 'debt_allocation' && %w[pending rejected].exclude?(item[:confirmationStatus].to_s)
    end

    def charge_reversed?(item)
      return false if !item.transaction_lesson_charge? && !item.transaction_cancellation_charge?

      item.related_transactions.confirmed.transaction_charge_reversal.exists?
    end

    def portal_row(item, with_balance:)
      label_info = student_facing_label(item)
      {
        id: item[:id],
        date: item[:date],
        label: label_info[:label],
        detail: label_detail(item, label_info[:detail]),
        category: LEDGER_CATEGORIES[item[:type].to_s],
        amountCents: item[:amountCents].to_i,
        balanceAfterCents: with_balance ? item[:balanceAfterCents] : nil,
        currency: item[:currency].presence || @profile_data[:currency],
        reversed: item[:reversed] == true,
        relatedLessonId: item[:relatedLessonId],
        transactionStatus: item[:transactionStatus]
      }.compact.with_indifferent_access
    end

    def label_detail(item, detail)
      status = item[:transactionStatus].to_s
      status_label = if status.present? && status != 'confirmed'
                       I18n.t("app.payments.tx_status_#{status}", default: status.humanize)
                     end
      parts = [detail, status_label].compact_blank
      parts.join(' · ').presence
    end

    def student_facing_label(item)
      type = item[:type].to_s
      method_key = item[:method].to_s
      method_label = (I18n.t("app.payments.methods.#{method_key}", default: method_key.humanize) if method_key.present?)

      case type
      when 'opening_balance'
        { label: I18n.t('app.student_portal.payments.type_opening_balance') }
      when 'payment'
        {
          label: I18n.t('app.student_portal.payments.type_top_up'),
          detail: method_label.presence || item[:description].presence
        }
      when 'lesson_charge'
        { label: I18n.t('app.student_portal.payments.type_lesson'), detail: item[:description].presence }
      when 'cancellation_charge'
        { label: I18n.t('app.student_portal.payments.type_late_cancel'), detail: item[:description].presence }
      when 'refund'
        detail = method_label.present? ? I18n.t('app.student_portal.payments.refund_via', method: method_label) : nil
        label = item[:relatedPaymentId].present? ? I18n.t('app.student_portal.payments.type_refund') : I18n.t('app.student_portal.payments.type_reversal')
        { label:, detail: }
      when 'charge_reversal'
        { label: I18n.t('app.student_portal.payments.type_reversal'), detail: item[:description].presence }
      when 'adjustment'
        { label: I18n.t('app.student_portal.payments.type_adjustment'), detail: item[:description].presence }
      else
        { label: I18n.t("app.payments.types.#{type}", default: type.humanize) }
      end
    end

    def balance_status(balance, currency, reference_price)
      price = reference_price.to_i
      if balance.negative?
        return {
          state: 'negative',
          health: 'debt',
          owedCents: balance.abs,
          currency:
        }
      end
      if price.positive? && balance < price
        return {
          state: 'low',
          health: 'low_balance',
          owedCents: 0,
          currency:,
          referencePriceCents: price
        }
      end

      {
        state: 'healthy',
        health: 'healthy',
        owedCents: 0,
        currency:,
        referencePriceCents: price.positive? ? price : nil
      }
    end

    def last_payment(confirmed_rows)
      payment = confirmed_rows.find { |item| item[:type].to_s == 'payment' }
      return nil if payment.blank?

      { date: payment[:date], amountCents: payment[:amountCents].to_i }
    end

    def next_lesson_covered?(balance, lesson_price)
      return true if lesson_price.to_i <= 0

      balance >= lesson_price.to_i
    end
  end
end
