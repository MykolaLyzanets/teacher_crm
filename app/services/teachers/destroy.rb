# frozen_string_literal: true

module Teachers
  class Destroy
    def initialize(teacher_profile:)
      @teacher_profile = teacher_profile
    end

    def call
      teacher_profile.update!(status: :archived)
    end

    private

    attr_reader :teacher_profile
  end
end
