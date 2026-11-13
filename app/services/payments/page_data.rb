# frozen_string_literal: true

module Payments
  class PageData
    def initialize(workspace:, students:, teachers:)
      @workspace = workspace
      @students = students
      @teachers = teachers
    end

    def overview
      payments_received = Hash.new(0)
      lesson_revenue = Hash.new(0)
      outstanding_debt = Hash.new(0)
      teacher_earnings = Hash.new(0)
      teacher_payouts_totals = Hash.new(0)
      school_profit = Hash.new(0)

      student_transactions_scope.confirmed.find_each do |item|
        code = item.currency.code
        if item.transaction_payment?
          payments_received[code] += item.amount_cents.to_i
        elsif item.transaction_lesson_charge? || item.transaction_cancellation_charge?
          lesson_revenue[code] += item.amount_cents.to_i.abs
        end
      end

      students.find_each do |student|
        balance = Finance::StudentBalance.new(student_profile: student).balance_cents
        debt = [-balance, 0].max
        next if debt <= 0

        code = default_currency_code_for(student)
        outstanding_debt[code] += debt
      end

      teacher_earnings_scope.where(reversed_at: nil).find_each do |item|
        code = item.currency.code
        teacher_earnings[code] += item.earning_cents.to_i
        school_profit[code] += item.lesson_price_cents.to_i - item.earning_cents.to_i
      end

      teacher_payouts_scope.find_each do |item|
        teacher_payouts_totals[item.currency.code] += item.amount_cents.to_i
      end

      {
        paymentsReceived: payments_received,
        lessonRevenue: lesson_revenue,
        outstandingDebt: outstanding_debt,
        teacherEarnings: teacher_earnings,
        teacherPayouts: teacher_payouts_totals,
        schoolGrossProfit: school_profit
      }.with_indifferent_access
    end

    def balance_rows
      rows = students.map do |student|
        balance_cents = Finance::StudentBalance.new(student_profile: student).balance_cents
        price = reference_price_cents(student)
        currency = default_currency_code_for(student)
        upcoming = upcoming_lessons_for(student)
        upcoming_count = upcoming.size
        covered = if price.positive? && balance_cents.positive?
                    [upcoming_count, balance_cents / price].min
                  else
                    0
                  end
        {
          student: student,
          catalogId: student.id,
          profileId: student.id,
          name: student.display_label,
          teacher: student.teacher_profile&.display_label || I18n.t('app.common.unassigned'),
          balanceCents: balance_cents,
          outstandingCents: [-balance_cents, 0].max,
          currency: currency,
          referencePriceCents: price.positive? ? price : nil,
          lessonsCovered: covered,
          upcomingCount: upcoming_count,
          nextLessonDate: upcoming.first&.starts_at&.to_date&.iso8601,
          pendingCount: pending_payments_count(student),
          healthStatus: balance_health_status(student, balance_cents, price),
          status: balance_status(student, balance_cents, price)
        }.with_indifferent_access
      end
      rows.sort_by { |row| row[:balanceCents].to_i }
    end

    def payout_rows
      teachers.map do |teacher|
        summary = teacher_payout_summary(teacher)
        {
          teacher: teacher,
          catalogId: teacher.id,
          profileId: teacher.id,
          name: teacher.display_label,
          summary: summary
        }.with_indifferent_access
      end
    end

    def transaction_rows
      rows = []
      student_transactions_scope.in_batches(of: 500) do |batch|
        batch.includes(:student_profile).each { |item| rows << student_transaction_row(item) }
      end
      teacher_earnings_scope.in_batches(of: 500) do |batch|
        batch.includes(:teacher_profile).each { |item| rows << teacher_earning_row(item) }
      end
      teacher_payouts_scope.in_batches(of: 500) do |batch|
        batch.includes(:teacher_profile).each { |item| rows << teacher_payout_row(item) }
      end
      rows.sort_by { |item| [item[:createdAt].to_s, item[:id].to_s] }.reverse
    end

    def currencies
      [Finance::FinanceHelper::FINANCE_CURRENCY_CODE]
    end

    def student_filter_options
      students.unscope(:includes).order(:first_name, :last_name).map do |student|
        { id: student.id, name: student.display_label }.with_indifferent_access
      end
    end

    private

    attr_reader :workspace, :students, :teachers

    def workspace_id
      workspace&.id
    end

    def student_transactions_scope
      scope = StudentTransaction.all
      scope = scope.where(workspace_id: workspace_id) if workspace_id.present?
      scope
    end

    def teacher_earnings_scope
      scope = TeacherEarning.all
      scope = scope.where(workspace_id: workspace_id) if workspace_id.present?
      scope
    end

    def teacher_payouts_scope
      scope = TeacherPayout.all
      scope = scope.where(workspace_id: workspace_id) if workspace_id.present?
      scope
    end

    def student_transaction_row(item)
      status = transaction_status(item)
      refundable = refundable_cents_for_payment(item)
      {
        id: item.id,
        date: item.created_at.to_date.iso8601,
        createdAt: item.created_at.iso8601,
        kind: item.transaction_type,
        studentId: item.student_profile_id,
        party: item.student_profile.display_label,
        description: transaction_description(item),
        amountCents: item.amount_cents,
        currency: finance_currency_code,
        status: status,
        paymentId: item.transaction_payment? && item.pending? ? item.id : nil,
        refundPaymentId: item.transaction_payment? && item.confirmed? ? item.id : nil,
        refundableCents: refundable,
        originalPaymentCents: item.transaction_payment? ? item.amount_cents.to_i : nil
      }.with_indifferent_access
    end

    def refundable_cents_for_payment(item)
      return 0 if !item.transaction_payment? || !item.confirmed?

      Finance::FinanceHelper.remaining_refundable_cents(item)
    end

    def transaction_status(item)
      return item.status if item.transaction_payment?
      return 'reversed' if item.related_transactions.confirmed.transaction_charge_reversal.exists?

      nil
    end

    def transaction_description(item)
      item.internal_note.presence || item.reference.presence || I18n.t(
        "app.payments.types.#{item.transaction_type}",
        default: item.transaction_type.to_s.humanize
      )
    end

    def teacher_earning_row(item)
      {
        id: "earning-#{item.id}",
        date: item.created_at.to_date.iso8601,
        createdAt: item.created_at.iso8601,
        kind: 'teacher_earning',
        studentId: item.student_profile_id,
        party: item.teacher_profile.display_label,
        description: item.earning_cancellation_charged? ? 'Charged cancellation' : 'Lesson completed',
        amountCents: item.earning_cents,
        currency: finance_currency_code,
        status: item.reversed_at.present? ? 'reversed' : nil
      }.with_indifferent_access
    end

    def teacher_payout_row(item)
      {
        id: "payout-#{item.id}",
        date: item.paid_at.to_date.iso8601,
        createdAt: item.paid_at.iso8601,
        kind: 'teacher_payout',
        studentId: nil,
        party: item.teacher_profile.display_label,
        description: item.note.presence || 'Teacher payout',
        amountCents: -item.amount_cents.to_i,
        currency: finance_currency_code,
        status: nil
      }.with_indifferent_access
    end

    def finance_currency_code
      Finance::FinanceHelper::FINANCE_CURRENCY_CODE
    end

    def pending_payments_count(student)
      student_transactions_scope.pending.transaction_payment.where(student_profile_id: student.id).count
    end

    def balance_status(student, balance_cents, price)
      return 'payment_pending' if pending_payments_count(student).positive?

      balance_health_status(student, balance_cents, price)
    end

    def balance_health_status(_student, balance_cents, price)
      return 'debt' if balance_cents.negative?
      return 'low_balance' if price.positive? && balance_cents < price

      'healthy'
    end

    def reference_price_cents(student)
      student.lessons.order(starts_at: :desc).first&.billed_price_cents.to_i
    end

    def default_currency_code_for(_student)
      Finance::FinanceHelper::FINANCE_CURRENCY_CODE
    end

    def upcoming_lessons_for(student)
      Lesson.confirmed
            .joins(:students)
            .where(student_profiles: { id: student.id })
            .where('lessons.starts_at >= ?', Time.current)
            .order(:starts_at)
            .limit(10)
    end

    def teacher_payout_summary(teacher)
      currency = Finance::FinanceHelper.finance_currency!
      earnings = teacher_earnings_scope.where(teacher_profile_id: teacher.id, currency_id: currency.id, reversed_at: nil)
      paid = teacher_payouts_scope.where(teacher_profile_id: teacher.id, currency_id: currency.id)
      total = earnings.sum(:earning_cents)
      paid_cents = paid.sum(:amount_cents)
      minutes = earnings.where.not(lesson_id: nil).joins(:lesson).sum('lessons.actual_duration_minutes')

      {
        totalEarningsCents: total,
        paidCents: paid_cents,
        remainingCents: Finance::FinanceHelper.teacher_unpaid_cents(teacher_profile: teacher, currency:),
        completedLessons: earnings.earning_lesson_completed.count,
        chargedCancellations: earnings.earning_cancellation_charged.count,
        teachingHours: (minutes.to_i / 60.0).round(1),
        currency: currency.code
      }.with_indifferent_access
    rescue ActiveRecord::RecordNotFound
      {
        totalEarningsCents: 0,
        paidCents: 0,
        remainingCents: 0,
        completedLessons: 0,
        chargedCancellations: 0,
        teachingHours: 0,
        currency: 'UAH'
      }.with_indifferent_access
    end
  end
end
