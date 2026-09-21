# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Student portal homework' do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  def json_response
    response.parsed_body
  end

  it 'shows the nearest homework on the student home page' do
    homework = create(:homework, workspace:, teacher:, students: [student], title: 'Home task')
    sign_in student.user

    get student_home_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Home task')
  end

  it 'renders homework from the database for the signed-in student' do
    homework = create(
      :homework,
      workspace:,
      teacher:,
      students: [student],
      title: 'Reading comprehension'
    )

    sign_in student.user
    get student_homework_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Reading comprehension')
    expect(response.body).not_to include('Past Simple Practice')
  end

  it 'returns assignment details as JSON' do
    homework = create(:homework, workspace:, teacher:, students: [student], title: 'Essay draft')
    assignment = homework.homework_students.first

    sign_in student.user
    get student_homework_assignment_path(id: assignment.id), as: :json

    expect(response).to have_http_status(:ok)
    expect(json_response.dig('item', 'title')).to eq('Essay draft')
    expect(json_response.dig('item', 'homeworkStudentId')).to eq(assignment.id.to_s)
    expect(json_response.dig('item', 'facingLabel')).to eq(I18n.t('app.student_portal.homework.statuses.in_progress'))
    expect(json_response.dig('item', 'facingTone')).to eq('amber')
    expect(json_response.dig('item', 'editable')).to be(true)
  end

  it 'saves draft responses for the student' do
    homework = create(:homework, workspace:, teacher:, students: [student])
    response_record = homework.homework_responses.first

    sign_in student.user
    patch homework_response_path(id: response_record.id), params: { writtenResponse: 'Draft text.' }, as: :json

    expect(response).to have_http_status(:ok)
    expect(response_record.reload.written_response).to eq('Draft text.')
    expect(json_response.dig('item', 'writtenResponse')).to eq('Draft text.')
  end
end
