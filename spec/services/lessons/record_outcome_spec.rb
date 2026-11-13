# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lessons::RecordOutcome do
  def ensure_default_currency!
    Currency.where(default: true).where.not(code: 'UAH').update_all(default: false)
    Currency.find_or_create_by!(code: 'UAH') do |currency|
      currency.name = 'Ukrainian hryvnia'
      currency.symbol = '₴'
      currency.subunit_to_unit = 100
      currency.active = true
      currency[:default] = true
    end
  end

  def build_lesson(**attrs)
    create(:lesson, **attrs)
  end

  before { ensure_default_currency! }

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

  it 'returns success without changes when completing an already completed lesson' do
    lesson = build_lesson(status: :completed, attendance: :present, actual_duration_minutes: 60)
    service = described_class.new(
      lesson:,
      params: { outcome: 'completed', attendance: 'late', actualDurationMinutes: 45 }
    )

    expect(service.save).to be(true)
    lesson.reload
    expect(lesson).to be_attendance_present
    expect(lesson.actual_duration_minutes).to eq(60)
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

  describe 'finance' do
    it 'creates lesson charges and teacher earnings when completing' do
      lesson = build_lesson(price_cents: 3000)
      lesson.teacher_profile.update!(compensation_percent: 50)
      student = lesson.students.first

      expect(
        described_class.new(
          lesson:,
          params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
        ).save
      ).to be(true)

      charge = StudentTransaction.transaction_lesson_charge.find_by!(lesson_id: lesson.id, student_profile: student)
      expect(charge.amount_cents).to eq(-3000)
      earning = TeacherEarning.find_by!(lesson_id: lesson.id, student_profile: student)
      expect(earning.earning_cents).to eq(1500)
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(-3000)
    end

    it 'creates one charge per student on group lessons' do
      teacher = create(:teacher_profile)
      subject = create(:subject, teacher_profile: teacher)
      lesson_type = create(:lesson_type, :group, subject:, price_cents: 2000)
      students = create_list(:student_profile, 2, workspace: teacher.workspace, teacher_profile: teacher)
      lesson = build(
        :lesson,
        teacher: teacher,
        subject:,
        lesson_type:,
        with_student: false,
        price_cents: 2000
      )
      lesson.students = students
      lesson.save!

      expect(
        described_class.new(
          lesson:,
          params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
        ).save
      ).to be(true)

      expect(StudentTransaction.transaction_lesson_charge.where(lesson_id: lesson.id).count).to eq(2)
      expect(TeacherEarning.where(lesson_id: lesson.id).count).to eq(2)
    end

    it 'does not create charges for excused completion' do
      lesson = build_lesson(price_cents: 2500)
      described_class.new(
        lesson:,
        params: { outcome: 'completed', attendance: 'excused', actualDurationMinutes: 60 }
      ).save

      expect(StudentTransaction.where(lesson_id: lesson.id)).to be_empty
      expect(TeacherEarning.where(lesson_id: lesson.id)).to be_empty
    end

    it 'creates cancellation charges when charge_decision is charge' do
      lesson = build_lesson(price_cents: 2500)
      described_class.new(
        lesson:,
        params: { outcome: 'cancelled', reason_code: 'student_late', charge_decision: 'charge' }
      ).save

      expect(StudentTransaction.transaction_cancellation_charge.where(lesson_id: lesson.id)).to exist
      expect(TeacherEarning.earning_cancellation_charged.where(lesson_id: lesson.id)).to exist
    end

    it 'does not create charges when cancellation has no_charge' do
      lesson = build_lesson(price_cents: 2500)
      described_class.new(
        lesson:,
        params: { outcome: 'cancelled', reason_code: 'teacher_cancelled', charge_decision: 'no_charge' }
      ).save

      expect(StudentTransaction.where(lesson_id: lesson.id)).to be_empty
    end

    it 'does not duplicate finance records on repeated completion' do
      lesson = build_lesson(price_cents: 2000)
      params = { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
      described_class.new(lesson:, params:).save
      lesson.reload
      expect(described_class.new(lesson:, params:).save).to be(true)

      expect(StudentTransaction.transaction_lesson_charge.where(lesson_id: lesson.id).count).to eq(1)
    end

    it 'does not duplicate finance records on repeated cancellation' do
      lesson = build_lesson(price_cents: 2000)
      params = { outcome: 'cancelled', reason_code: 'technical', charge_decision: 'charge' }
      described_class.new(lesson:, params:).save
      lesson.reload
      described_class.new(lesson:, params:).save

      expect(StudentTransaction.transaction_cancellation_charge.where(lesson_id: lesson.id).count).to eq(1)
    end

    it 'skips charges when price is zero' do
      lesson = build_lesson(price_cents: 0)
      described_class.new(
        lesson:,
        params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
      ).save

      expect(StudentTransaction.where(lesson_id: lesson.id)).to be_empty
    end

    it 'rolls back lesson save when finance fails' do
      lesson = build_lesson(price_cents: 2500)
      allow(Finance::TakeLessonPayment).to receive(:new).and_wrap_original do |method, **kwargs|
        service = method.call(**kwargs)
        allow(service).to receive(:save).with(use_transaction: false).and_return(false)
        allow(service).to receive(:errors).and_return(ActiveModel::Errors.new(service))
        service.errors.add(:base, 'finance failed')
        service
      end

      expect(
        described_class.new(
          lesson:,
          params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
        ).save
      ).to be(false)
      expect(lesson.reload).to be_confirmed
      expect(StudentTransaction.where(lesson_id: lesson.id)).to be_empty
    end

    it 'reverses charges when correcting a completed lesson' do
      lesson = build_lesson(price_cents: 3000)
      student = lesson.students.first
      described_class.new(
        lesson:,
        params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
      ).save

      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(-3000)
      lesson.reload
      expect(described_class.new(lesson:, params: { outcome: 'confirmed' }).save).to be(true)

      expect(lesson.reload).to be_confirmed
      expect(Finance::StudentBalance.new(student_profile: student).balance_cents).to eq(0)
      charge = StudentTransaction.transaction_lesson_charge.find_by!(lesson_id: lesson.id)
      expect(StudentTransaction.transaction_charge_reversal.where(related_transaction_id: charge.id)).to exist
      expect(TeacherEarning.find_by!(lesson_id: lesson.id).reversed_at).to be_present
    end

    it 'does not delete the original lesson charge' do
      lesson = build_lesson(price_cents: 2000)
      described_class.new(
        lesson:,
        params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
      ).save
      charge_id = StudentTransaction.transaction_lesson_charge.find_by!(lesson_id: lesson.id).id
      lesson.reload
      described_class.new(lesson:, params: { outcome: 'confirmed' }).save

      expect(StudentTransaction.exists?(charge_id)).to be(true)
    end

    it 'does not duplicate undo rows when undo runs twice' do
      lesson = build_lesson(price_cents: 2000)
      described_class.new(
        lesson:,
        params: { outcome: 'completed', attendance: 'present', actualDurationMinutes: 60 }
      ).save
      charge = StudentTransaction.transaction_lesson_charge.find_by!(lesson_id: lesson.id)
      actor = lesson.teacher_profile.workspace.owner

      2.times do
        Finance::UndoTransaction.new(transaction: charge, created_by: actor).save(use_transaction: false)
      end

      expect(StudentTransaction.transaction_charge_reversal.where(related_transaction_id: charge.id).count).to eq(1)
    end

    it 'rolls back lesson correction when undo fails' do
      lesson = build_lesson(
        status: :completed,
        attendance: :present,
        actual_duration_minutes: 60,
        price_cents: 2500,
        charge_decision: :charge,
        charged_cents: 2500
      )
      StudentTransaction.create!(
        workspace: lesson.teacher_profile.workspace,
        student_profile: lesson.students.first,
        lesson:,
        currency: Finance::FinanceHelper.default_currency!,
        transaction_type: :lesson_charge,
        amount_cents: -2500,
        status: :confirmed,
        created_by: lesson.teacher_profile.workspace.owner,
        confirmed_by: lesson.teacher_profile.workspace.owner,
        confirmed_at: Time.current
      )

      allow(Finance::UndoTransaction).to receive(:new).and_wrap_original do |method, **kwargs|
        service = method.call(**kwargs)
        allow(service).to receive(:save).with(use_transaction: false).and_return(false)
        allow(service).to receive(:errors).and_return(ActiveModel::Errors.new(service))
        service.errors.add(:base, 'undo failed')
        service
      end

      expect(described_class.new(lesson:, params: { outcome: 'confirmed' }).save).to be(false)
      expect(lesson.reload).to be_completed
    end
  end
end
