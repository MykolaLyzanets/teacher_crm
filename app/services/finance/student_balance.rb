# frozen_string_literal: true

module Finance
  class StudentBalance
    def initialize(student_profile:)
      @student_profile = student_profile
    end

    def balance_cents
      FinanceHelper.student_balance_cents(student_profile)
    end

    private

    attr_reader :student_profile
  end
end
