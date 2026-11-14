# frozen_string_literal: true

module Teachers
  class RescheduleAffectedLesson
    def initialize(lesson:, absence:, teacher:, date:, start_time:, end_time:)
      @lesson = lesson
      @absence = absence
      @teacher = teacher
      @date = date
      @start_time = start_time
      @end_time = end_time
    end

    def call
      if date.blank? || start_time.blank? || end_time.blank?
        return failure(I18n.t('app.teachers.reschedule_invalid_datetime'))
      end

      starts_at, ends_at = build_times
      if starts_at.nil?
        return failure(I18n.t('app.teachers.reschedule_invalid_datetime'))
      end
      if ends_at <= starts_at
        return failure(I18n.t('app.teachers.reschedule_end_before_start'))
      end

      if teacher_absent_on_date?(teacher.id, date)
        return failure(I18n.t('app.teachers.reschedule_teacher_absent', name: teacher.display_label))
      end

      if teacher_overlap?(teacher.id, starts_at, ends_at)
        return failure(I18n.t('app.teachers.reschedule_teacher_booked'))
      end

      conflict = student_overlap(starts_at, ends_at)
      if conflict.present?
        return failure(
          I18n.t(
            'app.teachers.reschedule_student_conflict',
            name: conflict[:student_name],
            range: conflict[:range]
          )
        )
      end

      if !slot_fits?(teacher, starts_at, ends_at)
        return failure(I18n.t('app.teachers.reschedule_outside_availability'))
      end

      original_id = lesson.original_teacher_id || absence.teacher_id
      lesson.substitute_assignment = true
      attrs = {
        starts_at:,
        ends_at:,
        teacher_id: teacher.id,
        original_teacher_id: original_id,
        teacher_absence_id: absence.id,
        substitution_status: :rescheduled
      }
      if lesson.has_attribute?(:rescheduled_from)
        prior = lesson[:rescheduled_from]
        attrs[:rescheduled_from] = prior.presence || {
          'starts_at' => lesson.starts_at.iso8601,
          'ends_at' => lesson.ends_at.iso8601
        }
      end
      lesson.assign_attributes(attrs)

      if lesson.save
        return { ok: true, lesson: lesson }
      end

      failure(lesson.errors.full_messages.to_sentence)
    end

    def self.check(lesson:, teacher:, date:, start_time:, end_time:)
      return { kind: 'incomplete' } if date.blank? || start_time.blank? || end_time.blank?

      starts_at, ends_at = build_times_for(teacher, date, start_time, end_time)
      return { kind: 'invalid' } if starts_at.nil? || ends_at <= starts_at

      if TeacherAbsence.covers_date?(teacher.id, date)
        return {
          kind: 'warning',
          message: I18n.t('app.teachers.reschedule_teacher_absent_warning')
        }
      end

      overlap = Lesson.confirmed
                    .where(teacher_id: teacher.id)
                    .overlapping(starts_at, ends_at)
                    .where.not(id: lesson.id)
                    .first
      if overlap.present?
        zone = teacher.time_zone
        local_start = overlap.starts_at.in_time_zone(zone)
        local_end = overlap.ends_at.in_time_zone(zone)
        range = "#{local_start.strftime('%H:%M')}–#{local_end.strftime('%H:%M')}"
        return {
          kind: 'warning',
          message: I18n.t('app.teachers.reschedule_teacher_booked_warning', range: range)
        }
      end

      if !slot_fits?(teacher, starts_at, ends_at)
        return {
          kind: 'warning',
          message: I18n.t('app.teachers.reschedule_outside_availability_warning')
        }
      end

      { kind: 'available', message: I18n.t('app.teachers.reschedule_teacher_available') }
    end

    def self.build_times_for(teacher, date, start_time, end_time)
      zone = teacher.time_zone || TeacherProfile::DEFAULT_TIMEZONE
      tz = ActiveSupport::TimeZone[zone] || Time.zone
      start_parts = start_time.to_s.split(':').map(&:to_i)
      end_parts = end_time.to_s.split(':').map(&:to_i)
      starts_at = tz.local(date.year, date.month, date.day, start_parts[0] || 0, start_parts[1] || 0)
      ends_at = tz.local(date.year, date.month, date.day, end_parts[0] || 0, end_parts[1] || 0)
      [starts_at, ends_at]
    rescue ArgumentError
      [nil, nil]
    end

    def self.slot_fits?(teacher, starts_at, ends_at)
      slots = TeacherAvailability.slots_for_form(teacher)
      return true if slots.empty?

      zone = teacher.time_zone || TeacherProfile::DEFAULT_TIMEZONE
      local_start = starts_at.in_time_zone(zone)
      local_end = ends_at.in_time_zone(zone)
      day = local_start.strftime('%A')
      start_m = TeacherAvailability.minutes_of(local_start.strftime('%H:%M'))
      end_m = TeacherAvailability.minutes_of(local_end.strftime('%H:%M'))
      day_slots = slots.select { |slot| slot['day'] == day }
      return false if day_slots.empty?

      day_slots.any? do |slot|
        slot_start = TeacherAvailability.minutes_of(slot['startTime'])
        slot_end = TeacherAvailability.minutes_of(slot['endTime'])
        start_m >= slot_start && end_m <= slot_end
      end
    end

    private

    attr_reader :lesson, :absence, :teacher, :date, :start_time, :end_time

    def failure(message)
      { ok: false, message: message }
    end

    def build_times
      self.class.build_times_for(teacher, date, start_time, end_time)
    end

    def teacher_absent_on_date?(teacher_id, lesson_date)
      TeacherAbsence.covers_date?(teacher_id, lesson_date)
    end

    def teacher_overlap?(teacher_id, starts_at, ends_at)
      Lesson.confirmed
        .where(teacher_id: teacher_id)
        .overlapping(starts_at, ends_at)
        .where.not(id: lesson.id)
        .exists?
    end

    def student_overlap(starts_at, ends_at)
      student = lesson.students.first
      return if student.blank?

      conflict = Lesson.confirmed
                      .joins(:students)
                      .where(students: { id: student.id })
                      .overlapping(starts_at, ends_at)
                      .where.not(id: lesson.id)
                      .first
      return if conflict.blank?

      zone = conflict.teacher_profile&.time_zone || TeacherProfile::DEFAULT_TIMEZONE
      local_start = conflict.starts_at.in_time_zone(zone)
      local_end = conflict.ends_at.in_time_zone(zone)
      {
        student_name: student.display_label,
        range: "#{local_start.strftime('%H:%M')}–#{local_end.strftime('%H:%M')}"
      }
    end

    def slot_fits?(teacher_row, starts_at, ends_at)
      self.class.slot_fits?(teacher_row, starts_at, ends_at)
    end
  end
end
