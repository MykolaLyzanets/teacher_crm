# frozen_string_literal: true

module Teachers
  class UpdateStatus
    def initialize(teacher_profile:, status:)
      @teacher_profile = teacher_profile
      @status = status.to_s
      @error_messages = []
    end

    attr_reader :teacher_profile, :error_messages

    def save
      if !TeacherProfile.statuses.key?(@status)
        @error_messages << I18n.t('app.teachers.select_status')
        return false
      end

      teacher_profile.status = @status
      if !teacher_profile.save
        @error_messages = teacher_profile.errors.full_messages
        return false
      end

      true
    end

    def became_archived?
      teacher_profile.saved_change_to_status? && teacher_profile.archived?
    end
  end
end
