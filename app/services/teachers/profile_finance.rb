# frozen_string_literal: true

module Teachers
  class ProfileFinance
    def initialize(teacher_profile:)
      @teacher_profile = teacher_profile
    end

    def call
      sections = currency_codes.map { |code| build_section(code) }
      {
        sections:,
        primary: sections.first || empty_section(default_currency_code)
      }.with_indifferent_access
    end

    private

    attr_reader :teacher_profile

    def workspace_id
      teacher_profile.workspace_id
    end

    def earnings_relation
      TeacherEarning.where(workspace_id:, teacher_profile_id: teacher_profile.id)
    end

    def earnings_for_list(currency_id:)
      earnings_relation.where(currency_id:)
    end

    def payouts_relation
      TeacherPayout.where(workspace_id:, teacher_profile_id: teacher_profile.id)
    end

    def payouts_for_list(currency_id:)
      payouts_relation.where(currency_id:)
    end

    def currency_codes
      [Finance::FinanceHelper::FINANCE_CURRENCY_CODE]
    end

    def build_section(currency_code)
      currency = Currency.find_by(code: currency_code)
      if currency.blank?
        return empty_section(currency_code)
      end

      active = earnings_relation.where(currency_id: currency.id, reversed_at: nil)
      payouts = payouts_relation.where(currency_id: currency.id)
      paid_cents = payouts.sum(:amount_cents)
      total = active.sum(:earning_cents)
      minutes = active.where.not(lesson_id: nil).joins(:lesson).sum('lessons.actual_duration_minutes')

      {
        currency: currency_code,
        summary: {
          totalEarningsCents: total,
          paidCents: paid_cents,
          remainingCents: Finance::FinanceHelper.teacher_unpaid_cents(teacher_profile:, currency:),
          completedLessons: active.earning_lesson_completed.count,
          chargedCancellations: active.earning_cancellation_charged.count,
          teachingHours: (minutes.to_i / 60.0).round(1),
          currency: currency_code
        }.with_indifferent_access,
        earnings: earning_rows(earnings_for_list(currency_id: currency.id), currency_code:),
        payouts: payout_rows(payouts_for_list(currency_id: currency.id), currency_code:)
      }.with_indifferent_access
    end

    def earning_rows(scope, currency_code:)
      records = scope.order(created_at: :desc, id: :desc).includes(:student_profile).to_a
      lesson_titles = lesson_subject_names_by_id(records.map(&:lesson_id))
      records.map do |item|
        {
          id: item.id,
          date: item.created_at.to_date.iso8601,
          student: item.student_profile.display_label,
          lessonTitle: lesson_titles[item.lesson_id],
          kind: item.kind,
          lessonPriceCents: item.lesson_price_cents,
          earningCents: item.earning_cents,
          compensationPercent: item.compensation_percent&.to_i,
          reversed: item.reversed_at.present?,
          currency: currency_code
        }.with_indifferent_access
      end
    end

    def payout_rows(scope, currency_code:)
      records = scope.order(paid_at: :desc, id: :desc).to_a
      allocations_by_payout_id = payout_allocations_by_payout_id(records.map(&:id))
      records.map do |item|
        {
          id: item.id,
          date: item.paid_at.to_date.iso8601,
          paidAt: item.paid_at.iso8601,
          amountCents: item.amount_cents,
          currency: currency_code,
          method: item.method,
          reference: item.reference,
          note: item.note,
          allocations: allocation_rows(allocations_by_payout_id[item.id])
        }.with_indifferent_access
      end
    end

    def allocation_rows(allocations)
      Array(allocations).map do |row|
        earning = row.teacher_earning
        {
          earningId: earning.id,
          amountCents: row.amount_cents,
          earningDate: earning.created_at.to_date.iso8601,
          student: earning.student_profile.display_label,
          kind: earning.kind
        }.with_indifferent_access
      end
    end

    def lesson_subject_names_by_id(lesson_ids)
      ids = lesson_ids.compact.uniq
      return {} if ids.empty?

      Lesson.where(id: ids).left_joins(:subject).pluck('lessons.id', 'subjects.name').to_h
    end

    def payout_allocations_by_payout_id(payout_ids)
      return {} if payout_ids.empty?

      TeacherPayoutAllocation
        .where(teacher_payout_id: payout_ids)
        .includes(teacher_earning: :student_profile)
        .order(:id)
        .group_by(&:teacher_payout_id)
    end

    def default_currency_code
      Finance::FinanceHelper::FINANCE_CURRENCY_CODE
    end

    def empty_section(currency_code)
      {
        currency: currency_code,
        summary: {
          totalEarningsCents: 0,
          paidCents: 0,
          remainingCents: 0,
          completedLessons: 0,
          chargedCancellations: 0,
          teachingHours: 0,
          currency: currency_code
        }.with_indifferent_access,
        earnings: [],
        payouts: []
      }.with_indifferent_access
    end
  end
end
