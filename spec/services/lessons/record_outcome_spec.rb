# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lessons::RecordOutcome do
  def build_lesson(**attrs)
    create(:lesson, **attrs)
  end

  it 'completes a confirmed lesson with attendance and notes' do
    lesson = build_lesson

    service = described_class.new(
      lesson:,
      params: {
        outcome: 'completed',
        attendance: 'present',
        actualDurationMinutes: 55,
        teacherNote: 'Worked on tenses',
        studentProgressNote: 'Good progress'
      }
    )

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_completed
    expect(lesson).to be_attendance_present
    expect(lesson.actual_duration_minutes).to eq(55)
    expect(lesson.teacher_note).to eq('Worked on tenses')
    expect(lesson.student_progress_note).to eq('Good progress')
  end

  it 'requires attendance when completing a lesson' do
    lesson = build_lesson
    service = described_class.new(lesson:, params: { outcome: 'completed' })

    expect(service.save).to be(false)
    expect(service.errors.details[:attendance]).to include(hash_including(error: :blank))
    expect(lesson.reload).to be_confirmed
  end

  it 'cancels a confirmed lesson and stores a cancel reason' do
    lesson = build_lesson(notes: 'Bring workbook')
    service = described_class.new(lesson:, params: { outcome: 'cancelled' })

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_cancelled
    expect(lesson).to be_attendance_pending
    expect(lesson.actual_duration_minutes).to be_nil
    expect(lesson.notes).to eq(I18n.t('app.lessons.cancelled_manual'))
  end

  it 'keeps a provided cancel reason when cancelling' do
    lesson = build_lesson
    service = described_class.new(lesson:, params: { outcome: 'cancelled', notes: 'Student was ill' })

    expect(service.save).to be(true)
    expect(lesson.reload.notes).to eq('Student was ill')
  end

  it 'does not complete a lesson that already has an outcome' do
    lesson = build_lesson(status: :completed, attendance: :present)
    service = described_class.new(
      lesson:,
      params: { outcome: 'completed', attendance: 'late' }
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:base]).to include(hash_including(error: :not_confirmed))
  end

  it 'corrects a completed lesson back to confirmed' do
    lesson = build_lesson(
      status: :completed,
      attendance: :present,
      actual_duration_minutes: 50,
      teacher_note: 'Done'
    )
    service = described_class.new(lesson:, params: { outcome: 'confirmed' })

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_confirmed
    expect(lesson).to be_attendance_pending
    expect(lesson.actual_duration_minutes).to be_nil
    expect(lesson.teacher_note).to be_nil
  end

  it 'clears the cancel reason when correcting a cancelled lesson' do
    lesson = build_lesson(status: :cancelled, notes: I18n.t('app.lessons.cancelled_student_archived'))
    service = described_class.new(lesson:, params: { outcome: 'confirmed' })

    expect(service.save).to be(true)
    expect(lesson.reload.notes).to be_nil
  end
end
