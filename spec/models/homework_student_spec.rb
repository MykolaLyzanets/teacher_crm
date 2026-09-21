# frozen_string_literal: true

require 'rails_helper'

RSpec.describe HomeworkStudent do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  def assignment(**attrs)
    create(:homework, workspace:, teacher:, students: [student], **attrs).homework_students.first
  end

  it 'marks draft work as in progress while the assignment is still open' do
    row = assignment(due_at: 2.days.from_now)
    row.homework_response.update!(status: :draft)

    expect(row.facing_status).to eq('in_progress')
    expect(row.portal_tab).to eq('todo')
    expect(row.portal_action).to eq('continue')
  end

  it 'treats resubmission requests as update actions' do
    row = assignment
    row.homework_response.update!(status: :resubmission_requested, feedback: 'Fix verbs.')

    expect(row.facing_status).to eq('resubmission_requested')
    expect(row.portal_action).to eq('update')
  end

  it 'returns the nearest todo item for the student home page' do
    row = assignment(title: 'Nearest task', due_at: 2.days.from_now)
    row.homework_response.update!(status: :draft)

    item = described_class.nearest_todo_item(student)

    expect(item[:title]).to eq('Nearest task')
    expect(item[:tab]).to eq('todo')
  end

  it 'builds due buckets for filters' do
    row = assignment(due_at: Date.current + 5.days)
    bucket = row.due_context[:bucket]

    expect(bucket).to eq('later')
  end
end
