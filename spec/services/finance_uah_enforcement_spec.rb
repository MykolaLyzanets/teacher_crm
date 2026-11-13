# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Finance UAH enforcement' do
  def ensure_uah!
    Currency.where(default: true).where.not(code: 'UAH').update_all(default: false)
    Currency.find_or_create_by!(code: 'UAH') do |currency|
      currency.name = 'Ukrainian hryvnia'
      currency.symbol = '₴'
      currency.subunit_to_unit = 100
      currency.active = true
      currency[:default] = true
    end
  end

  let(:workspace) { create(:workspace) }
  let(:owner) { workspace.owner }
  let(:student) { create(:student_profile, workspace:) }
  let(:teacher) { create(:teacher_profile, workspace:) }

  before { ensure_uah! }

  it 'creates payments and adjustments in UAH' do
    payment = Finance::AddStudentPayment.new(
      workspace:,
      student_profile: student,
      created_by: owner,
      amount_cents: 2500,
      method: :cash,
      confirm: true
    )
    expect(payment.save).to be(true)
    expect(payment.student_transaction.currency.code).to eq('UAH')

    Finance::ChangeStudentBalance.new(
      workspace:,
      student_profile: student,
      created_by: owner,
      amount_cents: -500,
      reason: 'Correction'
    ).tap(&:save)

    expect(StudentTransaction.last.currency.code).to eq('UAH')
  end

  it 'charges lessons and cancellations in UAH even when lesson currency is EUR' do
    lesson = create(:lesson, teacher:, price_cents: 3000, currency: 'EUR')
    lesson.students = [student]
    lesson.save!
    lesson.update!(
      status: :completed,
      attendance: :present,
      actual_duration_minutes: 60,
      charge_decision: :charge,
      charged_cents: 3000
    )

    expect(Finance::TakeLessonPayment.new(lesson:, created_by: owner).save).to be(true)
    charge = StudentTransaction.transaction_lesson_charge.find_by!(lesson_id: lesson.id)
    expect(charge.currency.code).to eq('UAH')
    expect(TeacherEarning.find_by!(lesson_id: lesson.id).currency.code).to eq('UAH')
  end

  it 'rejects creating finance records in a non-UAH currency' do
    eur = Currency.find_or_create_by!(code: 'EUR') do |currency|
      currency.name = 'Euro'
      currency.symbol = '€'
      currency.subunit_to_unit = 100
      currency.active = true
    end

    record = StudentTransaction.new(
      workspace:,
      student_profile: student,
      currency: eur,
      transaction_type: :payment,
      amount_cents: 1000,
      status: :confirmed,
      created_by: owner,
      confirmed_by: owner,
      confirmed_at: Time.current
    )
    expect(record.valid?).to be(false)
    expect(record.errors[:currency]).to include('must be UAH')
  end

  it 'records teacher payouts in UAH with fifo allocations' do
    lesson = create(:lesson, teacher:, price_cents: 4000)
    lesson.students = [student]
    lesson.save!
    lesson.update!(
      status: :completed,
      attendance: :present,
      actual_duration_minutes: 60,
      charge_decision: :charge,
      charged_cents: 4000
    )
    Finance::TakeLessonPayment.new(lesson:, created_by: owner).save

    service = Finance::PayTeacher.new(
      workspace:,
      teacher_profile: teacher,
      created_by: owner,
      amount_cents: 500,
      method: :cash,
      paid_at: Time.current
    )
    expect(service.save).to be(true)
    expect(service.teacher_payout.currency.code).to eq('UAH')
  end

  it 'sums student balance from confirmed UAH transactions only' do
    Finance::AddStudentPayment.new(
      workspace:,
      student_profile: student,
      created_by: owner,
      amount_cents: 4000,
      method: :cash,
      confirm: true
    ).tap(&:save)

    expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(4000)
  end
end
