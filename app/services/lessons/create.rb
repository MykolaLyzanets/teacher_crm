# frozen_string_literal: true

module Lessons
  class Create
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(teacher_profile:, params:, lesson: nil)
      @teacher_profile = teacher_profile
      @params = params.to_h.with_indifferent_access
      @lesson = lesson
    end

    attr_reader :lesson, :errors

    def save
      build
      return false if errors.any?
      return true if @lesson.save

      errors.merge!(@lesson.errors)
      false
    rescue ActiveRecord::StatementInvalid => e
      raise unless e.cause.is_a?(PG::ExclusionViolation)

      errors.add(:base, :teacher_overlap)
      false
    end

    def error_messages
      (errors.full_messages + Array(lesson&.errors&.full_messages)).uniq
    end

    def overlap_error?
      overlap_keys = %i[teacher_overlap student_overlap]
      [errors, lesson&.errors].compact.any? do |set|
        Array(set.details[:base]).any? { |item| overlap_keys.include?(item[:error]) }
      end
    end

    private

    def build
      @errors = ActiveModel::Errors.new(self)
      students = resolve_students
      @lesson ||= Lesson.new
      @lesson.assign_attributes(lesson_attributes)
      @lesson.students = students
      @lesson
    end

    def lesson_attributes
      {
        teacher_profile: @teacher_profile,
        subject:,
        lesson_type:,
        starts_at:,
        ends_at:,
        status: @params[:status].presence || @lesson.status.presence || :confirmed,
        location: @params[:location].presence || @lesson.location.presence || :online
      }.tap do |attrs|
        attrs[:meeting_link] = @params[:meeting_link].to_s.strip.presence if @params.key?(:meeting_link)
        attrs[:location_text] = @params[:location_text].to_s.strip.presence if @params.key?(:location_text)
        attrs[:notes] = @params[:notes].to_s.strip.presence if @params.key?(:notes)
        attrs[:price_cents] = coerce_price_cents if @params.key?(:price_cents)
        attrs[:currency] = @params[:currency].presence if @params.key?(:currency)
        attrs[:series_id] = @params[:series_id] if @params[:series_id].present?
        apply_overlap_override(attrs)
      end
    end

    def apply_overlap_override(attrs)
      return unless ActiveModel::Type::Boolean.new.cast(@params[:allow_overlap])

      attrs[:allow_overlap] = true
      attrs[:override_reason] = @params[:override_reason].to_s.strip.presence
    end

    def coerce_price_cents
      raw = @params[:price_cents]
      return if raw.nil? || raw == ''

      Integer(raw)
    rescue ArgumentError, TypeError
      raw
    end

    def subject
      id = @params[:subject_id].presence
      Subject.find_by(id:, teacher_id: @teacher_profile.id) if id
    end

    def lesson_type
      id = @params[:lesson_type_id].presence
      LessonType.find_by(id:, subject_id: subject&.id) if id
    end

    def starts_at
      @starts_at ||= coerce_time(@params[:starts_at], @params[:start_time]) || @lesson.starts_at
    end

    def ends_at
      @ends_at ||= coerce_time(@params[:ends_at], @params[:end_time]) ||
                   @lesson.ends_at ||
                   (starts_at && lesson_type && (starts_at + lesson_type.default_duration_minutes.minutes))
    end

    def coerce_time(explicit, time_of_day)
      return explicit if explicit.is_a?(ActiveSupport::TimeWithZone)
      return parse_in_zone(explicit) if explicit.present? && !time_of_day_only?(explicit)

      combine(@params[:date], time_of_day.presence || explicit)
    end

    def parse_in_zone(value)
      case value
      when Time, DateTime
        zone.local(value.year, value.month, value.day, value.hour, value.min, value.sec)
      when Date
        zone.local(value.year, value.month, value.day)
      else
        zone.parse(value.to_s)
      end
    rescue ArgumentError, TypeError
      nil
    end

    def combine(date_value, time_value)
      return if date_value.blank? || time_value.blank?

      date = date_value.is_a?(Date) ? date_value : Date.iso8601(date_value.to_s)
      clock = time_value.respond_to?(:strftime) ? time_value.strftime('%H:%M:%S') : time_value.to_s
      zone.parse("#{date.iso8601} #{clock}")
    rescue ArgumentError, TypeError
      nil
    end

    def time_of_day_only?(value)
      value.is_a?(String) && value.match?(/\A\d{1,2}:\d{2}(:\d{2})?\z/)
    end

    def zone
      @teacher_profile.time_zone
    end

    def resolve_students
      ids = Array(@params[:student_ids]).flatten.compact_blank.map(&:to_i).uniq
      found = StudentProfile.kept.where(id: ids).index_by(&:id)
      errors.add(:base, :students_invalid) if ids.size != found.size
      ids.filter_map { |id| found[id] }
    end
  end
end
