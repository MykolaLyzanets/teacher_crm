# frozen_string_literal: true

module Students
  class Destroy
    def initialize(student_profile:)
      @student_profile = student_profile
    end

    def call
      StudentProfile.transaction do
        student_profile.update!(status: :archived)
        Lessons::CancelForStudent.new(student_profile:, cause: 'archived').call
      end
    end

    private

    attr_reader :student_profile
  end
end
