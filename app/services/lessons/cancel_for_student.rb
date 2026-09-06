# frozen_string_literal: true

module Lessons
  class CancelForStudent
    def initialize(student_profile:, reason: nil, cause: nil)
      @student_profile = student_profile
      @reason = reason
      @cause = cause.to_s.presence
    end

    def call
      reason = @reason.presence || default_reason
      @student_profile.lessons.confirmed.find_each do |lesson|
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

    def default_reason
      paused = @cause == 'paused' || (@cause.blank? && @student_profile.paused?)
      key = paused ? 'cancelled_student_paused' : 'cancelled_student_archived'
      I18n.t("app.lessons.#{key}")
    end
  end
end
