# frozen_string_literal: true

module Dashboard
  class FinanceData
    include FinanceHelper

    def initialize(workspace:, students:, teachers:)
      @workspace = workspace
      @students = students
      @teachers = teachers
      @page_data = Payments::PageData.new(workspace:, students:, teachers:)
    end

    def apply(dashboard)
      return dashboard if workspace.blank?

      payload = build
      attention = Array(dashboard[:needsAttention]) + payload[:attention_items]

      dashboard.merge(
        payments: payload[:payments],
        pendingCount: payload[:pending_count],
        payoutsRemaining: payload[:payouts_remaining],
        needsAttention: attention,
        summary: dashboard[:summary].merge(needsAttentionCount: attention.size)
      ).with_indifferent_access
    end

    def build
      overview = page_data.overview
      {
        payments: overview.slice(
          :paymentsReceived, :lessonRevenue, :outstandingDebt,
          :teacherEarnings, :teacherPayouts, :schoolGrossProfit
        ),
        pending_count:,
        pending_amount_by_currency:,
        payouts_remaining: payouts_remaining(overview),
        attention_items: finance_attention_items
      }.with_indifferent_access
    end

    private

    attr_reader :workspace, :students, :teachers, :page_data

    def payouts_remaining(overview)
      totals = Hash.new(0)
      overview[:teacherEarnings].each { |code, cents| totals[code] += cents.to_i }
      overview[:teacherPayouts].each { |code, cents| totals[code] -= cents.to_i }
      totals
    end

    def pending_count
      student_transactions_scope.pending.transaction_payment.count
    end

    def pending_amount_by_currency
      totals = Hash.new(0)
      student_transactions_scope.pending.transaction_payment.includes(:currency).find_each do |item|
        totals[item.currency.code] += item.amount_cents.to_i
      end
      totals
    end

    def finance_attention_items
      student_attention_items + pending_payment_items + payout_attention_items
    end

    def student_attention_items
      page_data.balance_rows.filter_map do |row|
        name = row[:name]
        student_id = row[:profileId]
        currency = row[:currency]
        case row[:healthStatus].to_s
        when 'debt'
          debt_cents = row[:outstandingCents].to_i
          debt_attention_item(student_id:, name:, debt_cents:, currency:)
        when 'low_balance'
          low_balance_attention_item(student_id:, name:)
        end
      end
    end

    def debt_attention_item(student_id:, name:, debt_cents:, currency:)
      {
        id: "debt-#{student_id}",
        category: 'students',
        kind: 'student_debt',
        title: "#{name} has outstanding debt",
        subtitle: money_label(debt_cents, currency),
        dateLabel: Date.current.iso8601,
        badge: 'Debt',
        action: 'View student balance',
        studentId: student_id
      }
    end

    def low_balance_attention_item(student_id:, name:)
      {
        id: "low-#{student_id}",
        category: 'students',
        kind: 'low_balance',
        title: "#{name} may not cover the next lesson",
        subtitle: name,
        dateLabel: Date.current.iso8601,
        badge: 'Low balance',
        action: 'View student balance',
        studentId: student_id
      }
    end

    def pending_payment_items
      student_transactions_scope.pending.transaction_payment
                                .includes(:student_profile, :currency)
                                .order(:created_at)
                                .map do |item|
        {
          id: "pay-#{item.id}",
          category: 'payments',
          kind: 'pending_payment',
          title: 'Payment awaiting confirmation',
          subtitle: "#{item.student_profile.display_label} · #{money_label(item.amount_cents, item.currency.code)}",
          dateLabel: item.created_at.to_date.iso8601,
          badge: 'Pending',
          action: 'Confirm',
          transactionId: item.id,
          studentId: item.student_profile_id
        }
      end
    end

    def payout_attention_items
      items = []
      teachers.find_each do |teacher|
        currency_ids = teacher_earnings_scope.where(teacher_profile_id: teacher.id, reversed_at: nil)
                                             .distinct
                                             .pluck(:currency_id)
        currency_ids.each do |currency_id|
          currency = Currency.find(currency_id)
          remaining = Finance::FinanceHelper.teacher_unpaid_cents(teacher_profile: teacher, currency:)
          next if remaining <= 0

          items << {
            id: "payout-#{teacher.id}-#{currency.code}",
            category: 'teachers',
            kind: 'payout_due',
            title: "Payout remaining for #{teacher.display_label}",
            subtitle: teacher.display_label,
            dateLabel: Date.current.iso8601,
            badge: 'Payout due',
            action: 'Record payout',
            teacherId: teacher.id,
            remainingCents: remaining,
            currency: currency.code
          }
        end
      end
      items
    end

    def student_transactions_scope
      StudentTransaction.where(workspace_id: workspace.id)
    end

    def teacher_earnings_scope
      TeacherEarning.where(workspace_id: workspace.id)
    end
  end
end
