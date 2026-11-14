# frozen_string_literal: true

module Finance
  class TakeLessonPayment
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(lesson:, created_by:, price_cents: nil, charge_cents: nil)
      @lesson = lesson
      @created_by = created_by
      @price_cents = price_cents.nil? ? charge_cents : price_cents
    end

    attr_reader :lesson, :student_transactions, :teacher_earnings, :errors

    def save(use_transaction: true)
      @errors = ActiveModel::Errors.new(self)
      @student_transactions = []
      @teacher_earnings = []
      validate_lesson
      return false if errors.any?

      amount = lesson_price
      if amount <= 0
        load_existing_records
        return true
      end

      workspace = lesson.teacher_profile.workspace
      currency = FinanceHelper.currency_for_lesson(lesson)

      run_billing = lambda do
        lesson.lock!
        lesson.students.each do |student|
          bill_student!(workspace:, student:, currency:, amount:)
        end
      end

      if use_transaction
        ActiveRecord::Base.transaction { run_billing.call }
      else
        run_billing.call
      end
      true
    rescue ActiveRecord::RecordNotUnique
      load_existing_records
      true
    rescue ActiveRecord::RecordInvalid => e
      errors.merge!(e.record.errors)
      false
    rescue Finance::WorkspaceMismatchError, Finance::UnsupportedCurrencyError => e
      errors.add(:base, e.message)
      false
    rescue ActiveRecord::RecordNotFound
      errors.add(:base, I18n.t('app.lessons.finance_currency_not_configured'))
      false
    end

    def error_messages
      errors.full_messages.uniq
    end

    private

    attr_reader :created_by, :price_cents

    def validate_lesson
      errors.add(:base, I18n.t('app.lessons.finance_lesson_not_completed')) if !lesson.completed?
      errors.add(:base, I18n.t('app.lessons.finance_lesson_no_teacher')) if lesson.teacher_profile.blank?
      errors.add(:base, I18n.t('app.lessons.finance_actor_missing')) if created_by.blank?
    end

    def lesson_price
      return price_cents.to_i if !price_cents.nil?

      if lesson.charge_decision_charge?
        lesson.charged_cents.to_i.positive? ? lesson.charged_cents.to_i : lesson.billed_price_cents.to_i
      else
        0
      end
    end

    def bill_student!(workspace:, student:, currency:, amount:)
      FinanceHelper.check_workspace!(workspace, student)

      existing_tx = find_existing_charge(student)
      if existing_tx
        student_transactions << existing_tx
        existing_earning = find_existing_earning(student)
        teacher_earnings << existing_earning if existing_earning
        return
      end

      tx = StudentTransaction.create!(
        workspace:,
        student_profile: student,
        lesson:,
        currency:,
        transaction_type: :lesson_charge,
        amount_cents: -amount,
        status: :confirmed,
        created_by:,
        confirmed_by: created_by,
        confirmed_at: Time.current
      )
      student_transactions << tx

      teacher = lesson.teacher_profile
      earning_amount = FinanceHelper.teacher_earning_cents(amount, teacher)
      earning = TeacherEarning.create!(
        workspace:,
        teacher_profile: teacher,
        student_profile: student,
        lesson:,
        currency:,
        kind: :lesson_completed,
        lesson_price_cents: amount,
        earning_cents: earning_amount,
        compensation_percent: teacher.compensation_rate
      )
      teacher_earnings << earning
    end

    def find_existing_charge(student)
      StudentTransaction.confirmed
                        .transaction_lesson_charge
                        .find_by(lesson_id: lesson.id, student_profile_id: student.id)
    end

    def find_existing_earning(student)
      TeacherEarning.earning_lesson_completed
                    .where(lesson_id: lesson.id, student_profile_id: student.id, reversed_at: nil)
                    .first
    end

    def load_existing_records
      @student_transactions = StudentTransaction.confirmed
                                                .transaction_lesson_charge
                                                .where(lesson_id: lesson.id)
                                                .to_a
      @teacher_earnings = TeacherEarning.earning_lesson_completed
                                        .where(lesson_id: lesson.id, reversed_at: nil)
                                        .to_a
    end
  end
end
