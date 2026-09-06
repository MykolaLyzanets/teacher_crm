# frozen_string_literal: true

module Lessons
  class Schedule
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(teacher_profile:, params:, skip_conflicts: false, override: false)
      @teacher_profile = teacher_profile
      @params = params.to_h.with_indifferent_access
      @skip_conflicts = skip_conflicts
      @override = override && !skip_conflicts
      @lessons = []
      @skipped_dates = []
      @errors = ActiveModel::Errors.new(self)
    end

    attr_reader :lessons, :skipped_dates, :errors

    def save
      return false unless valid_intent?

      dates = occurrence_dates
      if dates.empty?
        errors.add(:base, :no_occurrences)
        return false
      end

      persist(dates)
      errors.empty? && @lessons.any?
    end

    def lesson
      @lessons.first
    end

    def error_messages
      errors.full_messages
    end

    private

    def valid_intent?
      return true unless @override
      return true if override_reason.present?

      errors.add(:override_reason, :blank)
      false
    end

    def persist(dates)
      series_id = dates.size > 1 ? SecureRandom.uuid : nil

      Lesson.transaction do
        dates.each { |date| persist_date(date, series_id) }
        if @lessons.empty?
          errors.add(:base, :all_conflicts)
          raise ActiveRecord::Rollback
        end
      end
    end

    def persist_date(date, series_id)
      return if create_date(date, series_id, allow_overlap: false)
      return if skip_overlap?(date)
      return if override_overlap?(date, series_id)

      errors.merge!(@last_create.errors) if @last_create
      raise ActiveRecord::Rollback
    end

    def create_date(date, series_id, allow_overlap:)
      params = attrs_for(date, series_id, allow_overlap:)
      service = Lessons::Create.new(teacher_profile: @teacher_profile, params:)
      if service.save
        @lessons << service.lesson
        return true
      end

      @last_create = service
      false
    end

    def skip_overlap?(date)
      return false unless @skip_conflicts && overlap_error?

      @skipped_dates << date.iso8601
      true
    end

    def override_overlap?(date, series_id)
      return false unless @override && overlap_error?
      return true if create_date(date, series_id, allow_overlap: true)

      errors.merge!(@last_create.errors)
      false
    end

    def overlap_error?
      @last_create&.overlap_error?
    end

    def attrs_for(date, series_id, allow_overlap:)
      @params.merge(date: date.iso8601, series_id:).tap do |attrs|
        next unless allow_overlap

        attrs[:allow_overlap] = true
        attrs[:override_reason] = override_reason
      end
    end

    def occurrence_dates
      Lessons::OccurrenceDates.call(
        date: @params[:date],
        repeat: @params[:repeat],
        repeat_end: @params[:repeat_end],
        weekdays: @params[:weekdays]
      )
    end

    def override_reason
      @params[:override_reason].to_s.strip.presence
    end
  end
end
