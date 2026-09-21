# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Dashboard' do
  it 'renders for a workspace owner when lessons exist' do
    teacher = create(:teacher_profile)
    create(:lesson, teacher:)
    sign_in teacher.workspace.owner

    get dashboard_path

    expect(response).to have_http_status(:ok)
  end

  it 'renders for a teacher when lessons exist' do
    teacher = create(:teacher_profile)
    create(:lesson, teacher:)
    sign_in teacher.user

    get dashboard_path

    expect(response).to have_http_status(:ok)
  end

  it 'lists homework awaiting review from the database on the teacher dashboard' do
    teacher = create(:teacher_profile)
    student = create(:student_profile, workspace: teacher.workspace)
    homework = create(
      :homework,
      teacher:,
      workspace: teacher.workspace,
      students: [student],
      title: 'Dashboard review task'
    )
    response_record = homework.homework_students.first.homework_response
    response_record.update!(status: :submitted, submitted_at: Time.current, written_response: 'Done.')

    sign_in teacher.user
    get dashboard_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Dashboard review task')
    expect(response.body).to include(student.display_label)
  end
end
