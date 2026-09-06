# frozen_string_literal: true

module Lessons
  class RecordOutcome
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    OUTCOMES = %w[completed cancelled confirmed].freeze
    RECORDED_ATTENDANCE = %w[present late absent].freeze

    def initialize(lesson:, params:)
      @lesson = lesson
      @params = params.to_h.with_indifferent_access
    end

    attr_reader :lesson, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      outcome = @params[:outcome].to_s
      unless OUTCOMES.include?(outcome)
        errors.add(:base, :invalid_outcome)
        return false
      end

      ok = case outcome
           when 'completed' then complete
           when 'cancelled' then cancel
           else correct
           end
      return false unless ok
      return true if @lesson.save

      errors.merge!(@lesson.errors)
      false
    end

    def error_messages
      (errors.full_messages + Array(lesson&.errors&.full_messages)).uniq
    end

    private

    def complete
      unless @lesson.confirmed?
        errors.add(:base, :not_confirmed)
        return false
      end

      attendance = @params[:attendance].to_s
      unless RECORDED_ATTENDANCE.include?(attendance)
        errors.add(:attendance, :blank)
        return false
      end

      @lesson.assign_attributes(
        status: :completed,
        attendance:,
        actual_duration_minutes: duration_minutes,
        teacher_note: text_value(:teacher_note, :teacherNote),
        student_progress_note: text_value(:student_progress_note, :studentProgressNote)
      )
      true
    end

    def cancel
      unless @lesson.confirmed?
        errors.add(:base, :not_confirmed)
        return false
      end

      @lesson.assign_attributes(
        status: :cancelled,
        attendance: :pending,
        actual_duration_minutes: nil,
        teacher_note: nil,
        student_progress_note: nil,
        notes: text_value(:notes) || I18n.t('app.lessons.cancelled_manual')
      )
      true
    end

    def correct
      unless @lesson.completed? || @lesson.cancelled?
        errors.add(:base, :not_recorded)
        return false
      end

      attrs = {
        status: :confirmed,
        attendance: :pending,
        actual_duration_minutes: nil,
        teacher_note: nil,
        student_progress_note: nil
      }
      attrs[:notes] = nil if @lesson.cancelled?
      @lesson.assign_attributes(attrs)
      true
    end

    def duration_minutes
      raw = first_value(:actual_duration_minutes, :actualDurationMinutes)
      return if raw.blank?

      Integer(raw)
    rescue ArgumentError, TypeError
      raw
    end

    def text_value(*keys)
      first_value(*keys).to_s.strip.presence
    end

    def first_value(*keys)
      keys.lazy.map { |key| @params[key] }.find { |value| !value.nil? }
    end
  end
end
