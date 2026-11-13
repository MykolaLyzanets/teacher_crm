# frozen_string_literal: true

module Finance
  class AddStudentPayment
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(workspace:, student_profile:, created_by:, amount_cents:, method:, reference: nil,
                   internal_note: nil, confirm: false, confirmed_by: nil)
      @workspace = workspace
      @student_profile = student_profile
      @created_by = created_by
      @amount_cents = amount_cents.to_i
      @method = method
      @reference = reference
      @internal_note = internal_note
      @confirm = confirm
      @confirmed_by = confirmed_by || created_by
    end

    attr_reader :student_transaction, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      validate_inputs
      return false if errors.any?

      @student_transaction = build_transaction
      return true if student_transaction.save

      errors.merge!(student_transaction.errors)
      false
    end

    def error_messages
      (errors.full_messages + Array(student_transaction&.errors&.full_messages)).uniq
    end

    private

    attr_reader :workspace, :student_profile, :created_by, :amount_cents, :method, :reference,
                :internal_note, :confirm, :confirmed_by

    def validate_inputs
      errors.add(:amount_cents, 'must be positive') if amount_cents <= 0
      errors.add(:method, 'is required') if method.blank?
      if student_profile.present? && workspace.present? && student_profile.workspace_id != workspace.id
        errors.add(:student_profile_id, 'must belong to the workspace')
      end
    end

    def build_transaction
      currency = FinanceHelper.finance_currency!
      status = confirm ? :confirmed : :pending
      attrs = {
        workspace:,
        student_profile:,
        currency:,
        transaction_type: :payment,
        amount_cents:,
        status:,
        method:,
        reference:,
        internal_note:,
        created_by:
      }
      if confirm
        attrs[:confirmed_by] = confirmed_by
        attrs[:confirmed_at] = Time.current
      end
      StudentTransaction.new(attrs)
    end
  end
end
