# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lessons::Schedule do
  def graph
    teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: teacher)
    lesson_type = create(:lesson_type, subject: subject_record)
    student = create(:student_profile, workspace: teacher.workspace)
    [teacher, subject_record, lesson_type, student]
  end

  def base_params(subject_record, lesson_type, student, **extra)
    {
      subject_id: subject_record.id,
      lesson_type_id: lesson_type.id,
      student_ids: [student.id],
      date: '2026-09-05',
      start_time: '10:00',
      end_time: '11:00',
      location: :online,
      repeat: 'weekly',
      repeat_end: '2026-09-19'
    }.merge(extra)
  end

  it 'creates one lesson per weekly occurrence' do
    teacher, subject_record, lesson_type, student = graph
    service = described_class.new(
      teacher_profile: teacher,
      params: base_params(subject_record, lesson_type, student)
    )

    expect(service.save).to be(true)
    expect(service.lessons.size).to eq(3)
    expect(service.lessons.map { |lesson| lesson.starts_at.in_time_zone(teacher.time_zone).to_date.iso8601 })
      .to eq(%w[2026-09-05 2026-09-12 2026-09-19])
    expect(service.lessons.map(&:series_id).uniq.size).to eq(1)
  end

  it 'skips conflicting occurrences when requested' do
    teacher, subject_record, lesson_type, student = graph
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

    service = described_class.new(
      teacher_profile: teacher,
      params: base_params(subject_record, lesson_type, student),
      skip_conflicts: true
    )

    expect(service.save).to be(true)
    expect(service.lessons.size).to eq(2)
    expect(service.skipped_dates).to eq(%w[2026-09-12])
  end

  it 'creates overlapping occurrences when override is allowed' do
    teacher, subject_record, lesson_type, student = graph
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

    service = described_class.new(
      teacher_profile: teacher,
      params: base_params(subject_record, lesson_type, student, override_reason: 'Covering a colleague'),
      override: true
    )

    expect(service.save).to be(true)
    expect(service.lessons.size).to eq(3)
    overlapping = service.lessons.find do |lesson|
      lesson.starts_at.in_time_zone(teacher.time_zone).to_date.iso8601 == '2026-09-12'
    end
    expect(overlapping.allow_overlap).to be(true)
    expect(overlapping.override_reason).to eq('Covering a colleague')
  end

  it 'fails when every occurrence conflicts and skip is on' do
    teacher, subject_record, lesson_type, student = graph
    %w[2026-09-05 2026-09-12 2026-09-19].each do |date|
      day = Date.iso8601(date)
      create(
        :lesson,
        teacher:,
        subject: subject_record,
        lesson_type:,
        students: [create(:student_profile, workspace: teacher.workspace)],
        starts_at: teacher.time_zone.local(day.year, day.month, day.day, 10, 0, 0),
        ends_at: teacher.time_zone.local(day.year, day.month, day.day, 11, 0, 0),
        with_student: false
      )
    end

    service = described_class.new(
      teacher_profile: teacher,
      params: base_params(subject_record, lesson_type, student),
      skip_conflicts: true
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:base]).to include(hash_including(error: :all_conflicts))
    expect(Lesson.where(teacher_id: teacher.id).count).to eq(3)
  end
end
