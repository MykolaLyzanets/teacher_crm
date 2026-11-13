# frozen_string_literal: true

module Finance
  class PayTeacher
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    EarningSplit = Struct.new(:teacher_earning_id, :amount_cents, keyword_init: true)

    def initialize(workspace:, teacher_profile:, created_by:, amount_cents:, method:, paid_at:,
                   reference: nil, note: nil, earning_splits: nil, allocations: nil)
      @workspace = workspace
      @teacher_profile = teacher_profile
      @created_by = created_by
      @amount_cents = amount_cents.to_i
      @method = method
      @paid_at = paid_at
      @reference = reference
      @note = note
      @earning_splits = normalize_splits(earning_splits || allocations)
    end

    attr_reader :teacher_payout, :teacher_payout_allocations, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      validate_inputs
      return false if errors.any?

      currency = FinanceHelper.finance_currency!
      rows = build_allocation_rows(currency)

      ActiveRecord::Base.transaction do
        teacher_profile.lock!
        check_allocation_rows!(rows, currency)
        raise ActiveRecord::Rollback if errors.any?

        @teacher_payout = TeacherPayout.create!(
          workspace:,
          teacher_profile:,
          currency:,
          amount_cents:,
          method:,
          paid_at:,
          reference:,
          note:,
          created_by:
        )
        @teacher_payout_allocations = rows.map do |row|
          TeacherPayoutAllocation.create!(
            teacher_payout:,
            teacher_earning: row[:earning],
            amount_cents: row[:amount_cents]
          )
        end
      end

      return false if errors.any? || teacher_payout.nil?

      true
    rescue ActiveRecord::RecordInvalid => e
      errors.add(:base, e.message)
      false
    end

    def error_messages
      (errors.full_messages + Array(teacher_payout&.errors&.full_messages)).uniq
    end

    private

    attr_reader :workspace, :teacher_profile, :created_by, :amount_cents, :method,
                :paid_at, :reference, :note, :earning_splits

    def normalize_splits(items)
      return nil if items.nil?

      Array(items).map do |item|
        if item.is_a?(EarningSplit)
          item
        else
          EarningSplit.new(
            teacher_earning_id: item[:teacher_earning_id] || item['teacher_earning_id'],
            amount_cents: item[:amount_cents] || item['amount_cents']
          )
        end
      end
    end

    def validate_inputs
      errors.add(:amount_cents, 'must be positive') if amount_cents <= 0
      errors.add(:method, 'is required') if method.blank?
      errors.add(:paid_at, 'is required') if paid_at.blank?
      if teacher_profile.present? && workspace.present? && teacher_profile.workspace_id != workspace.id
        errors.add(:teacher_profile_id, 'must belong to the workspace')
      end
    end

    def build_allocation_rows(currency)
      if earning_splits.present?
        earning_splits.map do |item|
          earning = TeacherEarning.find(item.teacher_earning_id)
          FinanceHelper.check_workspace!(workspace, earning)
          if earning.currency.code != FinanceHelper::FINANCE_CURRENCY_CODE
            errors.add(:earning_splits, 'earning must be in UAH')
          end
          if earning.teacher_profile_id != teacher_profile.id || earning.currency_id != currency.id
            errors.add(:earning_splits, 'earning scope mismatch')
          end
          { earning:, amount_cents: item.amount_cents.to_i }
        end
      else
        split_earnings_fifo(currency)
      end
    end

    def split_earnings_fifo(currency)
      left = amount_cents
      rows = []
      open_earnings(currency).order(:created_at, :id).each do |earning|
        break if left <= 0

        available = FinanceHelper.earning_left_cents(earning)
        next if available <= 0

        part = [available, left].min
        rows << { earning:, amount_cents: part }
        left -= part
      end
      errors.add(:amount_cents, 'exceeds payable earnings') if left.positive?
      rows
    end

    def check_allocation_rows!(rows, currency)
      total = rows.sum { |row| row[:amount_cents] }
      errors.add(:earning_splits, 'must equal payout amount') if total != amount_cents

      rows.each do |row|
        if row[:amount_cents] <= 0
          errors.add(:earning_splits, 'must be positive')
          next
        end
        available = FinanceHelper.earning_left_cents(row[:earning])
        errors.add(:earning_splits, 'exceed available earning balance') if row[:amount_cents] > available
      end

      unpaid = FinanceHelper.teacher_unpaid_cents(teacher_profile:, currency:)
      errors.add(:amount_cents, 'exceeds payable balance') if amount_cents > unpaid
    end

    def open_earnings(currency)
      TeacherEarning.where(
        workspace_id: workspace.id,
        teacher_profile_id: teacher_profile.id,
        currency_id: currency.id
      ).where(reversed_at: nil)
    end
  end
end
