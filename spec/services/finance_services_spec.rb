# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Finance services' do
  def ensure_default_currency!
    Currency.where(default: true).where.not(code: 'UAH').update_all(default: false)
    Currency.find_or_create_by!(code: 'UAH') do |currency|
      currency.name = 'Ukrainian hryvnia'
      currency.symbol = '₴'
      currency.subunit_to_unit = 100
      currency.active = true
      currency[:default] = true
    end
  end

  def completed_lesson(price_cents: 3000)
    lesson = create(:lesson, price_cents:)
    lesson.update!(
      status: :completed,
      attendance: :present,
      actual_duration_minutes: 60,
      charge_decision: :charge,
      charged_cents: price_cents
    )
    lesson
  end

  def cancelled_lesson(price_cents: 3000)
    lesson = create(:lesson, price_cents:)
    lesson.update!(
      status: :cancelled,
      charge_decision: :charge,
      charged_cents: price_cents
    )
    lesson
  end

  let(:workspace) { create(:workspace) }
  let(:actor) { workspace.owner }
  let(:student) { create(:student_profile, workspace:) }

  before { ensure_default_currency! }

  describe Finance::AddStudentPayment do
    it 'creates pending payment without affecting balance' do
      service = described_class.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: 5000,
        method: :bank_transfer
      )
      expect(service.save).to be(true)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(0)
    end

    it 'creates confirmed payment and updates balance' do
      service = described_class.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: 5000,
        method: :cash,
        confirm: true
      )
      expect(service.save).to be(true)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(5000)
    end
  end

  describe Finance::ConfirmPayment do
    it 'confirms pending payment' do
      pending = Finance::AddStudentPayment.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: 4000,
        method: :card
      )
      pending.save
      expect(Finance::ConfirmPayment.new(payment: pending.student_transaction, confirmed_by: actor).save).to be(true)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(4000)
    end
  end

  describe Finance::RejectPayment do
    it 'rejects pending payment without balance impact' do
      pending = Finance::AddStudentPayment.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: 4000,
        method: :card
      )
      pending.save
      expect(Finance::RejectPayment.new(payment: pending.student_transaction).save).to be(true)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(0)
    end
  end

  describe Finance::TakeLessonPayment do
    it 'charges students and creates teacher earnings' do
      lesson = completed_lesson(price_cents: 3000)
      lesson.teacher_profile.update!(compensation_percent: 50)
      service = Finance::TakeLessonPayment.new(lesson:, created_by: actor)
      expect(service.save).to be(true)
      expect(service.student_transactions.size).to eq(1)
      expect(service.student_transactions.first.amount_cents).to eq(-3000)
      expect(service.teacher_earnings.first.earning_cents).to eq(1500)
      expect(Finance::StudentBalance.new(student_profile: lesson.students.first).balance_cents).to eq(-3000)
    end

    it 'is idempotent on duplicate processing' do
      lesson = completed_lesson(price_cents: 3000)
      first = Finance::TakeLessonPayment.new(lesson:, created_by: actor)
      second = Finance::TakeLessonPayment.new(lesson:, created_by: actor)
      first.save
      expect(second.save).to be(true)
      expect(StudentTransaction.transaction_lesson_charge.where(lesson_id: lesson.id).count).to eq(1)
      expect(TeacherEarning.where(lesson_id: lesson.id).count).to eq(1)
    end
  end

  describe Finance::TakeCancellationPayment do
    it 'charges cancelled lessons with optional teacher earning' do
      lesson = cancelled_lesson(price_cents: 2000)
      service = Finance::TakeCancellationPayment.new(lesson:, created_by: actor)
      expect(service.save).to be(true)
      expect(service.teacher_earnings.first.kind).to eq('cancellation_charged')
    end
  end

  describe Finance::ChangeStudentBalance do
    it 'requires a reason' do
      service = Finance::ChangeStudentBalance.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: -500,
        reason: ''
      )
      expect(service.save).to be(false)
    end

    it 'applies credit and debit adjustments' do
      Finance::ChangeStudentBalance.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: 1000,
        reason: 'Credit for promo'
      ).save
      Finance::ChangeStudentBalance.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: -300,
        reason: 'Correction'
      ).save
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(700)
    end
  end

  describe Finance::RefundPayment do
    it 'supports partial and full refunds' do
      payment_service = Finance::AddStudentPayment.new(
        workspace:,
        student_profile: student,
        created_by: actor,
        amount_cents: 10_000,
        method: :bank_transfer,
        confirm: true
      )
      payment_service.save
      payment = payment_service.student_transaction

      expect(
        Finance::RefundPayment.new(payment:, created_by: actor, amount_cents: 3000).save
      ).to be(true)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(7000)

      expect(
        Finance::RefundPayment.new(payment:, created_by: actor, amount_cents: 8000).save
      ).to be(false)

      expect(
        Finance::RefundPayment.new(payment:, created_by: actor, amount_cents: 7000).save
      ).to be(true)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(0)
    end
  end

  describe Finance::UndoTransaction do
    it 'reverses lesson charge and marks earning reversed' do
      lesson = completed_lesson(price_cents: 2500)
      Finance::TakeLessonPayment.new(lesson:, created_by: actor).save
      charge = StudentTransaction.transaction_lesson_charge.find_by!(lesson_id: lesson.id)

      expect(Finance::UndoTransaction.new(transaction: charge, created_by: actor).save).to be(true)
      student = lesson.students.first
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(0)
      expect(TeacherEarning.find_by(lesson_id: lesson.id).reversed_at).to be_present
    end
  end

  describe Finance::PayTeacher do
    it 'records payout with fifo allocations' do
      lesson = completed_lesson(price_cents: 4000)
      lesson.teacher_profile.update!(compensation_percent: 50)
      Finance::TakeLessonPayment.new(lesson:, created_by: actor).save
      teacher_profile = lesson.teacher_profile
      ws = teacher_profile.workspace

      service = Finance::PayTeacher.new(
        workspace: ws,
        teacher_profile:,
        created_by: actor,
        amount_cents: 1000,
        method: :cash,
        paid_at: Time.current
      )
      expect(service.save).to be(true)
      expect(service.teacher_payout_allocations.sum(&:amount_cents)).to eq(1000)
    end

    it 'refuses payouts above payable balance' do
      lesson = completed_lesson(price_cents: 1000)
      lesson.teacher_profile.update!(compensation_percent: 50)
      Finance::TakeLessonPayment.new(lesson:, created_by: actor).save
      teacher_profile = lesson.teacher_profile

      service = Finance::PayTeacher.new(
        workspace: teacher_profile.workspace,
        teacher_profile:,
        created_by: actor,
        amount_cents: 10_000,
        method: :cash,
        paid_at: Time.current
      )
      expect(service.save).to be(false)
    end

    it 'rolls back when an allocation exceeds available earning' do
      lesson = completed_lesson(price_cents: 2000)
      lesson.teacher_profile.update!(compensation_percent: 50)
      Finance::TakeLessonPayment.new(lesson:, created_by: actor).save
      earning = TeacherEarning.find_by!(lesson_id: lesson.id)

      service = Finance::PayTeacher.new(
        workspace: lesson.teacher_profile.workspace,
        teacher_profile: lesson.teacher_profile,
        created_by: actor,
        amount_cents: 1000,
        method: :cash,
        paid_at: Time.current,
        allocations: [{ teacher_earning_id: earning.id, amount_cents: 2000 }]
      )
      expect(service.save).to be(false)
      expect(TeacherPayout.count).to eq(0)
    end
  end
end
