# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Homework page' do
  it 'renders the teacher homework workspace with assignments from the database' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:, first_name: 'Ava', last_name: 'Thompson')
    student = create(:student_profile, workspace:, teacher_profile: teacher, first_name: 'Emma')
    homework = create(
      :homework,
      workspace:,
      teacher:,
      students: [student],
      title: 'Past Simple Practice',
      instructions: 'Write five sentences.'
    )
    row = homework.homework_students.first
    row.homework_response.update!(status: :submitted, submitted_at: Time.current, written_response: 'I went home.')

    sign_in workspace.owner

    get homework_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.homework.title'))
    expect(response.body).to include('Past Simple Practice')
    expect(response.body).to include(I18n.t('app.homework.tab_to_review'))
    expect(response.body).to include(I18n.t('app.homework.student_submission'))
  end

  it 'redirects students to the student portal' do
    user = create(:user, :student)
    sign_in user

    get homework_path

    expect(response).to redirect_to(student_root_path)
  end
end
