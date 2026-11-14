# frozen_string_literal: true

module Finance
  # Small shared helpers for money and workspace checks.
  module FinanceHelper
    FINANCE_CURRENCY_CODE = 'UAH'

    module_function

    def default_currency!
      currency = Currency.find_by(default: true)
      return currency if currency.present?

      raise ActiveRecord::RecordNotFound, 'Default currency is not configured'
    end

    def finance_currency!
      currency = Currency.find_by(code: FINANCE_CURRENCY_CODE)
      return currency if currency.present?

      ensure_uah_currency!
    end

    def ensure_uah_currency!
      Currency.where(default: true).where.not(code: FINANCE_CURRENCY_CODE).update_all(default: false)
      Currency.find_or_create_by!(code: FINANCE_CURRENCY_CODE) do |row|
        row.name = 'Ukrainian hryvnia'
        row.symbol = '₴'
        row.subunit_to_unit = 100
        row.active = true
        row[:default] = true
      end.tap do |row|
        row.update!(active: true, default: true) if !row.default? || !row.active?
      end
    end

    def currency_for_lesson(_lesson)
      finance_currency!
    end

    def student_balance_cents(student_profile)
      StudentTransaction.where(student_profile_id: student_profile.id, status: :confirmed)
                        .joins(:currency)
                        .where(currencies: { code: FINANCE_CURRENCY_CODE })
                        .sum(:amount_cents)
    end

    def teacher_earning_cents(lesson_price_cents, teacher_profile)
      percent = teacher_profile.compensation_rate || TeacherProfile::DEFAULT_COMPENSATION_PERCENT
      (lesson_price_cents.to_i * percent / 100.0).round
    end

    def refunded_cents_for_payment(payment)
      StudentTransaction.confirmed.transaction_refund
                        .where(related_transaction_id: payment.id)
                        .sum(:amount_cents).abs
    end

    def remaining_refundable_cents(payment)
      payment.amount_cents.to_i - refunded_cents_for_payment(payment)
    end

    def earning_left_cents(earning)
      earning.earning_cents.to_i - earning.teacher_payout_allocations.sum(:amount_cents)
    end

    def teacher_unpaid_cents(teacher_profile:, currency:)
      TeacherEarning.where(
        teacher_profile_id: teacher_profile.id,
        currency_id: currency.id,
        workspace_id: teacher_profile.workspace_id
      ).where(reversed_at: nil).sum do |earning|
        earning_left_cents(earning)
      end
    end

    def check_workspace!(workspace, *records)
      records.compact.each do |record|
        record_workspace_id = record.respond_to?(:workspace_id) ? record.workspace_id : nil
        next if record_workspace_id.blank?
        next if record_workspace_id == workspace.id

        raise Finance::WorkspaceMismatchError, 'Workspace mismatch'
      end
    end
  end

  class WorkspaceMismatchError < StandardError; end
  class UnsupportedCurrencyError < StandardError; end
end
