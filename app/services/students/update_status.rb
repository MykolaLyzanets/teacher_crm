# frozen_string_literal: true

module Students
  class UpdateStatus
    def initialize(student_profile:, status:)
      @student_profile = student_profile
      @status = status.to_s
    end

    attr_reader :student_profile, :error_messages

    def save
      @error_messages = []
      unless StudentProfile.statuses.key?(@status)
        @error_messages << I18n.t('app.students.select_status')
        return false
      end

      student_profile.status = @status
      unless student_profile.save
        @error_messages = student_profile.errors.full_messages
        return false
      end

      cancel_lessons_if_inactive
      true
    end

    def became_archived?
      student_profile.saved_change_to_status? && student_profile.archived?
    end

    private

    def cancel_lessons_if_inactive
      return unless student_profile.saved_change_to_status?
      return unless student_profile.paused? || student_profile.archived?

      Lessons::CancelForStudent.new(student_profile:, cause: student_profile.status).call
    end
  end
end
