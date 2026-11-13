# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Student profile payments' do
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

  let(:workspace) { create(:workspace) }
  let(:owner) { workspace.owner.tap { |user| user.update!(workspace:, skip_workspace_presence: true) } }
  let(:student) { create(:student_profile, workspace:, first_name: 'Ledger', last_name: 'Student') }

  def completed_lesson_for(student, price_cents: 3000)
    teacher = create(:teacher_profile, workspace:)
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
    lesson
  end

  before { ensure_uah! }

  it 'shows the real signed balance and currency on the payments tab' do
    add_payment(student:, amount_cents: 5000, confirm: true)
    Finance::ChangeStudentBalance.new(
      workspace: student.workspace,
      student_profile: student,
      created_by: owner,
      amount_cents: -8000,
      reason: 'Extra charge'
    ).save

    sign_in owner
    get student_path(id: student.id, tab: 'payments')

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('₴')
    expect(response.body).to include(I18n.t('app.payments.types.payment'))
    expect(Finance::StudentBalance.new(student_profile: student.reload).balance_cents).to eq(-3000)
  end

  it 'lists confirmed, pending, refunds, and reversals for this student only' do
    add_payment(student:, amount_cents: 10_000, confirm: true)
    add_payment(student:, amount_cents: 2000, confirm: false)
    lesson = completed_lesson_for(student)
    Finance::TakeLessonPayment.new(lesson:, created_by: owner).save
    charge = StudentTransaction.transaction_lesson_charge.find_by!(student_profile_id: student.id, lesson_id: lesson.id)
    Finance::UndoTransaction.new(transaction: charge, created_by: owner).save
    payment = StudentTransaction.transaction_payment.confirmed.find_by(student_profile_id: student.id)
    Finance::RefundPayment.new(payment:, created_by: owner, amount_cents: 1000, reason: 'Partial').save

    other = create(:student_profile, workspace:, first_name: 'Other')
    add_payment(student: other, amount_cents: 99_000, confirm: true)

    sign_in owner
    get student_path(id: student.id, tab: 'payments')

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.payments.tx_status_pending'))
    expect(response.body).to include(I18n.t('app.payments.types.lesson_charge'))
    expect(response.body).to include(I18n.t('app.payments.types.charge_reversal'))
    expect(response.body).to include(I18n.t('app.payments.types.refund'))
    expect(response.body).not_to include('Other')
  end

  it 'shows an empty transaction table when there is no history' do
    sign_in owner
    get student_path(id: student.id, tab: 'payments')

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.students.no_transactions'))
  end

  it 'isolates finance data by workspace' do
    add_payment(student:, amount_cents: 4000, confirm: true)
    other_workspace = create(:workspace)
    outsider = create(:student_profile, workspace: other_workspace, first_name: 'Outside')
    add_payment(student: outsider, amount_cents: 70_000, confirm: true)

    sign_in owner
    get student_path(id: student.id, tab: 'payments')

    expect(response.body).not_to include('Outside')
  end

  it 'records a payment from the shared payments endpoint scoped to the profile student' do
    sign_in owner

    post payments_student_payment_path, params: {
      student_profile_id: student.id,
      amount_cents: 2500,
      method: 'cash',
      confirm: true
    }, as: :json

    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student.reload).balance_cents).to eq(2500)
  end

  it 'rejects payment actions when the student is outside the workspace' do
    other_workspace = create(:workspace)
    outsider = create(:student_profile, workspace: other_workspace)
    sign_in owner

    expect do
      post payments_student_payment_path, params: {
        student_profile_id: outsider.id,
        amount_cents: 1000,
        method: 'cash',
        confirm: true
      }, as: :json
    end.to raise_error(ActiveRecord::RecordNotFound)
  end

  it 'forbids teachers from managing payments' do
    teacher_user = create(:user, :teacher, workspace:)
    create(:teacher_profile, workspace:, user: teacher_user)
    sign_in teacher_user

    post payments_student_payment_path, params: {
      student_profile_id: student.id,
      amount_cents: 1000,
      method: 'cash',
      confirm: true
    }, as: :json

    expect(response).to have_http_status(:forbidden)
  end

  it 'validates refund amount on the shared endpoint' do
    payment = add_payment(student:, amount_cents: 3000, confirm: true)
    sign_in owner

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 5000 }, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end
end
