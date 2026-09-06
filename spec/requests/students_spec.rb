# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Student profile' do
  it 'renders an editable status select next to the edit action' do
    student = create(:student_profile, status: :trial)
    sign_in student.workspace.owner

    get student_path(id: student.id)

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('name="status"')
    expect(response.body).to include('name="status_only"')
    expect(response.body).to include(I18n.t('app.students.edit_student'))
    expect(response.body).to include(I18n.t('app.statuses.trial'))
  end

  it 'updates only the status from the profile page' do
    student = create(:student_profile, first_name: 'Emma', status: :active)
    sign_in student.workspace.owner

    patch student_path(id: student.id), params: { status_only: '1', status: 'paused' }

    expect(response).to redirect_to(student_path(id: student.id))
    student.reload
    expect(student).to be_paused
    expect(student.first_name).to eq('Emma')
  end

  it 'renders the bulk status dialog for selected students' do
    workspace = create(:workspace)
    first = create(:student_profile, workspace:, status: :active)
    second = create(:student_profile, workspace:, status: :active)
    sign_in workspace.owner

    get status_dialog_students_path, params: { student_ids: [first.id, second.id] }, headers: { 'Turbo-Frame' => 'status_dialog' }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.students.status_dialog_title'))
    expect(response.body).to include(I18n.t('app.students.change_status'))
  end

  it 'updates status for selected students from the index' do
    workspace = create(:workspace)
    first = create(:student_profile, workspace:, first_name: 'Emma', status: :active)
    second = create(:student_profile, workspace:, first_name: 'Noah', status: :trial)
    sign_in workspace.owner

    patch bulk_status_students_path, params: { student_ids: [first.id, second.id], status: 'paused' }

    expect(response).to redirect_to(students_path)
    expect(first.reload).to be_paused
    expect(second.reload).to be_paused
    expect(first.first_name).to eq('Emma')
  end

  it 'shows the pause cancel reason on the student lessons tab' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    student = create(:student_profile, workspace:, status: :paused)
    reason = I18n.t('app.lessons.cancelled_student_paused')
    create(
      :lesson,
      teacher:,
      students: [student],
      with_student: false,
      status: :cancelled,
      notes: reason
    )
    sign_in workspace.owner

    get student_path(id: student.id)

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("data-cancel-reason=\"#{reason}\"")
    expect(response.body).to include(reason)
  end
end
