# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Subjects and lesson types API' do
  def sign_in_owner(workspace)
    sign_in workspace.owner
  end

  it 'lists nested active lesson types on the calendar subjects endpoint' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher, name: 'English')
    active_type = create(:lesson_type, subject: subject_record, name: 'Individual', price_cents: 80_000, currency: 'UAH')
    create(:lesson_type, subject: subject_record, name: 'Archived', is_active: false)
    create(:subject, teacher_profile: teacher, name: 'Hidden', is_active: false)
    sign_in_owner(workspace)

    get teacher_subjects_path(teacher_id: teacher.id)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to contain_exactly(
      hash_including(
        'id' => subject_record.id,
        'name' => 'English',
        'isActive' => true,
        'lessonTypes' => contain_exactly(
          hash_including(
            'id' => active_type.id,
            'name' => 'Individual',
            'isActive' => true,
            'subjectId' => subject_record.id,
            'priceCents' => 80_000,
            'currency' => 'UAH'
          )
        )
      )
    )
  end

  it 'includes inactive records when include_inactive is set' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    active = create(:subject, teacher_profile: teacher, name: 'English')
    inactive = create(:subject, teacher_profile: teacher, name: 'Latin', is_active: false)
    sign_in_owner(workspace)

    get teacher_subjects_path(teacher_id: teacher.id, include_inactive: 1)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.pluck('id')).to contain_exactly(active.id, inactive.id)
  end

  it 'creates a subject for a teacher' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    sign_in_owner(workspace)

    expect do
      post teacher_subjects_path(teacher_id: teacher.id), params: { name: 'English' }, as: :json
    end.to change(Subject, :count).by(1)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include('name' => 'English', 'isActive' => true)
    expect(teacher.taught_subjects.find_by(name: 'English')).to be_present
  end

  it 'allows the same subject name on different teachers' do
    workspace = create(:workspace)
    ava = create(:teacher_profile, workspace:, first_name: 'Ava')
    noah = create(:teacher_profile, workspace:, first_name: 'Noah')
    create(:subject, teacher_profile: ava, name: 'English')
    sign_in_owner(workspace)

    post teacher_subjects_path(teacher_id: noah.id), params: { name: 'English' }, as: :json

    expect(response).to have_http_status(:created)
    expect(Subject.where(name: 'English').count).to eq(2)
  end

  it 'rejects a duplicate subject name for the same teacher' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    create(:subject, teacher_profile: teacher, name: 'English')
    sign_in_owner(workspace)

    post teacher_subjects_path(teacher_id: teacher.id), params: { name: 'english' }, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'renames a subject' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher, name: 'English')
    sign_in_owner(workspace)

    patch subject_path(id: subject_record.id), params: { name: 'Mathematics' }, as: :json

    expect(response).to have_http_status(:ok)
    expect(subject_record.reload.name).to eq('Mathematics')
  end

  it 'deactivates a subject without deleting it' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    sign_in_owner(workspace)

    expect do
      patch subject_path(id: subject_record.id), params: { isActive: false }, as: :json
    end.not_to change(Subject, :count)

    expect(response).to have_http_status(:ok)
    expect(subject_record.reload).not_to be_is_active
  end

  it 'creates a lesson type on a subject' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    sign_in_owner(workspace)

    expect do
      post subject_lesson_types_path(subject_id: subject_record.id), params: {
        name: 'Trial',
        kind: 'trial',
        mode: 'individual',
        defaultDurationMinutes: 30
      }, as: :json
    end.to change(LessonType, :count).by(1)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include(
      'name' => 'Trial',
      'kind' => 'trial',
      'mode' => 'individual',
      'defaultDurationMinutes' => 30,
      'isActive' => true,
      'subjectId' => subject_record.id
    )
  end

  it 'stores a default price on a lesson type' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    sign_in_owner(workspace)

    post subject_lesson_types_path(subject_id: subject_record.id), params: {
      name: 'Individual',
      kind: 'individual',
      mode: 'individual',
      defaultDurationMinutes: 60,
      priceCents: 50000,
      currency: 'UAH'
    }, as: :json

    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include('priceCents' => 50000, 'currency' => 'UAH')
    expect(subject_record.lesson_types.last).to have_attributes(price_cents: 50000, currency: 'UAH')
  end

  it 'updates and deactivates a lesson type' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    lesson_type = create(:lesson_type, subject: subject_record, name: 'Individual')
    sign_in_owner(workspace)

    patch lesson_type_path(id: lesson_type.id), params: { name: 'Private', defaultDurationMinutes: 45 }, as: :json
    expect(response).to have_http_status(:ok)
    expect(lesson_type.reload).to have_attributes(name: 'Private', default_duration_minutes: 45)

    patch lesson_type_path(id: lesson_type.id), params: { isActive: false }, as: :json
    expect(lesson_type.reload).not_to be_is_active
    expect(LessonType.count).to eq(1)
  end

  it 'does not list inactive lesson types by default' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    active = create(:lesson_type, subject: subject_record, name: 'Individual')
    create(:lesson_type, subject: subject_record, name: 'Old', is_active: false)
    sign_in_owner(workspace)

    get subject_lesson_types_path(subject_id: subject_record.id)

    expect(response.parsed_body.pluck('id')).to eq([active.id])
  end

  it 'does not let a teacher mutate another teacher subject' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    other = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    sign_in other.user

    post teacher_subjects_path(teacher_id: teacher.id), params: { name: 'English' }, as: :json
    expect(response).to have_http_status(:not_found)

    patch subject_path(id: subject_record.id), params: { name: 'Hacked' }, as: :json
    expect(response).to have_http_status(:not_found)
    expect(subject_record.reload.name).not_to eq('Hacked')
  end

  it 'does not leak subjects from another workspace' do
    teacher = create(:teacher_profile)
    create(:subject, teacher_profile: teacher)
    other_workspace = create(:workspace)
    sign_in_owner(other_workspace)

    get teacher_subjects_path(teacher_id: teacher.id)
    expect(response).to have_http_status(:not_found)

    post teacher_subjects_path(teacher_id: teacher.id), params: { name: 'English' }, as: :json
    expect(response).to have_http_status(:not_found)
  end
end
