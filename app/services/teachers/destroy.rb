# frozen_string_literal: true

module Teachers
  class Destroy
    def initialize(teacher_profile:, cancel_lessons: false)
      @teacher_profile = teacher_profile
      @cancel_lessons = cancel_lessons
    end

    def call
      TeacherProfile.transaction do
        if @cancel_lessons
          Lessons::CancelForTeacher.new(teacher_profile: @teacher_profile).call
        end
        @teacher_profile.update!(status: :archived)
      end
    end

  end
end
