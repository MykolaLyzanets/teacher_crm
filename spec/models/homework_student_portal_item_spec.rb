# frozen_string_literal: true

require 'rails_helper'

RSpec.describe HomeworkStudent do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  it 'includes homework materials in the student portal item' do
    homework = create(:homework, workspace:, teacher:, students: [student])
    create(:material, workspace:, teacher:, homework:, students: [student])
    row = homework.homework_students.first

    item = row.as_student_portal_item

    expect(item[:materialIds].size).to eq(1)
    expect(item[:attachmentCount]).to eq(1)
    expect(item[:materials].first[:title]).to eq('Grammar worksheet')
  end
end
