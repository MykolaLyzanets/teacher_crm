# frozen_string_literal: true

module Lessons
  class CancelForTeacher
    def initialize(teacher_profile:, reason: nil)
      @teacher_profile = teacher_profile
      @reason = reason
    end

    def call
      reason = @reason.presence || I18n.t('app.lessons.cancelled_teacher_archived')
      Teachers::UpcomingLessons.relation(teacher_profile).find_each do |lesson|
        lesson.update!(
          status: :cancelled,
          notes: reason,
          attendance: :pending,
          actual_duration_minutes: nil,
          teacher_note: nil,
          student_progress_note: nil
        )
      end
    end

    private

    attr_reader :teacher_profile
  end
end
