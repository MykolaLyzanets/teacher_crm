# frozen_string_literal: true

module Lessons
  class OccurrenceDates
    WEEKDAY_NAMES = %w[Sunday Monday Tuesday Wednesday Thursday Friday Saturday].freeze
    MAX_WEEKLY = 52
    MAX_CUSTOM = 60

    def self.call(date:, repeat:, repeat_end: nil, weekdays: [])
      new(date:, repeat:, repeat_end:, weekdays:).dates
    end

    def initialize(date:, repeat:, repeat_end: nil, weekdays: [])
      @start = parse_date(date)
      @repeat = repeat.to_s
      @finish = parse_date(repeat_end)
      @weekdays = Array(weekdays).map(&:to_s)
    end

    def dates
      return [] if @start.blank?
      return [@start] if @repeat.blank? || @repeat == 'none' || @finish.blank?

      @repeat == 'custom' ? custom_dates : stepped_dates
    end

    private

    def stepped_dates
      step = @repeat == 'biweekly' ? 14 : 7
      cursor = @start
      dates = []
      while cursor <= @finish && dates.size < MAX_WEEKLY
        dates << cursor
        cursor += step
      end
      dates
    end

    def custom_dates
      wanted = (@weekdays.presence || [WEEKDAY_NAMES[@start.wday]]).to_set
      cursor = @start
      dates = []
      while cursor <= @finish && dates.size < MAX_CUSTOM
        dates << cursor if wanted.include?(WEEKDAY_NAMES[cursor.wday])
        cursor += 1
      end
      dates.presence || [@start]
    end

    def parse_date(value)
      return value if value.is_a?(Date)
      return if value.blank?

      Date.iso8601(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end
  end
end
