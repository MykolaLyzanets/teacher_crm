# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Student portal finance' do
  def ensure_uah!
    Currency.find_or_create_by!(code: 'UAH') do |currency|
      currency.name = 'Ukrainian hryvnia'
      currency.symbol = '₴'
      currency.subunit_to_unit = 100
      currency.active = true
      currency[:default] = true
    end
  end

  def add_payment(student:, amount_cents:, confirm: true)
    Finance::AddStudentPayment.new(
      workspace: student.workspace,
      student_profile: student,
      created_by: student.workspace.owner,
      amount_cents:,
      method: :cash,
      confirm:
    ).tap(&:save).student_transaction
  end

  def completed_lesson(student:, teacher:, price_cents: 3000)
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
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  before { ensure_uah! }

  it 'shows the real balance on the payments page' do
    add_payment(student:, amount_cents: 6000, confirm: true)
    sign_in student.user

    get student_payments_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('₴')
    expect(response.body).to include(I18n.t('app.student_portal.payments.type_top_up'))
    expect(Finance::StudentBalance.new(student_profile: student.reload).balance_cents).to eq(6000)
  end

  it 'shows pending payments and confirmed ledger rows' do
    add_payment(student:, amount_cents: 2000, confirm: false)
    add_payment(student:, amount_cents: 5000, confirm: true)
    sign_in student.user

    get student_payments_path

    expect(response.body).to include(I18n.t('app.student_portal.payments.pending_title'))
    expect(response.body).to include(I18n.t('app.student_portal.payments.type_top_up'))
  end

  it 'shows lesson charges, refunds, and reversals' do
    add_payment(student:, amount_cents: 10_000, confirm: true)
    completed_lesson(student:, teacher:)
    charge = StudentTransaction.transaction_lesson_charge.find_by!(student_profile_id: student.id)
    Finance::UndoTransaction.new(transaction: charge, created_by: workspace.owner).save
    payment = StudentTransaction.transaction_payment.confirmed.find_by!(student_profile_id: student.id)
    Finance::RefundPayment.new(payment:, created_by: workspace.owner, amount_cents: 1000).save

    sign_in student.user
    get student_payments_path

    expect(response.body).to include(I18n.t('app.student_portal.payments.type_lesson'))
    expect(response.body).to include(I18n.t('app.student_portal.payments.type_reversal'))
    expect(response.body).to include(I18n.t('app.student_portal.payments.type_refund'))
  end

  it 'shows negative balance warnings' do
    completed_lesson(student:, teacher:)
    sign_in student.user

    get student_payments_path

    expect(response.body).to include('sp-pay__balance-alert--debt')
    expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to be_negative
  end

  it 'isolates data by workspace' do
    add_payment(student:, amount_cents: 5000, confirm: true)
    other_workspace = create(:workspace)
    outsider = create(:student_profile, workspace: other_workspace, first_name: 'Away')
    add_payment(student: outsider, amount_cents: 88_000, confirm: true)

    sign_in student.user
    get student_payments_path

    expect(response.body).not_to include('Away')
  end

  it 'shows empty history when there are no transactions' do
    sign_in student.user

    get student_payments_path

    expect(response.body).to include(I18n.t('app.student_portal.payments.empty_title'))
  end

  it 'does not show another student financial data' do
    add_payment(student:, amount_cents: 8000, confirm: true)
    other = create(:student_profile, workspace:, first_name: 'Sibling', last_name: 'Other')
    add_payment(student: other, amount_cents: 99_000, confirm: true)

    sign_in student.user
    get student_payments_path

    expect(response.body).not_to include('Sibling')
  end

  it 'shows balance on home from the signed-in student only' do
    add_payment(student:, amount_cents: 4500, confirm: true)
    sign_in student.user

    get student_home_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('₴')
    expect(response.body).to include(I18n.t('app.student_portal.home_page.view_payments'))
  end

  it 'does not allow students to create payments via staff endpoints' do
    sign_in student.user

    post payments_student_payment_path, params: {
      student_profile_id: student.id,
      amount_cents: 1000,
      method: 'cash',
      confirm: true
    }, as: :json

    expect(response).to have_http_status(:forbidden)
  end
end
