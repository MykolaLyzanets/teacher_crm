# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Lesson outcome balance payload' do
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

  def lesson_outcome_json(response)
    doc = Nokogiri::HTML(response.body)
    node = doc.at_css('[data-lesson-outcome-lesson-value]')
    raise 'lesson-outcome payload not found' if node.blank?

    JSON.parse(node['data-lesson-outcome-lesson-value'])
  end

  def build_lesson(teacher:, student:, price_cents: 1500)
    subject_record = create(:subject, teacher_profile: teacher)
    lesson_type = create(:lesson_type, subject: subject_record)
    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false,
      price_cents:,
      currency: 'UAH'
    )
  end

  let(:workspace) { create(:workspace) }
  let(:owner) { workspace.owner.tap { |user| user.update!(workspace:, skip_workspace_presence: true) } }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  before { ensure_uah! }

  it 'exposes confirmed balance cents for the lesson student profile id' do
    create_payment(student:, amount_cents: 5000)
    lesson = build_lesson(teacher:, student:)

    sign_in owner, scope: :user
    get complete_dialog_lesson_path(id: lesson.id), headers: { 'Turbo-Frame' => 'lesson_dialog' }

    payload = lesson_outcome_json(response)
    expect(payload['students'].first['id']).to eq(student.id)
    expect(payload['students'].first['balanceCents']).to eq(5000)
  end

  it 'exposes a negative balance from real transactions' do
    Finance::ChangeStudentBalance.new(
      workspace:,
      student_profile: student,
      created_by: owner,
      amount_cents: -3000,
      reason: 'Outstanding lesson fees'
    ).tap(&:save)
    lesson = build_lesson(teacher:, student:)

    sign_in owner, scope: :user
    get complete_dialog_lesson_path(id: lesson.id), headers: { 'Turbo-Frame' => 'lesson_dialog' }

    expect(lesson_outcome_json(response)['students'].first['balanceCents']).to eq(-3000)
  end

  it 'returns zero balance when the student has no transactions' do
    lesson = build_lesson(teacher:, student:)

    sign_in owner, scope: :user
    get complete_dialog_lesson_path(id: lesson.id), headers: { 'Turbo-Frame' => 'lesson_dialog' }

    expect(lesson_outcome_json(response)['students'].first['balanceCents']).to eq(0)
  end

  it 'uses database balance instead of demo catalog name matching' do
    student.update!(first_name: 'Emma', last_name: 'Johnson', preferred_name: 'Emma')
    create_payment(student:, amount_cents: 4242)
    lesson = build_lesson(teacher:, student:)

    sign_in owner, scope: :user
    get complete_dialog_lesson_path(id: lesson.id), headers: { 'Turbo-Frame' => 'lesson_dialog' }

    payload = lesson_outcome_json(response)
    expect(payload['students'].first['balanceCents']).to eq(4242)
    expect(payload['students'].first['id']).to eq(student.id)
  end

  it 'includes lesson price so the client can preview balance after charge' do
    create_payment(student:, amount_cents: 6000)
    lesson = build_lesson(teacher:, student:, price_cents: 1500)

    sign_in owner, scope: :user
    get complete_dialog_lesson_path(id: lesson.id), headers: { 'Turbo-Frame' => 'lesson_dialog' }

    payload = lesson_outcome_json(response)
    balance_cents = payload['students'].first['balanceCents']
    price_cents = payload['priceCents']
    expect(balance_cents - price_cents).to eq(4500)
  end

  it 'does not expose balance data to users without finance access' do
    create_payment(student:, amount_cents: 9000)
    lesson = build_lesson(teacher:, student:)

    sign_in teacher.user, scope: :user
    get complete_dialog_lesson_path(id: lesson.id), headers: { 'Turbo-Frame' => 'lesson_dialog' }

    balance = lesson_outcome_json(response)['students'].first['balanceCents']
    expect(balance).to be_nil
  end
end
