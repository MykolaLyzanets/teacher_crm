# frozen_string_literal: true

module Students
  class ProfileFinance
    def initialize(student_profile:)
      @student_profile = student_profile
    end

    def balance_cents
      Finance::StudentBalance.new(student_profile:).balance_cents
    end

    def pricing
      price = reference_price_cents
      duration = reference_duration_minutes
      {
        defaultPriceCents: price.positive? ? price : nil,
        defaultDurationMinutes: duration,
        currency: currency_code
      }.compact.with_indifferent_access
    end

    def summary
      balance = balance_cents
      {
        currency: currency_code,
        balanceCents: balance,
        availableBalanceCents: [balance, 0].max,
        debtCents: [-balance, 0].max,
        outstandingCents: [-balance, 0].max,
        totalPaidCents: total_paid_cents,
        pendingPaymentsCount: pending_payments_count,
        lessonChargeCount: lesson_charge_count,
        lessonChargesTotalCents: lesson_charges_total_cents,
        balanceHealth: balance_health,
        hasOpeningBalance: opening_balance_set?,
        transactions: transaction_rows,
        ledger: ledger_entries
      }.with_indifferent_access
    end

    def ledger_entries
      running = 0
      rows = []
      transactions_for_list.each do |item|
        row = build_row(item)
        next if row[:type].to_s == 'debt_allocation'

        counted = ledger_counted?(row)
        running += row[:amountCents].to_i if counted
        rows << build_ledger_entry(item, row, counted ? running : nil)
      end
      rows.reverse
    end

    private

    attr_reader :student_profile

    def transactions_relation
      StudentTransaction.where(workspace_id: student_profile.workspace_id, student_profile_id: student_profile.id)
                        .order(:created_at, :id)
    end

    def transactions_for_list
      @transactions_for_list ||= load_transactions_for_list
    end

    def load_transactions_for_list
      records = transactions_relation.includes(:currency, :created_by, :related_transactions).to_a
      lesson_ids = records.filter_map(&:lesson_id).uniq
      if lesson_ids.empty?
        return records
      end

      lessons = Lesson.where(id: lesson_ids).includes(:subject, :lesson_type).index_by(&:id)
      records.each do |item|
        next if item.lesson_id.blank?

        lesson = lessons[item.lesson_id]
        item.association(:lesson).target = lesson if lesson
      end
      records
    end

    def transaction_rows
      transactions_for_list.map { |item| build_row(item) }
    end

    def build_row(item)
      type = item.transaction_type
      confirmation_status = item.transaction_payment? ? item.status : nil
      display_status = confirmation_status || charge_display_status(item)
      refundable = refundable_cents(item)

      {
        id: item.id,
        date: item.created_at.to_date.iso8601,
        createdAt: item.created_at.iso8601,
        type:,
        confirmationStatus: confirmation_status,
        status: display_status,
        amountCents: item.amount_cents,
        currency: item.currency.code,
        description: transaction_description(item),
        method: payment_method_key(item),
        recordedBy: item.created_by&.full_name,
        createdBy: item.created_by&.full_name,
        paymentId: item.transaction_payment? && item.pending? ? item.id : nil,
        refundPaymentId: item.transaction_payment? && item.confirmed? ? item.id : nil,
        refundableCents: refundable,
        originalPaymentCents: item.transaction_payment? ? item.amount_cents.to_i : nil
      }.with_indifferent_access
    end

    def charge_display_status(item)
      return 'reversed' if charge_reversed?(item)

      nil
    end

    def charge_reversed?(item)
      @charge_reversed_by_id ||= {}
      return @charge_reversed_by_id[item.id] if @charge_reversed_by_id.key?(item.id)

      @charge_reversed_by_id[item.id] = item.related_transactions.any? do |related|
        related.confirmed? && related.transaction_charge_reversal?
      end
    end

    def refundable_cents(item)
      return 0 if !item.transaction_payment? || !item.confirmed?

      Finance::FinanceHelper.remaining_refundable_cents(item)
    end

    def payment_method_key(item)
      return nil if !item.transaction_payment? || item.method.blank?

      item.method
    end

    def transaction_description(item)
      item.internal_note.presence || item.reference.presence || I18n.t(
        "app.payments.types.#{item.transaction_type}",
        default: item.transaction_type.to_s.humanize
      )
    end

    def total_paid_cents
      transactions_relation.confirmed.transaction_payment.sum(:amount_cents)
    end

    def pending_payments_count
      transactions_relation.pending.transaction_payment.count
    end

    def lesson_charge_count
      transactions_relation.confirmed.where(transaction_type: %i[lesson_charge cancellation_charge]).count
    end

    def lesson_charges_total_cents
      transactions_relation.confirmed
                             .where(transaction_type: %i[lesson_charge cancellation_charge])
                             .includes(:related_transactions)
                             .to_a
                             .reject { |item| charge_reversed?(item) }
                             .sum { |item| item.amount_cents.to_i.abs }
    end

    def opening_balance_set?
      transactions_relation.confirmed.transaction_opening_balance.exists?
    end

    def balance_health
      balance = balance_cents
      reference = reference_price_cents
      if balance.negative?
        'debt'
      elsif reference.positive? && balance < reference
        'low_balance'
      else
        'healthy'
      end
    end

    def ledger_counted?(row)
      row[:type].to_s != 'debt_allocation' && %w[pending rejected].exclude?(row[:confirmationStatus].to_s)
    end

    def build_ledger_entry(item, row, balance_after)
      type = row[:type].to_s
      lesson = item.lesson
      {
        **row,
        category: Finance::StudentLedgerCategories.category_for(type),
        typeLabel: I18n.t("app.payments.types.#{type}", default: type.humanize),
        headline: ledger_headline(item, row, lesson),
        subline: ledger_subline(item, lesson),
        internalNote: admin_internal_note(item, type),
        lessonId: item.lesson_id,
        reversed: charge_reversed?(item),
        balanceAfterCents: balance_after
      }.compact.with_indifferent_access
    end

    def ledger_headline(item, row, lesson)
      if (item.transaction_lesson_charge? || item.transaction_cancellation_charge?) && lesson.present?
        parts = [lesson.subject&.name]
        parts << I18n.t("app.common.#{lesson.location_online? ? 'online' : 'in_person'}")
        parts << ledger_lesson_date_label(lesson.starts_at.to_date)
        return parts.compact.join(' · ')
      end

      if item.transaction_payment? || item.transaction_opening_balance?
        method_label = payment_method_label(row[:method])
        return [I18n.t("app.payments.types.#{item.transaction_type}"), method_label].compact.join(' · ') if method_label.present?
      end

      row[:description]
    end

    def ledger_subline(item, lesson)
      parts = []
      if lesson.present? && (item.transaction_lesson_charge? || item.transaction_cancellation_charge?)
        attendance = lesson_attendance_label(lesson)
        parts << attendance if attendance.present?
      end
      if charge_reversed?(item)
        parts << I18n.t('app.payments.tx_status_reversed')
      end
      recorder = item.created_by&.full_name.presence || I18n.t('app.students.ledger_system')
      parts << I18n.t('app.students.ledger_by', name: recorder)
      parts.compact.join(' · ').presence
    end

    def admin_internal_note(item, type)
      return item.internal_note if item.internal_note.present?
      return item.reference if item.transaction_payment? && item.reference.present?
      if %w[lesson_charge cancellation_charge].include?(type.to_s)
        return I18n.t('app.students.ledger_lesson_auto_note')
      end

      nil
    end

    def payment_method_label(method_key)
      return nil if method_key.blank?

      I18n.t("app.payments.methods.#{method_key}", default: method_key.to_s.humanize)
    end

    def ledger_lesson_date_label(date)
      d = date.to_date
      month = I18n.t("app.calendar.months.#{Date::MONTHNAMES[d.month].downcase}")
      "#{month} #{d.day}"
    end

    def lesson_attendance_label(lesson)
      return if lesson.attendance.blank?

      key = if lesson.attendance_present?
              'attendance_attended'
            else
              "attendance_#{lesson.attendance}"
            end
      I18n.t("app.lessons.#{key}", default: lesson.attendance.humanize)
    end

    def reference_price_cents
      stored = student_profile.student_lesson_type_prices.minimum(:price_cents)
      return stored if stored.to_i.positive?

      student_profile.lessons.order(starts_at: :desc).first&.billed_price_cents.to_i
    end

    def reference_duration_minutes
      minutes = StudentLessonTypePrice.where(student_id: student_profile.id)
                                      .joins(:lesson_type)
                                      .pick('lesson_types.default_duration_minutes')
      minutes.presence || 60
    end

    def currency_code
      Finance::FinanceHelper::FINANCE_CURRENCY_CODE
    end
  end
end
