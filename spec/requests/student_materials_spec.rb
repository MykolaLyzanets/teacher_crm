# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Student material sharing' do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }
  let(:material) { create(:material, workspace:, teacher:) }

  it 'allows staff to share a library material with a student' do
    sign_in workspace.owner

    expect do
      post share_student_material_path(student), params: { material_id: material.id }
    end.to change(MaterialStudent, :count).by(1)

    expect(response).to redirect_to(student_path(student))
    expect(MaterialStudent.last).to have_attributes(material_id: material.id, student_id: student.id)
  end

  it 'redirects students away before sharing' do
    sign_in student.user

    expect do
      post share_student_material_path(student), params: { material_id: material.id }
    end.not_to change(MaterialStudent, :count)

    expect(response).to redirect_to(student_root_path)
  end
end
