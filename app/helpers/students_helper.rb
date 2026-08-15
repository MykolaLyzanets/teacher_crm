# frozen_string_literal: true

module StudentsHelper
  STATUS_TONE = {
    'active' => 'olive',
    'trial' => 'amber',
    'paused' => 'neutral',
    'archived' => 'rose'
  }.freeze

  SUBJECTS = %w[English Mathematics Science IELTS Spanish Music].freeze
  WEEK_DAYS = %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].freeze
  ACADEMIC_YEARS = %w[2024/2025 2025/2026 2026/2027].freeze
  LEVELS = [
    ['Beginner', 'beginner'],
    ['Elementary', 'elementary'],
    ['Intermediate', 'intermediate'],
    ['Upper-intermediate', 'upper_intermediate'],
    ['Advanced', 'advanced']
  ].freeze
  WEEKDAY_SHORT = {
    'Monday' => 'mon',
    'Tuesday' => 'tue',
    'Wednesday' => 'wed',
    'Thursday' => 'thu',
    'Friday' => 'fri',
    'Saturday' => 'sat',
    'Sunday' => 'sun'
  }.freeze

  def student_display_name(student)
    student[:preferredName].presence ||
      [student[:firstName], student[:lastName]].compact_blank.join(' ').presence ||
      t('app.common.student')
  end

  def student_initials(student)
    source = student_display_name(student)
    parts = source.split(/\s+/).reject(&:blank?)
    return 'ST' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def student_status_label(status)
    key = status.to_s
    I18n.t("app.statuses.#{key}", default: key.humanize)
  end

  def student_status_tone(status)
    STATUS_TONE[status.to_s] || 'neutral'
  end

  def percent_of_total(part, total)
    return '—' if total.to_i.zero?

    "#{(part.to_f / total * 100).round}%"
  end

  def student_monthly_change_text(percent)
    return '—' if percent.nil?
    return t('app.common.no_change') if percent.zero?

    sign = percent.positive? ? '+' : ''
    t('app.common.vs_last_month', value: "#{sign}#{percent}%")
  end

  def weekday_short_label(day)
    key = WEEKDAY_SHORT[day.to_s] || day.to_s[0, 3].downcase
    t("app.calendar.weekdays_short.#{key}", default: day.to_s[0, 3])
  end

  def student_stats_cards(stats)
    stats = stats.with_indifferent_access
    [
      { id: 'all', label: t('app.students.stats_total'), value: stats[:totalStudents], support: t('app.students.stats_total_support'), icon: 'students', aria: t('app.students.stats_total_aria') },
      { id: 'active', label: t('app.students.stats_active'), value: stats[:activeStudents], support: percent_of_total(stats[:activeStudents], stats[:totalStudents]), icon: 'school', aria: t('app.students.stats_active_aria') },
      { id: 'assigned', label: t('app.students.stats_assigned'), value: stats[:assignedStudents], support: percent_of_total(stats[:assignedStudents], stats[:totalStudents]), icon: 'user-check', aria: t('app.students.stats_assigned_aria') },
      { id: 'unassigned', label: t('app.students.stats_unassigned'), value: stats[:unassignedStudents], support: percent_of_total(stats[:unassignedStudents], stats[:totalStudents]), icon: 'user-x', aria: t('app.students.stats_unassigned_aria') },
      { id: 'newThisMonth', label: t('app.students.stats_new'), value: stats[:newThisMonth], support: student_monthly_change_text(stats[:monthlyChangePercent]), icon: 'chart-bars', aria: t('app.students.stats_new_aria') }
    ]
  end
end
