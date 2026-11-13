# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Payments', type: :request do
  def ensure_uah!
    Currency.find_or_create_by!(code: 'UAH') do |currency|
      currency.name = 'Ukrainian hryvnia'
      currency.symbol = '₴'
      currency.subunit_to_unit = 100
      currency.active = true
      currency[:default] = true
    end
  end

  def create_payment(student:, amount_cents:, confirm: false)
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
  let(:student) { create(:student_profile, workspace:) }

  before do
    ensure_uah!
    sign_in owner, scope: :user
  end

  it 'shows real student balances on the page' do
    create_payment(student:, amount_cents: 5000, confirm: true)

    get payments_path
    expect(response).to have_http_status(:ok)
    expect(response.body).to include(student.display_label)
  end

  it 'creates a pending payment without changing balance' do
    post payments_student_payment_path, params: {
      student_profile_id: student.id,
      amount_cents: 3000,
      method: 'bank_transfer',
      confirm: false
    }, as: :json

    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student.reload).balance_cents).to eq(0)
    pending_payment = StudentTransaction.pending.transaction_payment.find_by(student_profile_id: student.id)
    expect(pending_payment.amount_cents).to eq(3000)
  end

  it 'creates a confirmed payment' do
    post payments_student_payment_path, params: {
      student_profile_id: student.id,
      amount_cents: 3000,
      method: 'bank_transfer',
      confirm: true
    }, as: :json

    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student.reload).balance_cents).to eq(3000)
  end

  it 'confirms and rejects pending payments' do
    payment = create_payment(student:, amount_cents: 2500, confirm: false)

    post payments_confirm_payment_path, params: { payment_id: payment.id }, as: :json
    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(2500)

    pending = create_payment(student:, amount_cents: 1000, confirm: false)

    post payments_reject_payment_path, params: { payment_id: pending.id }, as: :json
    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(2500)
  end

  it 'records a full refund' do
    payment = create_payment(student:, amount_cents: 8000, confirm: true)

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 8000 }, as: :json
    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student.reload).balance_cents).to eq(0)
    expect(StudentTransaction.transaction_refund.where(related_transaction_id: payment.id)).to exist
  end

  it 'records a partial refund' do
    payment = create_payment(student:, amount_cents: 10_000, confirm: true)

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 3000 }, as: :json
    expect(response).to have_http_status(:ok)
    expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(7000)
  end

  it 'rejects refunds above the remaining amount' do
    payment = create_payment(student:, amount_cents: 5000, confirm: true)

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 6000 }, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(5000)
  end

  it 'rejects refunds for pending payments' do
    payment = create_payment(student:, amount_cents: 4000, confirm: false)

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 1000 }, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'isolates data by workspace' do
    other_workspace = create(:workspace)
    other_student = create(:student_profile, workspace: other_workspace)
    create_payment(student: other_student, amount_cents: 9000, confirm: true)

    get payments_path
    expect(response.body).not_to include(other_student.display_label)
  end

  it 'forbids teachers from payment actions' do
    teacher_user = create(:user, :teacher, workspace:)
    create(:teacher_profile, workspace:, user: teacher_user)
    sign_in teacher_user, scope: :user

    post payments_student_payment_path, params: {
      student_profile_id: student.id,
      amount_cents: 1000,
      method: 'cash',
      confirm: true
    }, as: :json

    expect(response).to have_http_status(:forbidden)
  end

  it 'forbids teachers from refunds' do
    payment = create_payment(student:, amount_cents: 2000, confirm: true)
    teacher_user = create(:user, :teacher, workspace:)
    create(:teacher_profile, workspace:, user: teacher_user)
    sign_in teacher_user, scope: :user

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 1000 }, as: :json
    expect(response).to have_http_status(:forbidden)
  end

  it 'rejects refunds for rejected payments' do
    payment = create_payment(student:, amount_cents: 4000, confirm: false)
    Finance::RejectPayment.new(payment:).save

    post payments_refund_path, params: { payment_id: payment.id, amount_cents: 1000 }, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'forbids teachers from viewing finance page content' do
    teacher_user = create(:user, :teacher, workspace:)
    create(:teacher_profile, workspace:, user: teacher_user)
    sign_in teacher_user, scope: :user

    get payments_path
    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.payments.forbidden_text'))
  end
end
