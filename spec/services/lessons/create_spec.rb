# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lessons::Create do
  def create_graph(mode: :individual, timezone: 'Europe/Kyiv')
    teacher = create(:teacher_profile, timezone:)
    subject_record = create(:subject, teacher_profile: teacher)
    traits = mode == :group ? %i[group] : []
    lesson_type = create(:lesson_type, *traits, subject: subject_record)
    student = create(:student_profile, workspace: teacher.workspace)
    [teacher, subject_record, lesson_type, student]
  end

  def create_lesson(teacher, **params)
    described_class.new(teacher_profile: teacher, params:)
  end

  it 'creates a confirmed lesson and stores wall time as UTC' do
    teacher, subject_record, lesson_type, student = create_graph

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00',
      location: :online
    )

    expect(service.save).to be(true)
    expect(service.lesson).to be_persisted
    expect(service.lesson).to be_confirmed
    expect(service.lesson.students).to contain_exactly(student)
    expect(service.lesson.starts_at.utc).to eq(Time.utc(2026, 9, 5, 7, 0, 0))
    expect(service.lesson.ends_at.utc).to eq(Time.utc(2026, 9, 5, 8, 0, 0))
  end

  it 'uses the lesson type duration when the end time is omitted' do
    teacher, subject_record, lesson_type, student = create_graph
    lesson_type.update!(default_duration_minutes: 45)

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00'
    )

    expect(service.save).to be(true)
    expect(service.lesson.ends_at.utc).to eq(Time.utc(2026, 9, 5, 7, 45, 0))
  end

  it 'rejects a subject that does not belong to the teacher' do
    teacher, _subject_record, _lesson_type, student = create_graph
    other_subject = create(:subject)
    other_type = create(:lesson_type, subject: other_subject)

    service = create_lesson(
      teacher,
      subject_id: other_subject.id,
      lesson_type_id: other_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00'
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:subject]).to include(hash_including(error: :blank))
  end

  it 'rejects creating a lesson with an inactive subject or type' do
    teacher, subject_record, lesson_type, student = create_graph
    subject_record.update!(is_active: false)
    lesson_type.update!(is_active: false)

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00'
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:subject]).to include(hash_including(error: :inactive))
    expect(service.errors.details[:lesson_type]).to include(hash_including(error: :inactive))
  end

  it 'allows a group lesson with a single student' do
    teacher, subject_record, lesson_type, student = create_graph(mode: :group)

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00'
    )

    expect(service.save).to be(true)
    expect(service.lesson.students.size).to eq(1)
  end

  it 'rejects unknown or deleted students' do
    teacher, subject_record, lesson_type, student = create_graph
    student.update!(deleted_at: Time.current)

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00'
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:base]).to include(hash_including(error: :students_invalid))
  end

  it 'rejects paused students' do
    teacher, subject_record, lesson_type, student = create_graph
    student.update!(status: :paused)

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00'
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:base]).to include(hash_including(error: :students_invalid))
  end

  it 'keeps TimeWithZone values instead of reinterpreting them' do
    teacher, subject_record, lesson_type, student = create_graph(timezone: 'America/New_York')
    starts_at = Time.find_zone('Europe/Kyiv').local(2026, 9, 5, 10, 0, 0)
    ends_at = starts_at + 1.hour

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      starts_at:,
      ends_at:
    )

    expect(service.save).to be(true)
    expect(service.lesson.starts_at.utc).to eq(Time.utc(2026, 9, 5, 7, 0, 0))
  end

  it 'stores price fields when they are provided' do
    teacher, subject_record, lesson_type, student = create_graph

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00',
      price_cents: 1500,
      currency: 'UAH'
    )

    expect(service.save).to be(true)
    expect(service.lesson.price_cents).to eq(1500)
    expect(service.lesson.currency).to eq('UAH')
  end

  it 'copies the lesson type price when none is provided' do
    teacher, subject_record, lesson_type, student = create_graph
    lesson_type.update!(price_cents: 80000, currency: 'UAH')

    service = create_lesson(
      teacher,
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00'
    )

    expect(service.save).to be(true)
    expect(service.lesson.price_cents).to eq(80000)
    expect(service.lesson.currency).to eq('UAH')
  end

  it 'updates an existing lesson without recreating it' do
    teacher, subject_record, lesson_type, student = create_graph
    original = create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false,
      notes: 'Before'
    )

    service = described_class.new(
      teacher_profile: teacher,
      lesson: original,
      params: {
        subject_id: subject_record.id,
        lesson_type_id: lesson_type.id,
        student_ids: [student.id],
        notes: 'After'
      }
    )

    expect(service.save).to be(true)
    expect(service.lesson.id).to eq(original.id)
    expect(service.lesson.reload.notes).to eq('After')
    expect(Lesson.count).to eq(1)
  end
end
