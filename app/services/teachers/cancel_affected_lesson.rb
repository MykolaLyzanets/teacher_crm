# frozen_string_literal: true

module Teachers
  class CancelAffectedLesson
    def initialize(lesson:, absence:, actor: nil)
      @lesson = lesson
      @absence = absence
      @actor = actor
    end

    def call
      if !lesson.confirmed?
        return { ok: false, message: I18n.t('app.lessons.not_confirmed', default: 'Lesson is not active') }
      end

      if !lesson_in_absence?(lesson)
        return { ok: false, message: I18n.t('app.teachers.absence_cancel_lesson_invalid') }
      end

      lesson.substitute_assignment = true
      note = I18n.t(
        'app.teachers.absence_cancel_lesson_note',
        reason: absence_reason_label
      )
      lesson.assign_attributes(
        status: :cancelled,
        attendance: :pending,
        actual_duration_minutes: nil,
        teacher_note: nil,
        student_progress_note: nil,
        notes: note,
        cancelled_by_id: actor&.id,
        teacher_absence_id: nil,
        substitution_status: nil,
        original_teacher_id: nil
      )

      if lesson.save
        return { ok: true }
      end

      { ok: false, message: lesson.errors.full_messages.to_sentence }
    end

    private

    attr_reader :lesson, :absence, :actor

    def lesson_in_absence?(lesson)
      return true if lesson.teacher_absence_id == absence.id

      Teachers::AbsenceAffectedLessons.new(
        absence: absence,
        workspace_teachers_scope: TeacherProfile.where(workspace_id: absence.teacher_profile.workspace_id)
      ).call[:lessons].any? { |row| row[:id].to_i == lesson.id }
    end

    def absence_reason_label
      if absence.absence_other? && absence.reason_detail.present?
        return absence.reason_detail
      end

      I18n.t("app.teachers.absence_types.#{absence.absence_type}", default: absence.absence_type.to_s.humanize)
    end
  end
end
