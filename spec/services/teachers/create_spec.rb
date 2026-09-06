# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Teachers::Create do
  def build_service(workspace, **params)
    described_class.new(
      workspace:,
      actor: workspace.owner,
      params: {
        first_name: 'Ava',
        last_name: 'Thompson',
        email: "ava-#{SecureRandom.hex(4)}@example.com"
      }.merge(params)
    )
  end

  it 'creates subjects and lesson types with the teacher' do
    workspace = create(:workspace)
    service = build_service(
      workspace,
      lesson_catalog: [
        {
          name: 'English',
          lessonTypes: [
            { name: 'Individual', kind: 'individual', mode: 'individual', defaultDurationMinutes: 60 }
          ]
        }
      ].to_json
    )

    expect(service.save).to be(true)

    teacher = service.teacher_profile
    subject_record = teacher.taught_subjects.find_by(name: 'English')
    expect(subject_record).to be_present
    expect(subject_record.lesson_types.find_by(name: 'Individual')).to be_present
  end

  it 'does not persist subjects when teacher validation fails' do
    workspace = create(:workspace)
    service = build_service(
      workspace,
      first_name: '',
      lesson_catalog: [{ name: 'English', lessonTypes: [] }].to_json
    )

    expect(service.save).to be(false)
    expect(Subject.count).to eq(0)
  end
end
