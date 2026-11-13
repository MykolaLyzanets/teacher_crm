# frozen_string_literal: true

module Lessons
  class NextForStudent
    def self.call(student_profile)
      new(student_profile:).call
    end

    def initialize(student_profile:)
      @student_profile = student_profile
    end

    def call
      return if student_profile.blank?
      return if !student_profile.is_a?(StudentProfile)

      Lesson.confirmed
            .joins(:students)
            .where(student_profiles: { id: student_profile.id })
            .where('starts_at >= ?', Time.current)
            .order(:starts_at)
            .includes(:teacher_profile, :subject, :lesson_type, :students)
            .first
            &.as_catalog
    end

    private

    attr_reader :student_profile
  end
end
