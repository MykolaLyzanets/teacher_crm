# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Dashboard finance' do
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

  let(:workspace) { create(:workspace) }
  let(:owner) { workspace.owner.tap { |user| user.update!(workspace:, skip_workspace_presence: true) } }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, first_name: 'Ledger', last_name: 'Student') }

  before { ensure_uah! }

  it 'shows payment overview totals from the database' do
    create_payment(student:, amount_cents: 6543)
    create(:lesson, teacher:)

    sign_in owner, scope: :user
    get dashboard_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('₴65')
    expect(response.body).not_to include('€100')
  end

  it 'shows pending confirmation count from pending transactions' do
    create_payment(student:, amount_cents: 1000, confirm: false)
    create_payment(student:, amount_cents: 2000, confirm: false)
    create(:lesson, teacher:)

    sign_in owner, scope: :user
    get dashboard_path

    expect(response.body).to include('2')
    expect(response.body).to include('Payment awaiting confirmation')
    expect(response.body).to include('Ledger Student')
  end

  it 'links student finance attention items to real profile pages' do
    Finance::ChangeStudentBalance.new(
      workspace:,
      student_profile: student,
      created_by: owner,
      amount_cents: -2800,
      reason: 'Test debt'
    ).tap(&:save)
    create(:lesson, teacher:)

    sign_in owner, scope: :user
    get dashboard_path

    expect(response.body).to include(student_path(id: student.id, tab: 'payments'))
    expect(response.body).to include('has outstanding debt')
    expect(response.body).not_to include('stu-emma')
  end

  it 'shows payment overview totals in UAH' do
    create_payment(student:, amount_cents: 3000)
    create(:lesson, teacher:)

    sign_in owner, scope: :user
    get dashboard_path

    expect(response.body).to include('₴30')
  end

  it 'does not expose other workspace finance data' do
    other = create(:workspace)
    other_student = create(:student_profile, workspace: other, first_name: 'Hidden', last_name: 'Finance')
    create_payment(student: other_student, amount_cents: 8000)
    create(:lesson, teacher:)

    sign_in owner, scope: :user
    get dashboard_path

    expect(response.body).not_to include('Hidden Finance')
    expect(response.body).not_to include('€100')
  end
end
