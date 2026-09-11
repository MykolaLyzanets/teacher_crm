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
    expect(lesson).to be_charge_decision_charge
    expect(lesson.charged_cents).to eq(lesson.billed_price_cents.to_i)
  end

  it 'accepts attended as present and charges the billed price' do
    lesson = build_lesson(price_cents: 2500, currency: 'EUR')
    service = described_class.new(
      lesson:,
      params: {
        outcome: 'completed',
        attendance: 'attended',
        actualDurationMinutes: 60
      }
    )

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_attendance_present
    expect(lesson).to be_charge_decision_charge
    expect(lesson.charged_cents).to eq(2500)
  end

  it 'charges the billed price for late and absent attendance' do
    %w[late absent].each do |attendance|
      lesson = build_lesson(price_cents: 2500, currency: 'EUR')
      service = described_class.new(
        lesson:,
        params: { outcome: 'completed', attendance:, actualDurationMinutes: 60 }
      )

      expect(service.save).to be(true)
      lesson.reload
      expect(lesson.attendance).to eq(attendance)
      expect(lesson).to be_charge_decision_charge
      expect(lesson.charged_cents).to eq(2500)
    end
  end

  it 'does not charge an excused completion' do
    lesson = build_lesson(price_cents: 2500, currency: 'EUR')
    service = described_class.new(
      lesson:,
      params: { outcome: 'completed', attendance: 'excused', actualDurationMinutes: 60 }
    )

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_completed
    expect(lesson).to be_attendance_excused
    expect(lesson).to be_charge_decision_no_charge
    expect(lesson.charged_cents).to eq(0)
  end

  it 'requires duration when completing a lesson' do
    lesson = build_lesson
    service = described_class.new(
      lesson:,
      params: { outcome: 'completed', attendance: 'present' }
    )

    expect(service.save).to be(false)
    expect(service.errors.details[:actual_duration_minutes]).to include(hash_including(error: :blank))
    expect(lesson.reload).to be_confirmed
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

  it 'stores the cancellation reason, actor and charge on the lesson' do
    lesson = build_lesson(price_cents: 2500, currency: 'EUR')
    actor = lesson.teacher_profile.workspace.owner

    service = described_class.new(
      lesson:,
      params: {
        outcome: 'cancelled',
        reason_code: 'student_late',
        charge_decision: 'charge',
        cancellation_note: 'Called parent',
        cancelled_by_id: actor.id
      }
    )

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson.cancellation_reason_code).to eq('student_late')
    expect(lesson.cancelled_by_id).to eq(actor.id)
    expect(lesson).to be_charge_decision_charge
    expect(lesson.charged_cents).to eq(2500)
    expect(lesson.cancellation_note).to eq('Called parent')
    expect(lesson.notes).to include(I18n.t('app.lessons.cancel_reasons.student_late'))
  end

  it 'charges the lesson type price when the lesson has no price of its own' do
    lesson = build_lesson(price_cents: nil, currency: nil)
    lesson.lesson_type.update!(price_cents: 80_000, currency: 'UAH')

    service = described_class.new(
      lesson:,
      params: { outcome: 'cancelled', reason_code: 'student_no_show', charge_decision: 'charge' }
    )

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_charge_decision_charge
    expect(lesson.charged_cents).to eq(80_000)
  end
end
