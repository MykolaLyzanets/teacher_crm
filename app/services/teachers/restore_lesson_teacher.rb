# frozen_string_literal: true

module Teachers
  class RestoreLessonTeacher
    def initialize(lesson:)
      @lesson = lesson
    end

    def call
      if lesson.original_teacher_id.blank?
        return { ok: false, message: I18n.t('app.teachers.absence_restore_none') }
      end

      if !lesson.substitution_substitute_assigned?
        return { ok: false, message: I18n.t('app.teachers.absence_restore_invalid') }
      end

      lesson.substitute_assignment = true
      lesson.assign_attributes(
        teacher_id: lesson.original_teacher_id,
        original_teacher_id: nil,
        substitution_status: nil
      )

      if lesson.save
        return { ok: true, lesson: lesson }
      end

      { ok: false, message: lesson.errors.full_messages.to_sentence }
    end

    private

    attr_reader :lesson
  end
end
