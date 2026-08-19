# frozen_string_literal: true

module TeachersHelper
  STATUS_LABELS = {
    'active' => 'Active',
    'invited' => 'Invited',
    'on_leave' => 'On leave',
    'inactive' => 'Inactive'
  }.freeze

  STATUS_TONES = {
    'active' => 'olive',
    'invited' => 'amber',
    'on_leave' => 'neutral',
    'inactive' => 'rose'
  }.freeze

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

  CALENDAR_COLORS = {
    'olive' => '#66734A',
    'slate' => '#6d7f93',
    'amber' => '#b08a3d',
    'plum' => '#7a6b8a',
    'terra' => '#8a5550',
    'teal' => '#5a7a72'
  }.freeze

  LESSON_DURATION_PRESETS = [30, 45, 60, 90].freeze
  SUBJECTS = %w[English Mathematics Science Physics IELTS Spanish Music].freeze
  LANGUAGES = LANGUAGE_LABELS.to_a
  TAGS = ['IELTS', 'Online', 'Group lessons', 'Exam preparation', 'Beginners', 'Advanced'].freeze
  WEEK_DAYS = %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].freeze
  TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
    'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'
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
    CALENDAR_COLORS[id.to_s] || '#66734A'
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
    fallback = field.to_s == 'start' ? '09:00' : '17:00'
    return fallback if row.blank?

    row = row.with_indifferent_access
    if field.to_s == 'start'
      row[:startTime].presence || row[:start].presence || fallback
    else
      row[:endTime].presence || row[:end].presence || fallback
    end
  end

  def teacher_duration_preset(teacher)
    minutes = teacher.with_indifferent_access[:defaultLessonDurationMinutes].to_i
    TeachersHelper::LESSON_DURATION_PRESETS.include?(minutes) ? minutes.to_s : 'custom'
  end

  def lesson_format_label(format)
    case format.to_s
    when 'in_person' then t('app.common.in_person')
    when 'hybrid' then t('app.common.hybrid')
    else t('app.common.online')
    end
  end
end
