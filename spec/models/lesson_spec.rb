# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lesson do
  def kyiv_time(hour, minute = 0)
    Time.find_zone('Europe/Kyiv').local(2026, 9, 10, hour, minute, 0)
  end

  describe 'associations' do
    it { is_expected.to belong_to(:teacher_profile).with_foreign_key(:teacher_id) }
    it { is_expected.to belong_to(:subject) }
    it { is_expected.to belong_to(:lesson_type) }
    it { is_expected.to have_and_belong_to_many(:students) }
  end

  it 'requires the subject to belong to the same teacher' do
    teacher = create(:teacher_profile)
    other_teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: other_teacher)
    lesson_type = create(:lesson_type, subject: subject_record)
    student = create(:student_profile, workspace: teacher.workspace)

    lesson = build(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )

    expect(lesson).not_to be_valid
    expect(lesson.errors.details[:subject]).to include(hash_including(error: :teacher_mismatch))
  end

  it 'requires the lesson type to belong to the same subject' do
    teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: teacher)
    other_subject = create(:subject, teacher_profile: teacher, name: 'German')
    lesson_type = create(:lesson_type, subject: other_subject)
    student = create(:student_profile, workspace: teacher.workspace)

    lesson = build(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )

    expect(lesson).not_to be_valid
    expect(lesson.errors.details[:lesson_type]).to include(hash_including(error: :subject_mismatch))
  end

  it 'requires exactly one student for an individual lesson' do
    lesson = build(:lesson, with_student: false)

    expect(lesson).not_to be_valid
    expect(lesson.errors.details[:students]).to include(hash_including(error: :individual_count))

    student = create(:student_profile, workspace: lesson.teacher_profile.workspace)
    extra = create(:student_profile, workspace: lesson.teacher_profile.workspace)
    lesson.students = [student, extra]

    expect(lesson).not_to be_valid
    expect(lesson.errors.details[:students]).to include(hash_including(error: :individual_count))
  end

  it 'allows one or more students for a group lesson' do
    teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: teacher)
    lesson_type = create(:lesson_type, :group, subject: subject_record)
    student = create(:student_profile, workspace: teacher.workspace)

    lesson = build(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )

    expect(lesson).to be_valid

    lesson.students << create(:student_profile, workspace: teacher.workspace)
    expect(lesson).to be_valid
  end

  it 'does not use the student teacher assignment to decide participation' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    other_teacher = create(:teacher_profile, workspace:)
    unassigned = create(:student_profile, workspace:, teacher_profile: nil)
    assigned_elsewhere = create(:student_profile, workspace:, teacher_profile: other_teacher)

    expect(build(:lesson, teacher:, students: [unassigned], with_student: false)).to be_valid
    expect(build(:lesson, teacher:, students: [assigned_elsewhere], with_student: false)).to be_valid
  end

  it 'rejects students from another workspace' do
    lesson = build(:lesson, with_student: false)
    outsider = create(:student_profile)
    lesson.students = [outsider]

    expect(lesson).not_to be_valid
    expect(lesson.errors.details[:students]).to include(hash_including(error: :workspace_mismatch))
  end

  it 'does not allow creating a lesson with an inactive subject or lesson type' do
    teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: teacher, is_active: false)
    lesson_type = create(:lesson_type, subject: subject_record, is_active: false)
    student = create(:student_profile, workspace: teacher.workspace)

    lesson = build(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )

    expect(lesson).not_to be_valid
    expect(lesson.errors.details[:subject]).to include(hash_including(error: :inactive))
    expect(lesson.errors.details[:lesson_type]).to include(hash_including(error: :inactive))
  end

  it 'keeps existing lessons valid after the subject or type is deactivated' do
    lesson = create(:lesson)
    lesson.subject.update!(is_active: false)
    lesson.lesson_type.update!(is_active: false)

    lesson.reload
    lesson.notes = 'kept after deactivation'

    expect(lesson).to be_valid
    expect(lesson.save).to be(true)
  end

  it 'blocks overlapping confirmed lessons for the same teacher' do
    existing = create(:lesson, starts_at: kyiv_time(10), ends_at: kyiv_time(11))
    overlap = build(
      :lesson,
      teacher: existing.teacher_profile,
      subject: existing.subject,
      lesson_type: existing.lesson_type,
      students: [create(:student_profile, workspace: existing.teacher_profile.workspace)],
      starts_at: kyiv_time(10, 30),
      ends_at: kyiv_time(11, 30),
      with_student: false
    )

    expect(overlap).not_to be_valid
    expect(overlap.errors.details[:base]).to include(hash_including(error: :teacher_overlap))
  end

  it 'allows an overlapping confirmed lesson when allow_overlap is set' do
    existing = create(:lesson, starts_at: kyiv_time(10), ends_at: kyiv_time(11))
    overlap = build(
      :lesson,
      teacher: existing.teacher_profile,
      subject: existing.subject,
      lesson_type: existing.lesson_type,
      students: [create(:student_profile, workspace: existing.teacher_profile.workspace)],
      starts_at: kyiv_time(10, 30),
      ends_at: kyiv_time(11, 30),
      allow_overlap: true,
      override_reason: 'Cover for a colleague',
      with_student: false
    )

    expect(overlap).to be_valid
    expect(overlap.save).to be(true)
  end

  it 'allows adjacent teacher lessons that only touch at the boundary' do
    existing = create(:lesson, starts_at: kyiv_time(10), ends_at: kyiv_time(11))
    adjacent = build(
      :lesson,
      teacher: existing.teacher_profile,
      subject: existing.subject,
      lesson_type: existing.lesson_type,
      students: [create(:student_profile, workspace: existing.teacher_profile.workspace)],
      starts_at: kyiv_time(11),
      ends_at: kyiv_time(12),
      with_student: false
    )

    expect(adjacent).to be_valid
  end

  it 'does not treat cancelled or completed lessons as blocking overlaps' do
    teacher = create(:teacher_profile)
    subject_record = create(:subject, teacher_profile: teacher)
    lesson_type = create(:lesson_type, subject: subject_record)
    workspace = teacher.workspace

    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [create(:student_profile, workspace:)],
      starts_at: kyiv_time(10),
      ends_at: kyiv_time(11),
      status: :cancelled,
      with_student: false
    )
    create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [create(:student_profile, workspace:)],
      starts_at: kyiv_time(10),
      ends_at: kyiv_time(11),
      status: :completed,
      with_student: false
    )

    replacement = build(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [create(:student_profile, workspace:)],
      starts_at: kyiv_time(10),
      ends_at: kyiv_time(11),
      with_student: false
    )

    expect(replacement).to be_valid
  end

  it 'blocks overlapping confirmed lessons for the same student' do
    workspace = create(:workspace)
    first_teacher = create(:teacher_profile, workspace:)
    second_teacher = create(:teacher_profile, workspace:)
    student = create(:student_profile, workspace:)
    first_subject = create(:subject, teacher_profile: first_teacher)
    second_subject = create(:subject, teacher_profile: second_teacher)

    create(
      :lesson,
      teacher: first_teacher,
      subject: first_subject,
      lesson_type: create(:lesson_type, subject: first_subject),
      students: [student],
      starts_at: kyiv_time(10),
      ends_at: kyiv_time(11),
      with_student: false
    )

    overlap = build(
      :lesson,
      teacher: second_teacher,
      subject: second_subject,
      lesson_type: create(:lesson_type, subject: second_subject),
      students: [student],
      starts_at: kyiv_time(10, 15),
      ends_at: kyiv_time(11, 15),
      with_student: false
    )

    expect(overlap).not_to be_valid
    expect(overlap.errors.details[:base]).to include(hash_including(error: :student_overlap))
  end

  it 'exposes catalog fields used by the current UI' do
    lesson = create(:lesson, price_cents: 0, currency: 'UAH')
    catalog = lesson.as_catalog

    expect(catalog[:subjectId]).to eq(lesson.subject_id)
    expect(catalog[:lessonTypeId]).to eq(lesson.lesson_type_id)
    expect(catalog[:lessonTypeName]).to eq(lesson.lesson_type.name)
    expect(catalog[:type]).to eq('individual')
    expect(catalog[:priceCents]).to eq(0)
    expect(catalog[:currency]).to eq('UAH')
    expect(catalog[:students]).to contain_exactly(
      hash_including(:id, :name, :initials)
    )
    expect(catalog[:durationMinutes]).to be_positive
    expect(catalog[:timezone]).to be_present
    expect(catalog[:endsAt]).to eq(lesson.ends_at.iso8601)
    expect(catalog[:seriesId]).to eq(lesson.series_id)
    expect(catalog).to include(:cancellationReasonCode, :cancelledBy, :chargeDecision, :chargedCents, :createdAt)
    expect(catalog[:attendance]).to eq('pending')
    expect(catalog).to include(:teacherNote, :studentProgressNote, :actualDurationMinutes, :compensationPercent)
    expect(catalog[:compensationPercent]).to eq(lesson.teacher_profile.compensation_percent)
  end

  it 'uses the teacher compensation percent in the catalog' do
    teacher = create(:teacher_profile, compensation_percent: 45)
    lesson = create(:lesson, teacher:)

    expect(lesson.as_catalog[:compensationPercent]).to eq(45)
  end

  it 'defaults compensation when the teacher profile has no such column' do
    lesson = create(:lesson)
    allow(lesson.teacher_profile).to receive(:has_attribute?).and_call_original
    allow(lesson.teacher_profile).to receive(:has_attribute?).with(:compensation_percent).and_return(false)

    expect(lesson.as_catalog[:compensationPercent]).to eq(TeacherProfile::DEFAULT_COMPENSATION_PERCENT)
  end

  it 'uses the lesson type price when the lesson has none' do
    lesson = create(:lesson, price_cents: nil, currency: nil)
    lesson.lesson_type.update!(price_cents: 80_000, currency: 'UAH')

    catalog = lesson.reload.as_catalog

    expect(lesson.billed_price_cents).to eq(80_000)
    expect(lesson.billed_currency).to eq('UAH')
    expect(catalog[:priceCents]).to eq(80_000)
    expect(catalog[:currency]).to eq('UAH')
  end
end
