# frozen_string_literal: true

module TeacherAvailability
  WEEK_DAYS = %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].freeze

  module_function

  def parse_slots(raw)
    data = raw.is_a?(String) ? JSON.parse(raw) : raw
    return [] unless data.is_a?(Array)

    data.filter_map do |row|
      next if row.blank?

      h = row.with_indifferent_access
      lesson_type_id = h[:lessonTypeId].to_s.presence || 'any'
      {
        'id' => h[:id].to_s.presence || "slot-#{SecureRandom.hex(4)}",
        'day' => h[:day].to_s,
        'startTime' => h[:startTime].to_s,
        'endTime' => h[:endTime].to_s,
        'lessonType' => 'any',
        'lessonTypeId' => lesson_type_id,
        'format' => h[:format].to_s.presence || 'any'
      }
    end
  rescue JSON::ParserError
    []
  end

  def legacy_slots_from_profile(profile)
    days = Array(profile.working_days)
    format = legacy_format(Array(profile.lesson_formats))
    days.map do |day|
      hours = Array(profile.working_hours).find { |row| row['day'] == day || row[:day] == day }
      {
        'id' => "slot-legacy-#{profile.id}-#{day}",
        'day' => day,
        'startTime' => hours&.dig('startTime') || hours&.dig(:startTime) || '00:00',
        'endTime' => hours&.dig('endTime') || hours&.dig(:endTime) || '23:59',
        'lessonType' => 'any',
        'lessonTypeId' => 'any',
        'format' => format
      }
    end
  end

  def slots_for_form(profile)
    slots = Array(profile.availability_slots)
    return sort_slots(slots) if slots.any?

    legacy_slots_from_profile(profile)
  end

  def derive_legacy(slots)
    slots = sort_slots(slots)
    working_days = WEEK_DAYS.select { |day| slots.any? { |slot| slot['day'] == day } }
    working_hours = working_days.map do |day|
      day_slots = slots_for_day(slots, day)
      end_time = day_slots.map { |slot| slot['endTime'] }.max_by { |time| minutes_of(time) }
      {
        'day' => day,
        'startTime' => day_slots.first['startTime'],
        'endTime' => end_time
      }
    end
    formats = slots.map { |slot| slot['format'] }.uniq
    lesson_formats =
      if formats.include?('any') || (formats.include?('online') && formats.include?('in_person'))
        %w[online in_person]
      elsif formats.include?('online')
        ['online']
      elsif formats.include?('in_person')
        ['in_person']
      else
        []
      end
    { working_days:, working_hours:, lesson_formats: }
  end

  def sort_slots(slots)
    slots.sort_by do |slot|
      [WEEK_DAYS.index(slot['day']) || 99, minutes_of(slot['startTime']), minutes_of(slot['endTime'])]
    end
  end

  def slots_for_day(slots, day)
    sort_slots(slots.select { |slot| slot['day'] == day })
  end

  def minutes_of(time)
    h, m = time.to_s.split(':').map(&:to_i)
    (h || 0) * 60 + (m || 0)
  end

  def timeline_bounds(slots)
    start_min = 8 * 60
    end_min = 20 * 60
    Array(slots).each do |row|
      slot = row.with_indifferent_access
      start_t = minutes_of(slot[:startTime])
      end_t = minutes_of(slot[:endTime])
      next if end_t <= start_t

      start_min = [start_min, (start_t / 60) * 60].min
      end_min = [end_min, ((end_t + 59) / 60) * 60].max
    end
    { 'start' => start_min, 'end' => end_min }
  end

  def total_slot_minutes(slots)
    Array(slots).sum do |row|
      slot = row.with_indifferent_access
      start_t = minutes_of(slot[:startTime])
      end_t = minutes_of(slot[:endTime])
      [end_t - start_t, 0].max
    end
  end

  def legacy_format(formats)
    online = formats.include?('online')
    in_person = formats.include?('in_person')
    return 'any' if formats.include?('hybrid') || (online && in_person)
    return 'online' if online
    return 'in_person' if in_person

    'any'
  end
end
