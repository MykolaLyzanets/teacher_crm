# frozen_string_literal: true

module TeachersHelper
  STATUS_LABELS = {
    'active' => 'Active',
    'invited' => 'Invited',
    'on_leave' => 'On leave',
    'inactive' => 'Inactive',
    'archived' => 'Archived'
  }.freeze

  STATUS_TONES = {
    'active' => 'olive',
    'absent' => 'amber',
    'inactive' => 'rose',
    'archived' => 'rose'
  }.freeze

  TEACHER_FILTER_STATUSES = %w[active absent inactive archived].freeze
  TEACHER_FORM_STATUSES = %w[active inactive].freeze
  AFFECTED_LESSON_TABS = %w[all needs_replacement substitute_assigned rescheduled].freeze

  ROLE_I18N = {
    'owner' => 'role_owner',
    'teacher' => 'role_teacher',
    'admin' => 'role_admin',
    'student' => 'role_teacher'
  }.freeze

  LANGUAGE_LABELS = {
    'en' => 'English',
    'es' => 'Spanish',
    'fr' => 'French',
    'de' => 'German',
    'zh' => 'Chinese',
    'ja' => 'Japanese',
    'ko' => 'Korean',
    'pt' => 'Portuguese',
    'ar' => 'Arabic',
    'ru' => 'Russian'
  }.freeze

  CALENDAR_COLORS = TeacherCalendarColors.stringify_keys.freeze

  LESSON_DURATION_PRESETS = [30, 45, 60, 90].freeze
  SUBJECTS = %w[English Mathematics Science Physics IELTS Spanish Music].freeze
  LANGUAGES = LANGUAGE_LABELS.to_a
  TAGS = ['IELTS', 'Online', 'Group lessons', 'Exam preparation', 'Beginners', 'Advanced'].freeze
  WEEK_DAYS = %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].freeze
  TIMEZONES = [
    'Europe/Kyiv', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'
  ].freeze

  def teacher_display_name(teacher)
    teacher = teacher.with_indifferent_access
    teacher[:displayName].presence ||
      [teacher[:firstName], teacher[:lastName]].compact_blank.join(' ').presence ||
      'Teacher'
  end

  def teacher_initials(teacher)
    parts = teacher_display_name(teacher).split(/\s+/).reject(&:blank?)
    return 'T' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def teacher_status_label(status)
    I18n.t("app.statuses.#{status}", default: status.to_s.humanize)
  end

  def teacher_status_tone(status)
    STATUS_TONES[status.to_s] || 'neutral'
  end

  def teacher_effective_status(teacher_record, absence: nil, date: Time.zone.today)
    status = teacher_record.status.to_s
    if status == 'archived'
      return %w[archived]
    end
    if status == 'inactive'
      return %w[inactive]
    end

    absence ||= TeacherAbsence.where(teacher_id: teacher_record.id).covering(date).first
    if absence
      return ['absent', teacher_absence_reason_label(absence)]
    end

    ['active']
  end

  def teacher_apply_display_status!(payload, teacher_record, absence: nil, date: Time.zone.today)
    display, reason = teacher_effective_status(teacher_record, absence:, date:)
    payload[:displayStatus] = display
    payload[:absenceReason] = reason
    if absence
      payload[:currentAbsence] = {
        startsOn: absence.starts_on.iso8601,
        endsOn: absence.ends_on.iso8601,
        reason: reason
      }
    end
    payload
  end

  def teacher_absence_reason_label(absence)
    if absence.absence_other? && absence.reason_detail.present?
      return absence.reason_detail
    end

    teacher_absence_type_label(absence)
  end

  def teacher_absence_covering_date(absences, date)
    absences.find { |row| row.starts_on <= date && row.ends_on >= date }
  end

  def teacher_availability_week_start
    Time.zone.today.beginning_of_week
  end

  def teacher_workspace_access_summary(teacher)
    teacher = teacher.with_indifferent_access
    if teacher[:inviteToWorkspace]
      status = teacher[:invitationStatus].presence || 'pending'
      status_label = I18n.t("app.statuses.#{status}", default: status.to_s.humanize)
      "#{I18n.t('app.teachers.invited_access')} · #{status_label}"
    else
      I18n.t('app.teachers.profile_only_access')
    end
  end

  def teacher_role_label(role)
    return t('app.teachers.profile_only') if role.blank?

    key = ROLE_I18N[role.to_s]
    key ? t("app.teachers.#{key}") : role.to_s.humanize
  end

  def teacher_color_label(id)
    t("app.teachers.color_#{id}", default: id.to_s.humanize)
  end

  def teacher_language_label(code)
    LANGUAGE_LABELS[code.to_s] || code.to_s
  end

  def teacher_calendar_color(id)
    TeacherCalendarColors.hex_for(id)
  end

  def teacher_calendar_color_key(teacher)
    teacher = teacher.with_indifferent_access
    TeacherCalendarColors.normalize_key(teacher[:calendarColor]).to_s
  end

  def teacher_search_haystack(teacher)
    teacher = teacher.with_indifferent_access
    [
      teacher[:firstName],
      teacher[:lastName],
      teacher[:displayName],
      teacher[:email],
      teacher[:jobTitle],
      Array(teacher[:subjects]).join(' ')
    ].compact.join(' ').downcase
  end

  def teacher_created_this_month?(teacher)
    created = Time.zone.parse(teacher.with_indifferent_access[:createdAt].to_s)
    created && created >= Time.zone.now.beginning_of_month
  rescue ArgumentError, TypeError
    false
  end

  def teacher_timezone_label(zone)
    readable = zone.to_s.tr('_', ' ')
    seconds = Time.current.in_time_zone(zone).utc_offset
    hours, remainder = seconds.abs.divmod(3600)
    minutes = remainder / 60
    sign = seconds.negative? ? '-' : '+'
    gmt = if seconds.zero?
            'GMT'
          elsif minutes.zero?
            "GMT#{sign}#{hours}"
          else
            "GMT#{sign}#{hours}:#{format('%02d', minutes)}"
          end
    "#{readable} (#{gmt})"
  rescue ArgumentError, TZInfo::InvalidTimezoneIdentifier
    readable
  end

  def teacher_delete_dialog_path(teacher)
    delete_dialog_teachers_path(teacher_id: teacher.with_indifferent_access[:id])
  end

  def teacher_archive_lessons_dialog_path(teacher)
    teacher_id = teacher.is_a?(Hash) ? teacher[:id] || teacher['id'] : teacher.id
    archive_lessons_dialog_teachers_path(teacher_id:)
  end

  def teacher_upcoming_lesson_label(lesson)
    zone = lesson.teacher_profile&.time_zone || TeacherProfile::DEFAULT_TIMEZONE
    local_start = lesson.starts_at.in_time_zone(zone)
    local_end = lesson.ends_at.in_time_zone(zone)
    students = lesson.students.map(&:display_label).compact_blank.join(', ')
    subject = lesson.subject&.name.presence || '—'
    time = "#{local_start.strftime('%H:%M')}–#{local_end.strftime('%H:%M')}"
    "#{I18n.l(local_start.to_date)} · #{time} · #{subject} · #{students.presence || '—'}"
  end

  def teacher_assign_dialog_path(teacher)
    assign_dialog_teachers_path(teacher_id: teacher.with_indifferent_access[:id])
  end

  def teacher_absence_dialog_path(teacher, absence_id: nil)
    teacher_id = teacher.with_indifferent_access[:id]
    params = { teacher_id: }
    params[:absence_id] = absence_id if absence_id.present?
    absence_dialog_teachers_path(params)
  end

  def teacher_offering_dialog_path(teacher_id)
    offering_dialog_teachers_path(teacher_id:)
  end

  def teacher_unassign_dialog_path(teacher, student)
    unassign_dialog_teachers_path(
      teacher_id: teacher.with_indifferent_access[:id],
      student_id: student.with_indifferent_access[:id]
    )
  end

  def teacher_dialog_turbo_data(frame)
    { turbo: true, turbo_frame: frame }
  end

  def teacher_has_students?(teacher, students)
    id = teacher.with_indifferent_access[:id].to_s
    students.any? { |s| s.with_indifferent_access[:teacherId].to_s == id }
  end

  def status_badge(label, tone: 'olive')
    tag.span(label, class: "status-badge status-badge--#{tone}")
  end

  def teacher_stats_supporting(stats, key)
    stats = stats.with_indifferent_access
    case key
    when :active
      total = stats[:totalTeachers].to_i
      return t('app.teachers.stats_none') if total.zero?

      pct = ((stats[:activeTeachers].to_f / total) * 100).round
      t('app.teachers.stats_pct', pct: pct)
    when :with_students
      count = stats[:assignedStudents].to_i
      count == 1 ? t('app.teachers.stats_students_one') : t('app.teachers.stats_students_other', count: count)
    when :lessons
      change = monthly_change_text(stats[:lessonsThisMonth], stats[:lessonsLastMonth])
      change || t('app.teachers.stats_scheduled')
    when :new
      change = monthly_change_text(stats[:newThisMonth], stats[:newLastMonth])
      change || t('app.teachers.stats_added')
    else
      t('app.teachers.stats_total_support')
    end
  end

  def monthly_change_text(current, previous)
    current = current.to_i
    previous = previous.to_i
    return nil if previous.zero? && current.zero?
    return t('app.teachers.new_this_month_label') if previous.zero?

    pct = (((current - previous).to_f / previous) * 100).round
    sign = pct.positive? ? '+' : ''
    t('app.common.vs_last_month', value: "#{sign}#{pct}%")
  end

  def teacher_hour_value(teacher, day, field)
    teacher = teacher.with_indifferent_access
    row = Array(teacher[:workingHours]).find do |item|
      item.with_indifferent_access[:day].to_s == day.to_s
    end
    return '' if row.blank?

    row = row.with_indifferent_access
    if field.to_s == 'start'
      row[:startTime].presence || row[:start].presence || ''
    else
      row[:endTime].presence || row[:end].presence || ''
    end
  end

  def teacher_duration_preset(teacher)
    minutes = teacher.with_indifferent_access[:defaultLessonDurationMinutes]
    minutes = TeacherProfile::DEFAULT_LESSON_DURATION_MINUTES if minutes.blank?

    minutes = minutes.to_i
    return TeacherProfile::DEFAULT_LESSON_DURATION_MINUTES.to_s if !minutes.positive?

    LESSON_DURATION_PRESETS.include?(minutes) ? minutes.to_s : 'custom'
  end

  def teacher_absence_type_label(absence)
    key = "app.teachers.absence_types.#{absence.absence_type}"
    I18n.t(key, default: absence.absence_type.to_s.humanize)
  end

  def teacher_absence_existing_periods(teacher_record, except_id: nil)
    rows = teacher_record.teacher_absences
    rows = rows.where.not(id: except_id) if except_id.present?
    rows.map do |absence|
      {
        startsOn: absence.starts_on.iso8601,
        endsOn: absence.ends_on.iso8601
      }
    end
  end

  def teacher_absence_range_label(absence)
    start_label = I18n.l(absence.starts_on)
    return start_label if absence.starts_on == absence.ends_on

    "#{start_label} – #{I18n.l(absence.ends_on)}"
  end

  def teacher_absence_range_from_catalog(absence)
    absence = absence.with_indifferent_access
    start_on = Date.iso8601(absence[:startsOn].to_s)
    end_on = Date.iso8601(absence[:endsOn].to_s)
    start_label = I18n.l(start_on)
    return start_label if start_on == end_on

    "#{start_label} – #{I18n.l(end_on)}"
  end

  def teacher_affected_lessons_path(teacher, absence)
    teacher_id = teacher.is_a?(Hash) ? teacher[:id] || teacher['id'] : teacher.id
    affected_lessons_teacher_absence_path(teacher_id:, id: absence.id)
  end

  def teacher_affected_lessons_url_template(teacher)
    teacher_id = teacher.is_a?(Hash) ? teacher[:id] || teacher['id'] : teacher.id
    affected_lessons_teacher_absence_path(teacher_id:, id: '__ABSENCE__')
  end

  def teacher_lesson_reschedule_dialog_url(teacher, absence)
    teacher_id = teacher.is_a?(Hash) ? teacher[:id] || teacher['id'] : teacher.id
    lesson_reschedule_dialog_teacher_absence_path(teacher_id:, id: absence.id, lesson_id: '__LESSON__')
  end

  def lesson_reschedule_form_defaults(lesson)
    zone = lesson.teacher_profile&.time_zone || TeacherProfile::DEFAULT_TIMEZONE
    local_start = lesson.starts_at.in_time_zone(zone)
    local_end = lesson.ends_at.in_time_zone(zone)
    original_id = lesson.original_teacher_id || lesson.teacher_id
    {
      date: local_start.to_date.iso8601,
      start_time: local_start.strftime('%H:%M'),
      end_time: local_end.strftime('%H:%M'),
      teacher_id: original_id,
      prior_date: I18n.l(local_start.to_date),
      prior_range: "#{local_start.strftime('%H:%M')}–#{local_end.strftime('%H:%M')}",
      prior_teacher: lesson.teacher_profile&.display_label
    }
  end

  def lesson_reschedule_description(lesson)
    type_label = if lesson.lesson_type&.mode_group?
                   I18n.t('app.lessons.group_lesson')
                 else
                   I18n.t('app.lessons.individual_lesson')
                 end
    student = lesson.students.first
    student_label = student&.display_label || I18n.t('app.common.student')
    subject = lesson.subject&.name
    [type_label, subject, student_label].compact.join(' · ')
  end

  def teacher_substitution_tone(status)
    case status.to_s
    when 'substitute_assigned', 'rescheduled', 'restored'
      'olive'
    when 'needs_replacement'
      'rose'
    when 'reschedule_required'
      'amber'
    else
      'neutral'
    end
  end

  def teacher_preferred_contact_label(method)
    case method.to_s
    when 'phone' then t('app.teachers.phone_option')
    when 'either' then t('app.teachers.contact_either')
    else t('app.teachers.email_option')
    end
  end

  def teacher_profile_compensation_entries(teacher_record)
    return [] unless teacher_record
    return [] unless can_view_finance?
    return [] if !teacher_record.has_attribute?(:compensation_setup)

    setup = teacher_record.compensation_setup.to_h.with_indifferent_access
    if setup.blank?
      return [
        { label: t('app.teachers.compensation_col'), value: t('app.teachers.compensation_percentage', percent: teacher_record.compensation_rate) }
      ]
    end
    if setup[:enabled] == false
      return [{ label: t('app.teachers.compensation.pay_type_title'), value: t('app.teachers.compensation.setup_later') }]
    end

    entries = []
    model = setup[:model].to_s
    pay_type = model == 'monthly_salary' ? t('app.teachers.compensation.pay_salary_title') : t('app.teachers.compensation.pay_lesson_title')
    entries << { label: t('app.teachers.compensation.pay_type_title'), value: pay_type }

    if model == 'monthly_salary'
      salary = setup[:salary].to_s.strip
      entries << {
        label: t('app.teachers.compensation.pay_salary_title'),
        value: salary.present? ? "#{salary} #{t('app.teachers.compensation.currency_uah')}" : '—'
      }
    elsif setup[:standardEnabled] != false
      rule = setup[:ruleModel].to_s
      value =
        if rule == 'percentage'
          pct = setup[:standardPercent].to_s.strip
          pct = teacher_record.compensation_percent.to_s if pct.blank?
          pct.present? ? "#{pct}%" : '—'
        else
          rate = setup[:standardRate].to_s.strip
          rate.present? ? "#{rate} #{t('app.teachers.compensation.currency_uah')}" : '—'
        end
      entries << { label: t('app.teachers.compensation.default_rule_title'), value: value }
    end

    specific = setup[:specificRules].to_h
    if specific.any?
      entries << {
        label: t('app.teachers.compensation.options_title'),
        value: t('app.teachers.compensation.own_rules_count', count: specific.size, default: "#{specific.size}")
      }
    end

    effective = setup[:effectiveFrom].to_s
    entries << { label: t('app.teachers.compensation.effective_title'), value: effective.presence || '—' }

    entries
  end

  def lesson_format_label(format)
    case format.to_s
    when 'in_person' then t('app.common.in_person')
    when 'hybrid' then t('app.common.hybrid')
    else t('app.common.online')
    end
  end

  def weekday_full_label(day)
    t("app.calendar.weekdays.#{day.to_s.downcase}", default: day.to_s)
  end

  def teacher_display_availability_slots(teacher)
    teacher = teacher.with_indifferent_access
    slots = Array(teacher[:availabilitySlots])
    return TeacherAvailability.sort_slots(slots) if slots.any?

    days = Array(teacher[:workingDays])
    return [] if days.empty?

    format = TeacherAvailability.legacy_format(Array(teacher[:lessonFormats]))
    days.filter_map do |day|
      hours = Array(teacher[:workingHours]).find { |row| row.with_indifferent_access[:day].to_s == day.to_s }
      next if hours.blank?

      row = hours.with_indifferent_access
      {
        'id' => "legacy-#{day}",
        'day' => day.to_s,
        'startTime' => row[:startTime].presence || '09:00',
        'endTime' => row[:endTime].presence || '17:00',
        'lessonTypeId' => 'any',
        'format' => format
      }
    end.then { |rows| TeacherAvailability.sort_slots(rows) }
  end

  def availability_duration_label(total_minutes)
    hours = total_minutes / 60
    minutes = total_minutes % 60
    return t('app.teachers.minutes', count: minutes) if hours.zero?
    return "#{hours} h" if minutes.zero?

    "#{hours} h #{t('app.teachers.minutes', count: minutes)}"
  end

  def availability_timeline_segment_style(slot, bounds)
    slot = slot.with_indifferent_access
    start_t = TeacherAvailability.minutes_of(slot[:startTime])
    end_t = TeacherAvailability.minutes_of(slot[:endTime])
    span = bounds['end'] - bounds['start']
    return '' if span <= 0 || end_t <= start_t

    left = ((start_t - bounds['start']).to_f / span) * 100
    width = ((end_t - start_t).to_f / span) * 100
    "left: #{left}%; width: #{width}%"
  end

  def availability_timeline_hour_marks(bounds)
    marks = []
    hour = (bounds['start'] / 60.0).ceil
    while hour * 60 <= bounds['end']
      marks << hour
      hour += 2
    end
    marks
  end

  def availability_timeline_tick_style(hour, bounds)
    span = bounds['end'] - bounds['start']
    left = ((hour * 60 - bounds['start']).to_f / span) * 100
    "left: #{left}%"
  end

  def availability_slot_format_class(format)
    case format.to_s
    when 'online' then 'ta-timeline__seg--online'
    when 'in_person' then 'ta-timeline__seg--in-person'
    else 'ta-timeline__seg--any'
    end
  end

  def availability_lesson_type_label_map(teacher)
    teacher = teacher.with_indifferent_access
    slot_rows = teacher_display_availability_slots(teacher)
    ids = slot_rows.map { |row| row.with_indifferent_access[:lessonTypeId].to_s }.uniq - ['any', '']
    return {} if ids.empty?

    LessonType.where(id: ids).includes(:subject).each_with_object({}) do |type, memo|
      subject = type.subject&.name
      name = type.name.to_s.strip
      memo[type.id.to_s] = [subject, name].compact_blank.join(' · ')
    end
  end

  def availability_slot_lesson_type_label(slot, label_map = {})
    slot = slot.with_indifferent_access
    id = slot[:lessonTypeId].to_s.presence || 'any'
    return t('app.teachers.availability_slots.slot_badge_any_type') if id == 'any'

    label_map[id].presence || t('app.teachers.availability_slots.slot_lesson_removed')
  end

  def availability_slot_format_badge_label(format)
    case format.to_s
    when 'any' then t('app.teachers.availability_slots.slot_badge_any_format')
    when 'in_person' then t('app.teachers.availability_slots.slot_format_in_person')
    else t('app.teachers.availability_slots.slot_format_online')
    end
  end

  def availability_slot_type_icon(slot)
    id = slot.with_indifferent_access[:lessonTypeId].to_s
    return 'layout-grid' if id == 'any'

    'book'
  end

  def availability_slot_format_icon(format)
    case format.to_s
    when 'online' then 'video'
    when 'in_person' then 'map-pin'
    else 'layout-grid'
    end
  end
end
