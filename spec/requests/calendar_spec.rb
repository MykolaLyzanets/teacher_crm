# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Calendar create lesson' do
  def create_dialog
    get new_calendar_path, headers: { 'Turbo-Frame' => 'create_lesson' }
  end

  it 'asks the owner to pick a teacher when the workspace has several teachers' do
    workspace = create(:workspace)
    create(:teacher_profile, workspace:, first_name: 'Ava', last_name: 'Thompson')
    create(:teacher_profile, workspace:, first_name: 'Noah', last_name: 'Brooks')
    sign_in workspace.owner

    create_dialog

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.calendar.select_teacher'))
    expect(response.body).to include('data-calendar-target="teacherField"')
    expect(response.body).to match(/data-calendar-target="draftTeacher"[^>]*value=""/)
  end

  it 'presets the only teacher in the workspace' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:, first_name: 'Ava', last_name: 'Thompson')
    sign_in workspace.owner

    create_dialog

    expect(response).to have_http_status(:ok)
    expect(response.body).to match(/data-calendar-target="draftTeacher"[^>]*value="#{teacher.id}"/)
  end

  it 'keeps a teacher locked to themselves' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:, first_name: 'Ava')
    create(:teacher_profile, workspace:, first_name: 'Noah')
    sign_in teacher.user

    create_dialog

    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include('data-calendar-target="teacherField"')
    expect(response.body).to match(/data-calendar-target="draftTeacher"[^>]*value="#{teacher.id}"/)
  end

  it 'does not preselect a paused student even when they are the only one' do
    workspace = create(:workspace)
    create(:teacher_profile, workspace:)
    paused = create(:student_profile, workspace:, first_name: 'Lyzanec', last_name: 'Ivanovich', status: :paused)
    sign_in workspace.owner

    create_dialog

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.calendar.select_student'))
    expect(response.body).not_to include("data-student-id=\"#{paused.id}\"")
  end

  it 'ignores a paused student_id when opening the create dialog' do
    workspace = create(:workspace)
    create(:teacher_profile, workspace:)
    paused = create(:student_profile, workspace:, first_name: 'Lyzanec', last_name: 'Ivanovich', status: :paused)
    sign_in workspace.owner

    get new_calendar_path, params: { student_id: paused.id }, headers: { 'Turbo-Frame' => 'create_lesson' }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.calendar.select_student'))
    expect(response.body).not_to include("data-student-id=\"#{paused.id}\"")
    expect(response.body).not_to include('"firstName":"Lyzanec"')
  end

  it 'still presets the only active student' do
    workspace = create(:workspace)
    create(:teacher_profile, workspace:)
    create(:student_profile, workspace:, first_name: 'Emma', last_name: 'Johnson', status: :paused)
    active = create(:student_profile, workspace:, first_name: 'Noah', last_name: 'Brooks', status: :active)
    sign_in workspace.owner

    create_dialog

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("data-student-id=\"#{active.id}\"")
    expect(response.body).to include('Noah Brooks')
  end

  it 'sends empty-lesson management to the teacher profile' do
    workspace = create(:workspace)
    sign_in workspace.owner

    create_dialog

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('data-calendar-target="manageLessonsLink"')
    expect(response.body).to include('data-turbo-frame="_top"')
    expect(response.body).to include(%(data-calendar-teacher-url-value="#{teacher_path('__ID__')}"))
  end

  it 'loads lesson details through turbo instead of a client modal' do
    workspace = create(:workspace)
    create(:teacher_profile, workspace:)
    sign_in workspace.owner

    get calendar_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('id="lesson_details"')
    expect(response.body).to include('id="lesson_dialog"')
    expect(response.body).not_to include('data-calendar-target="details"')
    expect(response.body).not_to include('data-calendar-target="cancelDialog"')
  end
end
