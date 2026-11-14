# frozen_string_literal: true

module Teachers
  class AssignSubstitute
    def initialize(lesson:, absence:, substitute:)
      @lesson = lesson
      @absence = absence
      @substitute = substitute
    end

    def call
      if lesson.teacher_profile.workspace_id != substitute.workspace_id
        return failure(I18n.t('app.teachers.absence_substitute_workspace_mismatch'))
      end

      candidates = SubstituteCandidates.for_lesson(
        lesson,
        absent_teacher_id: absence.teacher_id,
        teachers_scope: TeacherProfile.where(workspace_id: substitute.workspace_id),
        absence: absence
      )
      if candidates.none? { |row| row.id == substitute.id }
        return failure(I18n.t('app.teachers.absence_substitute_unavailable'))
      end

      original_id = lesson.original_teacher_id || lesson.teacher_id
      lesson.substitute_assignment = true
      lesson.assign_attributes(
        teacher_id: substitute.id,
        original_teacher_id: original_id,
        teacher_absence_id: absence.id,
        substitution_status: :substitute_assigned
      )

      if lesson.save
        return { ok: true, lesson: lesson }
      end

      failure(lesson.errors.full_messages.to_sentence)
    end

    private

    attr_reader :lesson, :absence, :substitute

    def failure(message)
      { ok: false, message: message }
    end
  end
end
