# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Dashboard::FinanceData do
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

  def create_payment(student:, amount_cents:, confirm: true)
    Finance::AddStudentPayment.new(
      workspace: student.workspace,
      student_profile: student,
      created_by: student.workspace.owner,
      amount_cents:,
      method: :cash,
      confirm:
    ).tap(&:save).student_transaction
  end

  def completed_lesson(teacher:, student:, price_cents: 4000)
    lesson = create(:lesson, teacher:, price_cents:)
    lesson.students = [student]
    lesson.save!
    lesson.update!(
      status: :completed,
      attendance: :present,
      actual_duration_minutes: 60,
      charge_decision: :charge,
      charged_cents: price_cents
    )
    Finance::TakeLessonPayment.new(lesson:, created_by: teacher.workspace.owner).save
    lesson
  end

  let(:workspace) { create(:workspace) }
  let(:owner) { workspace.owner }
  let(:teacher) { create(:teacher_profile, workspace:, compensation_percent: 50) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }
  let(:students) { StudentProfile.where(workspace_id: workspace.id) }
  let(:teachers) { TeacherProfile.where(workspace_id: workspace.id) }
  let(:service) { described_class.new(workspace:, students:, teachers:) }
  let(:page_data) { Payments::PageData.new(workspace:, students:, teachers:) }

  before { ensure_uah! }

  it 'reuses Payments::PageData overview for payment totals' do
    create_payment(student:, amount_cents: 7000)
    payload = service.build

    expect(payload[:payments]).to eq(
      page_data.overview.slice(
        :paymentsReceived, :lessonRevenue, :outstandingDebt,
        :teacherEarnings, :teacherPayouts, :schoolGrossProfit
      )
    )
    expect(payload[:payments][:paymentsReceived]['UAH']).to eq(7000)
  end

  it 'counts pending payments from StudentTransaction.pending' do
    create_payment(student:, amount_cents: 1500, confirm: false)
    create_payment(student:, amount_cents: 2500, confirm: false)

    payload = service.build
    expect(payload[:pending_count]).to eq(2)
    expect(payload[:pending_amount_by_currency]['UAH']).to eq(4000)
  end

  it 'builds student debt attention from confirmed balances' do
    Finance::ChangeStudentBalance.new(
      workspace:,
      student_profile: student,
      created_by: owner,
      amount_cents: -3500,
      reason: 'Back fees'
    ).tap(&:save)

    debt_items = service.build[:attention_items].select { |item| item[:kind] == 'student_debt' }
    expect(debt_items.size).to eq(1)
    expect(debt_items.first[:studentId]).to eq(student.id)
    expect(debt_items.first[:title]).to include(student.display_label)
  end

  it 'flags payout due using Finance unpaid calculations' do
    completed_lesson(teacher:, student:, price_cents: 3000)
    remaining = Finance::FinanceHelper.teacher_unpaid_cents(
      teacher_profile: teacher,
      currency: Currency.find_by!(code: 'UAH')
    )
    expect(remaining).to be_positive

    payout_items = service.build[:attention_items].select { |item| item[:kind] == 'payout_due' }
    expect(payout_items.first[:teacherId]).to eq(teacher.id)
    expect(payout_items.first[:remainingCents]).to eq(remaining)
  end

  it 'stores payouts remaining in UAH' do
    completed_lesson(teacher:, student:)

    remaining = service.build[:payouts_remaining]
    expect(remaining['UAH']).to be_positive
    expect(remaining.keys).to eq(['UAH'])
  end

  it 'merges finance attention onto lesson-only dashboard data' do
    demo_dashboard = Demo::Dashboards.admin(lessons: [], now: Time.zone.now)
    lesson_item = {
      id: 'outcome-1',
      category: 'lessons',
      kind: 'outcome_required',
      title: 'Lesson needs outcome',
      subtitle: 'x',
      dateLabel: Date.current.iso8601,
      badge: 'Outcome required',
      action: 'Confirm outcome',
      lessonId: 1
    }
    demo_dashboard[:needsAttention] = [lesson_item]
    create_payment(student:, amount_cents: 1400, confirm: false)

    expect(demo_dashboard[:pendingCount]).to eq(0)
    expect(demo_dashboard[:payments][:paymentsReceived]).to eq({})

    merged = service.apply(demo_dashboard)
    kinds = merged[:needsAttention].map { |item| item[:kind].to_s }

    expect(kinds).to include('outcome_required', 'pending_payment')
    merged[:needsAttention].each do |item|
      next if item[:studentId].blank?

      expect(item[:studentId]).to be_a(Integer)
    end
    expect(merged[:needsAttention].pluck(:teacherId).compact).to all(be_a(Integer))
  end

  it 'returns empty finance figures when no records exist' do
    payload = service.build

    expect(payload[:pending_count]).to eq(0)
    expect(payload[:payments][:paymentsReceived]).to eq({})
    expect(payload[:attention_items]).to eq([])
  end

  it 'scopes queries to the workspace' do
    other_workspace = create(:workspace)
    other_student = create(:student_profile, workspace: other_workspace)
    create_payment(student: other_student, amount_cents: 9000)

    create_payment(student:, amount_cents: 1200)

    expect(service.build[:payments][:paymentsReceived]['UAH']).to eq(1200)
  end
end
