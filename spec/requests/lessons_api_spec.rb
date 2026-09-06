# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Lesson scheduling API' do
  def graph(mode: :individual, workspace: create(:workspace))
    teacher = create(:teacher_profile, workspace:)
    subject_record = create(:subject, teacher_profile: teacher)
    traits = mode == :group ? %i[group] : []
    lesson_type = create(:lesson_type, *traits, subject: subject_record)
    student = create(:student_profile, workspace:)
    [workspace, teacher, subject_record, lesson_type, student]
  end

  def lesson_payload(teacher, subject_record, lesson_type, student, **extra)
    {
      teacherId: teacher.id,
      subjectId: subject_record.id,
      lessonTypeId: lesson_type.id,
      studentIds: [student.id],
      date: '2026-09-05',
      startTime: '10:00',
      endTime: '11:00',
      location: 'online',
      meetingLink: 'https://meet.example.com/lesson',
      notes: 'Bring workbook',
      priceCents: 1500,
      currency: 'UAH'
    }.merge(extra)
  end

  it 'lists active subjects for a teacher' do
    workspace, teacher, subject_record, = graph
    create(:subject, teacher_profile: teacher, name: 'Hidden', is_active: false)
    sign_in workspace.owner

    get teacher_subjects_path(teacher_id: teacher.id)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to contain_exactly(
      hash_including(
        'id' => subject_record.id,
        'name' => subject_record.name,
        'isActive' => true
      )
    )
    expect(response.parsed_body.first['lessonTypes']).to be_present
  end

  it 'lists active lesson types for a subject' do
    workspace, _teacher, subject_record, lesson_type, = graph
    create(:lesson_type, subject: subject_record, name: 'Archived', is_active: false)
    sign_in workspace.owner

    get subject_lesson_types_path(subject_id: subject_record.id)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to contain_exactly(
      hash_including(
        'id' => lesson_type.id,
        'name' => lesson_type.name,
        'kind' => 'individual',
        'mode' => 'individual',
        'defaultDurationMinutes' => 60
      )
    )
  end

  it 'creates a lesson and returns catalog JSON' do
    workspace, teacher, subject_record, lesson_type, student = graph
    sign_in workspace.owner

    expect do
      post lessons_path, params: lesson_payload(teacher, subject_record, lesson_type, student), as: :json
    end.to change(Lesson, :count).by(1)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include(
      'teacherId' => teacher.id,
      'subjectId' => subject_record.id,
      'lessonTypeId' => lesson_type.id,
      'studentIds' => [student.id],
      'date' => '2026-09-05',
      'startTime' => '10:00',
      'endTime' => '11:00',
      'priceCents' => 1500,
      'currency' => 'UAH',
      'meetingLink' => 'https://meet.example.com/lesson'
    )
  end

  it 'updates a lesson' do
    workspace, teacher, subject_record, lesson_type, student = graph
    lesson = create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false,
      notes: 'Old note'
    )
    sign_in workspace.owner

    patch lesson_path(id: lesson.id), params: {
      teacherId: teacher.id,
      subjectId: subject_record.id,
      lessonTypeId: lesson_type.id,
      studentIds: [student.id],
      date: '2026-09-06',
      startTime: '12:00',
      endTime: '13:00',
      notes: 'Updated note'
    }, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['notes']).to eq('Updated note')
    expect(response.parsed_body['date']).to eq('2026-09-06')
    expect(response.parsed_body['startTime']).to eq('12:00')
    expect(lesson.reload.notes).to eq('Updated note')
  end

  it 'creates a weekly series of lessons' do
    workspace, teacher, subject_record, lesson_type, student = graph
    sign_in workspace.owner

    expect do
      post lessons_path, params: lesson_payload(
        teacher, subject_record, lesson_type, student,
        repeat: 'weekly',
        repeatEnd: '2026-09-19'
      ), as: :json
    end.to change(Lesson, :count).by(3)

    expect(response).to have_http_status(:created)
    expect(response.parsed_body['lessons'].size).to eq(3)
    expect(response.parsed_body['lessons'].pluck('date'))
      .to eq(%w[2026-09-05 2026-09-12 2026-09-19])
  end

  it 'skips conflicting repeated lessons' do
    workspace, teacher, subject_record, lesson_type, student = graph
    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      starts_at: teacher.time_zone.local(2026, 9, 12, 10, 0, 0),
      ends_at: teacher.time_zone.local(2026, 9, 12, 11, 0, 0),
      with_student: false
    )
    sign_in workspace.owner

    post lessons_path, params: lesson_payload(
      teacher, subject_record, lesson_type, student,
      repeat: 'weekly',
      repeatEnd: '2026-09-19',
      skipConflicts: true
    ), as: :json

    expect(response).to have_http_status(:created)
    expect(response.parsed_body['lessons'].size).to eq(2)
    expect(response.parsed_body['skippedDates']).to eq(%w[2026-09-12])
  end

  it 'lets an owner override a scheduling conflict' do
    workspace, teacher, subject_record, lesson_type, student = graph
    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      starts_at: teacher.time_zone.local(2026, 9, 5, 10, 0, 0),
      ends_at: teacher.time_zone.local(2026, 9, 5, 11, 0, 0),
      with_student: false
    )
    sign_in workspace.owner

    expect do
      post lessons_path, params: lesson_payload(
        teacher, subject_record, lesson_type, student,
        overrideConflict: true,
        overrideReason: 'One-off cover'
      ), as: :json
    end.to change(Lesson, :count).by(1)

    expect(response).to have_http_status(:created)
    expect(Lesson.order(:id).last.allow_overlap).to be(true)
  end

  it 'does not let a teacher override a scheduling conflict' do
    _workspace, teacher, subject_record, lesson_type, student = graph
    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      starts_at: teacher.time_zone.local(2026, 9, 5, 10, 0, 0),
      ends_at: teacher.time_zone.local(2026, 9, 5, 11, 0, 0),
      with_student: false
    )
    sign_in teacher.user

    expect do
      post lessons_path, params: lesson_payload(
        teacher, subject_record, lesson_type, student,
        overrideConflict: true,
        overrideReason: 'Please'
      ), as: :json
    end.not_to change(Lesson, :count)

    expect(response).to have_http_status(:forbidden)
  end

  it 'records a completed lesson outcome' do
    workspace, teacher, subject_record, lesson_type, student = graph
    lesson = create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )
    sign_in workspace.owner

    patch outcome_lesson_path(id: lesson.id), params: {
      outcome: 'completed',
      attendance: 'present',
      actualDurationMinutes: 50,
      teacherNote: 'Covered homework'
    }, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to include(
      'status' => 'completed',
      'attendance' => 'present',
      'actualDurationMinutes' => 50,
      'teacherNote' => 'Covered homework'
    )
    expect(lesson.reload).to be_completed
  end

  it 'does not let a teacher record another teacher outcome' do
    workspace, teacher, subject_record, lesson_type, student = graph
    lesson = create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )
    other = create(:teacher_profile, workspace:)
    sign_in other.user

    patch outcome_lesson_path(id: lesson.id), params: {
      outcome: 'completed',
      attendance: 'present'
    }, as: :json

    expect(response).to have_http_status(:not_found)
    expect(lesson.reload).to be_confirmed
  end

  it 'does not let a teacher create a lesson for another teacher' do
    workspace, teacher, subject_record, lesson_type, student = graph
    other = create(:teacher_profile, workspace:)
    sign_in other.user

    post lessons_path, params: lesson_payload(teacher, subject_record, lesson_type, student), as: :json

    expect(response).to have_http_status(:not_found)
    expect(Lesson.count).to eq(0)
  end

  it 'does not leak subjects from another workspace' do
    _workspace, teacher, = graph
    other_workspace = create(:workspace)
    sign_in other_workspace.owner

    get teacher_subjects_path(teacher_id: teacher.id)

    expect(response).to have_http_status(:not_found)
  end

  it 'shows the cancel reason on the cancelled status badge' do
    workspace, teacher, subject_record, lesson_type, student = graph
    reason = I18n.t('app.lessons.cancelled_student_paused')
    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false,
      status: :cancelled,
      notes: reason
    )
    sign_in workspace.owner

    get lessons_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("data-cancel-reason=\"#{reason}\"")
  end
end
