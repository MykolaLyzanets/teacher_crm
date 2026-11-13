# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Teacher profile finance' do
  def ensure_uah!
    Currency.find_or_create_by!(code: 'UAH') do |currency|
      currency.name = 'Ukrainian hryvnia'
      currency.symbol = '₴'
      currency.subunit_to_unit = 100
      currency.active = true
      currency[:default] = true
    end
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
  let(:owner) { workspace.owner.tap { |user| user.update!(workspace:, skip_workspace_presence: true) } }
  let(:teacher) { create(:teacher_profile, workspace:, first_name: 'Finance', last_name: 'Teacher', compensation_percent: 50) }
  let(:student) { create(:student_profile, workspace:) }

  before { ensure_uah! }

  it 'shows real earnings and unpaid balance' do
    completed_lesson(teacher:, student:)
    earning = TeacherEarning.find_by!(teacher_profile_id: teacher.id)

    sign_in owner
    get teacher_path(id: teacher.id)

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.teachers.total_earnings'))
    expect(response.body).to include((earning.earning_cents / 100).to_s)
    expect(response.body).to include(student.display_label)
    expect(response.body).to include(I18n.t('app.teachers.compensation_col'))
    expect(response.body).not_to include('section_title')
    expect(Finance::FinanceHelper.teacher_unpaid_cents(
      teacher_profile: teacher,
      currency: earning.currency
    )).to eq(earning.earning_cents)
  end

  it 'shows reversed earnings with status' do
    completed_lesson(teacher:, student:)
    earning = TeacherEarning.find_by!(teacher_profile_id: teacher.id)
    earning.update!(reversed_at: Time.current)

    sign_in owner
    get teacher_path(id: teacher.id)

    expect(response.body).to include(I18n.t('app.payments.tx_status_reversed'))
  end

  it 'shows payout history with allocations' do
    completed_lesson(teacher:, student:)
    earning = TeacherEarning.find_by!(teacher_profile_id: teacher.id)

    Finance::PayTeacher.new(
      workspace:,
      teacher_profile: teacher,
      created_by: owner,
      amount_cents: earning.earning_cents,
      method: :bank_transfer,
      paid_at: Time.zone.parse('2026-06-01 12:00'),
      reference: 'PAY-1'
    ).save

    sign_in owner
    get teacher_path(id: teacher.id)

    expect(response.body).to include(I18n.t('app.teachers.payout_history'))
    expect(response.body).to include('PAY-1')
    expect(response.body).to include(student.display_label)
    expect(response.body).to include(I18n.t('app.teachers.paid_out'))
  end

  it 'shows empty states without finance records' do
    sign_in owner
    get teacher_path(id: teacher.id)

    expect(response.body).to include(I18n.t('app.teachers.no_earnings'))
    expect(response.body).to include(I18n.t('app.teachers.no_payouts'))
  end

  it 'isolates teachers by workspace' do
    completed_lesson(teacher:, student:)
    other_workspace = create(:workspace)
    create(:teacher_profile, workspace: other_workspace, first_name: 'Outside')
    other_student = create(:student_profile, workspace: other_workspace)
    other_teacher = create(:teacher_profile, workspace: other_workspace)
    completed_lesson(teacher: other_teacher, student: other_student)

    sign_in owner
    get teacher_path(id: teacher.id)

    expect(response.body).not_to include('Outside')
  end

  it 'shows finance totals in UAH only' do
    completed_lesson(teacher:, student:)

    sign_in owner
    get teacher_path(id: teacher.id)

    expect(response.body).to match(/UAH|₴/)
    expect(response.body).not_to include('EUR')
  end

  it 'forbids non-owner staff from opening the teacher profile' do
    teacher_user = create(:user, :teacher, workspace:)
    teacher.update!(user: teacher_user)
    sign_in teacher_user

    get teacher_path(id: teacher.id)

    expect(response).to redirect_to(dashboard_path)
  end
end
