# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Material do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  it 'exposes portal and library payloads' do
    material = create(:material, workspace:, teacher:, students: [student])

    expect(material.as_library_entry[:id]).to eq(material.id.to_s)
    expect(material.as_portal_item[:title]).to eq('Grammar worksheet')
    expect(material.as_portal_item[:studentIds]).to eq([student.id.to_s])
  end

  it 'lists materials shared with a student' do
    visible = create(:material, workspace:, teacher:, students: [student])
    create(:material, workspace:, teacher:)

    expect(described_class.portal_items_for(student).map { |item| item[:id] }).to eq([visible.id.to_s])
  end
end
