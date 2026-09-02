# frozen_string_literal: true

module Students
  class Destroy
    def initialize(student_profile:)
      @student_profile = student_profile
    end

    def call
      student_profile.update!(status: :archived)
    end

    private

    attr_reader :student_profile
  end
end
