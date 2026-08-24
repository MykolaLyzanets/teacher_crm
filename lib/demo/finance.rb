# frozen_string_literal: true

module Demo
  module Finance
    module_function

    COUNTED_TYPES = %w[payment lesson_charge cancellation_charge refund adjustment].freeze

    def format_money(cents, currency = 'EUR')
      amount = (cents.to_i.abs / 100.0).round
      prefix = currency.to_s == 'EUR' ? '€' : "#{currency} "
      "#{prefix}#{amount}"
    end

    def format_signed_money(cents, currency = 'EUR')
      label = format_money(cents, currency)
      return "+#{label}" if cents.to_i.positive?
      return "−#{label}" if cents.to_i.negative?

      label
    end

    def student_transactions(student_id)
      Catalog.transactions.select { |item| item[:studentId].to_s == student_id.to_s }
                         .sort_by { |item| item[:date].to_s }
                         .reverse
    end

    def counted?(transaction)
      status = transaction[:confirmationStatus].to_s
      !%w[pending rejected].include?(status)
    end

    def balance_cents(student_id)
      student_transactions(student_id).sum { |item| counted?(item) ? item[:amountCents].to_i : 0 }
    end

    def available_balance_cents(student_id)
      [balance_cents(student_id), 0].max
    end

    def debt_cents(student_id)
      [-balance_cents(student_id), 0].max
    end

    def pending_payments(student_id)
      student_transactions(student_id).select do |item|
        item[:type].to_s == 'payment' && item[:confirmationStatus].to_s == 'pending'
      end
    end

    def pricing_for(student_id)
      Catalog.pricing.find { |item| item[:studentId].to_s == student_id.to_s }
    end

    def last_confirmed_payment(student_id)
      student_transactions(student_id).find do |item|
        item[:type].to_s == 'payment' && counted?(item)
      end
    end

    def portal_finance(student_id)
      student = Catalog.find_student(student_id)
      return nil if student.blank?

      pricing = pricing_for(student_id)
      currency = pricing&.dig(:currency).presence || 'EUR'
      price = pricing&.dig(:defaultPriceCents)
      available = available_balance_cents(student_id)
      debt = debt_cents(student_id)
      next_lesson = next_lesson_for_student(student)
      covered = if price.to_i.positive? && next_lesson
                  available >= price.to_i
                end

      {
        student: student,
        currency: currency,
        availableBalanceCents: available,
        debtCents: debt,
        lessonPriceCents: price,
        nextLessonCovered: covered,
        pendingPayments: pending_payments(student_id),
        lastConfirmedPayment: last_confirmed_payment(student_id),
        transactions: student_transactions(student_id).select { |item| counted?(item) || item[:confirmationStatus].to_s == 'pending' },
        teacher: student[:teacherId].present? ? Catalog.find_teacher(student[:teacherId]) : nil,
        totalPaidCents: student_transactions(student_id).sum { |item| counted?(item) && item[:type].to_s == 'payment' ? item[:amountCents].to_i : 0 },
        outstandingCents: debt,
        pendingPaymentsCount: pending_payments(student_id).size,
        lessonChargeCount: student_transactions(student_id).count { |item| counted?(item) && %w[lesson_charge cancellation_charge].include?(item[:type].to_s) }
      }.with_indifferent_access
    end

    def next_lesson_for_student(student)
      name = Catalog.student_name(student)
      Timeline.lessons
              .select { |lesson| lesson[:student].to_s == name && %w[confirmed pending].include?(lesson[:status].to_s) }
              .select { |lesson| lesson[:date].to_s >= Date.current.iso8601 }
              .min_by { |lesson| [lesson[:date].to_s, lesson[:startTime].to_s] }
    end

    def workspace_overview
      payments_received = Hash.new(0)
      lesson_revenue = Hash.new(0)
      outstanding_debt = Hash.new(0)
      teacher_earnings = Hash.new(0)
      teacher_payouts = Hash.new(0)
      school_profit = Hash.new(0)

      Catalog.transactions.each do |item|
        next unless counted?(item)

        currency = item[:currency].presence || 'EUR'
        if item[:type].to_s == 'payment'
          payments_received[currency] += item[:amountCents].to_i
        elsif %w[lesson_charge cancellation_charge].include?(item[:type].to_s)
          lesson_revenue[currency] += item[:amountCents].to_i.abs
        end
      end

      Catalog.active_students.each do |student|
        debt = debt_cents(student[:id])
        next unless debt.positive?

        currency = pricing_for(student[:id])&.dig(:currency).presence || 'EUR'
        outstanding_debt[currency] += debt
      end

      Catalog.earnings.each do |item|
        next if item[:reversedAt].present?

        currency = item[:currency].presence || 'EUR'
        teacher_earnings[currency] += item[:earningCents].to_i
        school_profit[currency] += item[:lessonPriceCents].to_i - item[:earningCents].to_i
      end

      Catalog.payouts.each do |item|
        currency = item[:currency].presence || 'EUR'
        teacher_payouts[currency] += item[:amountCents].to_i
      end

      {
        paymentsReceived: payments_received,
        lessonRevenue: lesson_revenue,
        outstandingDebt: outstanding_debt,
        teacherEarnings: teacher_earnings,
        teacherPayouts: teacher_payouts,
        schoolGrossProfit: school_profit
      }.with_indifferent_access
    end

    def grouped_money(totals)
      return '—' if totals.blank?

      totals.map { |currency, cents| format_money(cents, currency) }.join(' + ')
    end

    def student_balance_status(student_id)
      return 'payment_pending' if pending_payments(student_id).any?
      return 'debt' if debt_cents(student_id).positive?

      pricing = pricing_for(student_id)
      if pricing && available_balance_cents(student_id) < pricing[:defaultPriceCents].to_i
        return 'low_balance'
      end

      'healthy'
    end

    def teacher_payout_summary(teacher_id)
      entries = Catalog.earnings.select { |item| item[:teacherId].to_s == teacher_id.to_s && item[:reversedAt].blank? }
      paid = Catalog.payouts.select { |item| item[:teacherId].to_s == teacher_id.to_s }
      currency = entries.first&.dig(:currency).presence || paid.first&.dig(:currency).presence || 'EUR'
      total = entries.sum { |item| item[:earningCents].to_i }
      paid_cents = paid.sum { |item| item[:amountCents].to_i }
      minutes = entries.sum { |item| item[:lessonDurationMinutes].to_i }

      {
        totalEarningsCents: total,
        paidCents: paid_cents,
        remainingCents: [total - paid_cents, 0].max,
        completedLessons: entries.count { |item| item[:kind].to_s == 'lesson_completed' },
        chargedCancellations: entries.count { |item| item[:kind].to_s == 'cancellation_charged' },
        teachingHours: (minutes / 60.0).round(1),
        currency: currency
      }.with_indifferent_access
    end

    def transaction_label(type)
      I18n.t("app.payments.types.#{type}", default: type.to_s.humanize)
    end
  end
end
