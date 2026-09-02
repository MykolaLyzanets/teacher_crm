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
  CANCELLED_LESSON_STATUSES = %w[cancelled cancelled_charged cancelled_not_charged].freeze
  HOMEWORK_DONE_STATUSES = %w[reviewed submitted].freeze

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

  def student_avatar(student, size: nil)
    classes = ['students-page__avatar']
    classes << "students-page__avatar--#{size}" if size
    content_tag(:span, class: classes.join(' ')) do
      if student[:photo].present?
        image_tag(student[:photo], alt: '', class: 'students-page__avatar-img')
      else
        student_initials(student)
      end
    end
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
    cards = [
      { id: 'all', label: t('app.students.stats_total'), value: stats[:totalStudents], support: t('app.students.stats_total_support'), icon: 'students', aria: t('app.students.stats_total_aria') },
      { id: 'active', label: t('app.students.stats_active'), value: stats[:activeStudents], support: percent_of_total(stats[:activeStudents], stats[:totalStudents]), icon: 'grad', aria: t('app.students.stats_active_aria') }
    ]
    if can_assign_teacher?
      cards += [
        { id: 'assigned', label: t('app.students.stats_assigned'), value: stats[:assignedStudents], support: percent_of_total(stats[:assignedStudents], stats[:totalStudents]), icon: 'user-check', aria: t('app.students.stats_assigned_aria') },
        { id: 'unassigned', label: t('app.students.stats_unassigned'), value: stats[:unassignedStudents], support: percent_of_total(stats[:unassignedStudents], stats[:totalStudents]), icon: 'user-x', aria: t('app.students.stats_unassigned_aria') }
      ]
    end
    cards << { id: 'newThisMonth', label: t('app.students.stats_new'), value: stats[:newThisMonth], support: student_monthly_change_text(stats[:monthlyChangePercent]), icon: 'chart-pie', aria: t('app.students.stats_new_aria') }
    cards
  end

  def student_subject_line(student)
    subjects = Array(student[:subjects]).compact_blank
    level = student_level_label(student[:level])
    return "#{level} #{subjects.first}" if level.present? && subjects.first.present?
    return subjects.first if subjects.first.present?
    return level if level.present?

    student[:grade].presence || t('app.common.student')
  end

  def student_level_label(level)
    key = level.to_s
    return if key.blank?

    underscored = key.tr(' -', '_').downcase
    t("app.students.levels.#{underscored}", default: key.tr('_', '-').sub(/\b\w/, &:upcase))
  end

  def student_location_label(value)
    key = value.to_s
    return if key.blank?

    t("app.common.#{key}", default: key.humanize)
  end

  def student_relationship_label(value)
    key = value.to_s
    return if key.blank?

    t("app.students.relationship_#{key}", default: key.humanize)
  end

  def student_profile_date_label(value)
    raw = value.to_s
    return if raw.blank?

    date = Date.iso8601(raw[0, 10])
    format = I18n.locale.to_s.start_with?('ua') ? '%-d %B' : '%B %-d'
    I18n.l(date, format:)
  rescue ArgumentError, TypeError
    raw[0, 10]
  end

  def student_activity_date_label(value)
    raw = value.to_s[0, 10]
    return t('app.students.today') if raw == Date.current.iso8601

    student_profile_date_label(raw)
  end

  def student_lesson_cancelled?(lesson)
    status = lesson[:status].to_s
    CANCELLED_LESSON_STATUSES.include?(status) || status.start_with?('cancelled')
  end

  def student_lesson_upcoming?(lesson, now: Time.zone.now)
    status = lesson[:status].to_s
    return false if student_lesson_cancelled?(lesson) || %w[completed no_show].include?(status)

    today = now.to_date.iso8601
    date = lesson[:date].to_s
    date > today || (date == today && lesson[:endTime].to_s >= now.strftime('%H:%M'))
  end

  def student_profile_tab_items
    tabs = [
      { id: 'overview', label: t('app.students.tab_overview') },
      { id: 'lessons', label: t('app.students.tab_lessons') },
      { id: 'homework', label: t('app.students.tab_homework') },
      { id: 'progress', label: t('app.students.tab_progress') }
    ]
    tabs << { id: 'payments', label: t('app.students.tab_payments') } if can_view_finance?
    tabs << { id: 'notes', label: t('app.students.tab_notes') }
    tabs
  end

  def student_profile_tab_path(student, tab_id)
    tab_id.to_s == 'overview' ? student_path(student[:id]) : student_path(student[:id], tab: tab_id)
  end

  def student_upcoming_lessons(lessons, now: Time.zone.now)
    Array(lessons).select { |lesson| student_lesson_upcoming?(lesson, now:) }
                  .sort_by { |lesson| [lesson[:date].to_s, lesson[:startTime].to_s] }
  end

  def student_completed_lessons(lessons)
    Array(lessons).select { |lesson| lesson[:status].to_s == 'completed' }
  end

  def student_profile_stats(lessons:, homework:, progress:)
    completed = student_completed_lessons(lessons)
    upcoming = student_upcoming_lessons(lessons)
    month_key = Date.current.strftime('%Y-%m')
    homework_items = Array(homework)
    done = homework_items.count { |item| HOMEWORK_DONE_STATUSES.include?(item[:status].to_s) }
    homework_percent = homework_items.empty? ? nil : ((done.to_f / homework_items.size) * 100).round
    progress_percent = progress&.dig(:overallPercent)

    {
      lessonsCompleted: completed.size,
      lessonsCompletedThisMonth: completed.count { |lesson| lesson[:date].to_s.start_with?(month_key) },
      upcomingLessons: upcoming.size,
      nextLessonDate: upcoming.first&.dig(:date),
      homeworkCompletedPercent: homework_percent,
      homeworkCompletedLabel: homework_items.empty? ? t('app.students.stats_homework_none') : t('app.students.stats_homework_of', done:, total: homework_items.size),
      progressPercent: progress_percent,
      progressSupporting: if progress_percent
                            progress_percent >= 70 ? t('app.students.stats_on_track') : t('app.students.stats_needs_attention')
                          else
                            t('app.students.stats_no_progress')
                          end
    }.with_indifferent_access
  end

  def student_activity_items(lessons:, homework:, progress:, notes:, finance: nil, include_finance: false)
    items = []
    Array(homework).each do |item|
      next unless HOMEWORK_DONE_STATUSES.include?(item[:status].to_s) || item[:status].to_s == 'needs_review'

      items << {
        title: t('app.students.activity_homework', title: item[:title]),
        date: (item[:submittedAt].presence || item[:dueDate] || item[:assignedDate]).to_s[0, 10]
      }
    end
    student_completed_lessons(lessons).each do |lesson|
      items << {
        title: t('app.students.activity_lesson', title: lesson[:title].presence || lesson[:subject]),
        date: lesson[:date].to_s
      }
    end
    if progress
      items << {
        title: t('app.students.activity_progress', percent: progress[:overallPercent]),
        date: progress[:updatedAt].to_s
      }
    end
    Array(notes).each do |note|
      next if !include_finance && (note[:visibility].to_s == 'admin' || note[:financial])

      items << { title: note[:body].to_s.truncate(72), date: note[:createdAt].to_s[0, 10] }
    end
    if include_finance
      Array(finance&.dig(:transactions)).first(3).each do |item|
        items << {
          title: item[:description].presence || t("app.payments.types.#{item[:type]}", default: item[:type].to_s.humanize),
          date: item[:date].to_s
        }
      end
    end
    items.select { |item| item[:date].present? }
         .sort_by { |item| item[:date].to_s }
         .reverse
         .first(6)
  end

  def student_profile_stat_cards(stats)
    stats = stats.with_indifferent_access
    next_support = if stats[:nextLessonDate].present?
                     t('app.students.stats_next_on', date: student_profile_date_label(stats[:nextLessonDate]))
                   else
                     t('app.students.stats_no_upcoming')
                   end
    [
      {
        label: t('app.students.stats_lessons_completed'),
        value: stats[:lessonsCompleted].to_s,
        support: t('app.students.stats_lessons_month', count: stats[:lessonsCompletedThisMonth].to_i),
        icon: 'grad'
      },
      {
        label: t('app.students.stats_upcoming_lessons'),
        value: stats[:upcomingLessons].to_s,
        support: next_support,
        icon: 'calendar-event'
      },
      {
        label: t('app.students.stats_homework_completed'),
        value: stats[:homeworkCompletedPercent].nil? ? '—' : "#{stats[:homeworkCompletedPercent]}%",
        support: stats[:homeworkCompletedLabel],
        icon: 'clipboard-check'
      },
      {
        label: t('app.students.stats_current_progress'),
        value: stats[:progressPercent].nil? ? '—' : "#{stats[:progressPercent]}%",
        support: stats[:progressSupporting],
        icon: 'chart-line'
      }
    ]
  end

  def student_lesson_status_label(status)
    key = status.to_s
    t("app.statuses.#{key}", default: key.humanize)
  end

  def student_lesson_status_tone(status)
    case status.to_s
    when 'completed' then 'olive'
    when 'pending', 'cancelled_charged' then 'amber'
    when 'cancelled', 'cancelled_not_charged', 'no_show' then 'rose'
    else 'neutral'
    end
  end

  def student_attendance_label(lesson)
    return '—' if student_lesson_cancelled?(lesson)

    attendance = lesson[:attendance].to_s
    return t('app.students.attendance_none') if attendance.blank?

    t("app.students.attendance.#{attendance}", default: attendance.humanize)
  end

  def student_format_label(student, pricing: nil)
    location = student_location_label(student[:locationPreference])
    return if location.blank?

    duration = pricing&.dig(:defaultDurationMinutes).presence || 60
    "#{location} · #{t('app.students.minutes', count: duration)}"
  end

  def student_tag_line(student)
    [
      student[:grade],
      student[:academicYear],
      *Array(student[:preferredDays]).map { |day| weekday_short_label(day).presence || day }
    ].compact_blank.join(' · ').presence
  end

  def student_balance_label(cents, currency = 'EUR')
    amount = money_label(cents.to_i.abs, currency)
    if cents.to_i.positive?
      t('app.students.balance_credit', amount:)
    elsif cents.to_i.negative?
      t('app.students.balance_due', amount:)
    else
      t('app.students.balance_zero', amount: money_label(0, currency))
    end
  end

  def student_payment_status_label(cents)
    if cents.to_i.positive?
      t('app.students.payment_credit')
    elsif cents.to_i.negative?
      t('app.students.payment_due')
    else
      t('app.students.payment_balanced')
    end
  end

  def student_ledger_rows(transactions)
    sorted = Array(transactions).sort_by { |item| [item[:date].to_s, item[:createdAt].to_s, item[:id].to_s] }
    running = 0
    rows = sorted.map do |item|
      counted = item[:type].to_s != 'debt_allocation' && !%w[pending rejected].include?(item[:confirmationStatus].to_s)
      running += item[:amountCents].to_i if counted
      item.merge(balanceAfterCents: running)
    end
    rows.reverse
  end

  def student_note_visibility_label(visibility)
    case visibility.to_s
    when 'admin' then t('app.students.note_admin')
    when 'student' then t('app.students.note_student')
    else t('app.students.note_teacher')
    end
  end

  def student_homework_tone(status)
    {
      'overdue' => 'rose',
      'resubmission_requested' => 'rose',
      'in_progress' => 'amber',
      'assigned' => 'amber',
      'reviewed' => 'olive'
    }[status.to_s] || 'neutral'
  end
end
