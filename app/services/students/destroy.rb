# frozen_string_literal: true

module Students
  class Destroy
    def initialize(student_profile:)
      @student_profile = student_profile
    end

    def call
      student_profile.update!(deleted_at: Time.current)
    end

    private

    attr_reader :student_profile
  end
end
