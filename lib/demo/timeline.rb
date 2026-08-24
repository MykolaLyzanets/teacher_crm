# frozen_string_literal: true

module Demo
  module Timeline
    module_function

    def lessons
      Catalog.lessons.map { |lesson| shift_record(lesson, %i[date]) }
    rescue ArgumentError, TypeError
      Catalog.lessons
    end

    def homework
      Catalog.homework.map do |item|
        shift_record(item, %i[assignedDate dueDate resubmissionDueDate], %i[submittedAt reviewedAt])
      end
    end

    def materials
      Catalog.materials.map { |item| shift_record(item, [], %i[sharedAt]) }
    end

    def date_offset
      dates = Catalog.lessons.filter_map do |lesson|
        Date.iso8601(lesson[:date].to_s)
      rescue ArgumentError, TypeError
        nil
      end
      return 0 if dates.empty?

      Date.current - dates.min
    end

    def shift_date(value)
      return value if value.blank?

      (Date.iso8601(value.to_s) + date_offset).iso8601
    rescue ArgumentError, TypeError
      value
    end

    def shift_time(value)
      return value if value.blank?

      (Time.iso8601(value.to_s) + date_offset.days).iso8601
    rescue ArgumentError, TypeError
      value
    end

    def shift_record(record, date_keys, time_keys = [])
      next_record = record.deep_dup
      date_keys.each { |key| next_record[key] = shift_date(next_record[key]) if next_record[key].present? }
      time_keys.each { |key| next_record[key] = shift_time(next_record[key]) if next_record[key].present? }
      if next_record[:submission].is_a?(Hash)
        next_record[:submission] = shift_record(next_record[:submission], [], %i[submittedAt])
      end
      next_record
    end
  end
end
