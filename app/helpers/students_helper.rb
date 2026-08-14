# frozen_string_literal: true

module StudentsHelper
  STATUS_LABEL = {
    'active' => 'Active',
    'trial' => 'Trial',
    'paused' => 'Paused',
    'archived' => 'Archived'
  }.freeze

  STATUS_TONE = {
    'active' => 'olive',
    'trial' => 'amber',
    'paused' => 'neutral',
    'archived' => 'rose'
  }.freeze

  def student_display_name(student)
    student[:preferredName].presence ||
      [student[:firstName], student[:lastName]].compact_blank.join(' ').presence ||
      'Student'
  end

  def student_initials(student)
    source = student_display_name(student)
    parts = source.split(/\s+/).reject(&:blank?)
    return 'ST' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def student_status_label(status)
    STATUS_LABEL[status.to_s] || status.to_s.humanize
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
    return 'No change' if percent.zero?

    sign = percent.positive? ? '+' : ''
    "#{sign}#{percent}% vs last month"
  end

  def student_stats_cards(stats)
    stats = stats.with_indifferent_access
    [
      { id: 'all', label: 'Total Students', value: stats[:totalStudents], support: 'All students', icon: 'students', aria: 'Show all students' },
      { id: 'active', label: 'Active Students', value: stats[:activeStudents], support: percent_of_total(stats[:activeStudents], stats[:totalStudents]), icon: 'school', aria: 'Filter active students' },
      { id: 'assigned', label: 'Assigned to Teachers', value: stats[:assignedStudents], support: percent_of_total(stats[:assignedStudents], stats[:totalStudents]), icon: 'user-check', aria: 'Filter students assigned to teachers' },
      { id: 'unassigned', label: 'Unassigned Students', value: stats[:unassignedStudents], support: percent_of_total(stats[:unassignedStudents], stats[:totalStudents]), icon: 'user-x', aria: 'Filter unassigned students' },
      { id: 'newThisMonth', label: 'New This Month', value: stats[:newThisMonth], support: student_monthly_change_text(stats[:monthlyChangePercent]), icon: 'chart-bars', aria: 'Filter students created this month' }
    ]
  end
end
