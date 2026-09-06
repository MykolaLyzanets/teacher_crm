# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Profile' do
  it 'creates a teacher profile for a workspace owner so subjects can be saved' do
    workspace = create(:workspace)
    sign_in workspace.owner

    expect { get profile_path }.to change(TeacherProfile, :count).by(1)
    expect(response).to have_http_status(:ok)
    expect(workspace.owner.reload.teacher_profile).to be_present
  end

  it 'saves personal details on the teacher profile' do
    teacher = create(:teacher_profile, first_name: 'Ava', last_name: 'Thompson')
    sign_in teacher.user

    patch profile_path, params: {
      first_name: 'Mila',
      last_name: 'Koval',
      email: teacher.user.email,
      phone: '+380501112233',
      timezone: 'Europe/Kyiv'
    }

    expect(response).to redirect_to(profile_path)
    teacher.reload
    expect(teacher.first_name).to eq('Mila')
    expect(teacher.last_name).to eq('Koval')
    expect(teacher.phone).to eq('+380501112233')
    expect(teacher.timezone).to eq('Europe/Kyiv')
  end

  it 'renders an inline field to add a subject from profile' do
    teacher = create(:teacher_profile)
    sign_in teacher.user

    get profile_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.lesson_types.lesson_name_placeholder'))
    expect(response.body).to include(I18n.t('app.lesson_types.add_lesson'))
    expect(CGI.unescapeHTML(response.body)).to include('lesson-types#addSubject')
  end

  it 'creates a subject for the current teacher' do
    teacher = create(:teacher_profile)
    sign_in teacher.user

    expect do
      post teacher_subjects_path(teacher_id: teacher.id), params: { name: 'English' }, as: :json
    end.to change(Subject, :count).by(1)

    expect(response).to have_http_status(:created)
    expect(teacher.taught_subjects.find_by(name: 'English')).to be_present
  end

  it 'creates a lesson type on a subject from profile' do
    teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: teacher, name: 'English')
    sign_in teacher.user

    post subject_lesson_types_path(subject_id: subject_record.id), params: {
      name: 'Individual',
      kind: 'individual',
      mode: 'individual',
      defaultDurationMinutes: 60
    }, as: :json

    expect(response).to have_http_status(:created)
    expect(subject_record.lesson_types.find_by(name: 'Individual')).to be_present
  end
end
