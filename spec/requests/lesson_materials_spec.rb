# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Lesson materials' do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  def lesson_for(teacher_profile)
    create(:lesson, teacher: teacher_profile, status: :completed).tap do |record|
      record.students = [student]
      record.save!
    end
  end

  it 'does not attach a material that belongs to another lesson' do
    lesson_a = lesson_for(teacher)
    lesson_b = lesson_for(teacher)
    material = create(:material, workspace:, teacher:, lesson: lesson_a)

    sign_in workspace.owner
    post lesson_materials_path(lesson_b), params: { material_id: material.id }

    expect(response).to redirect_to(lesson_path(lesson_b))
    expect(flash[:alert]).to eq(I18n.t('app.lessons.material_not_found'))
    expect(material.reload.lesson_id).to eq(lesson_a.id)
  end
end
