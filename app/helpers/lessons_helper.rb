# frozen_string_literal: true

module LessonsHelper
  DEFAULT_PRICE_CENTS = 2500
  DEFAULT_CURRENCY = 'EUR'
  MONTH_SHORT_KEYS = %w[jan feb mar apr may jun jul aug sep oct nov dec].freeze

  LESSON_ICONS = {
    'plus' => '<path d="M12 5v14M5 12h14"/>',
    'search' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'clipboard' => '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/><path d="M9 12h6M9 16h6"/>',
    'eye' => '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'pencil' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    'dots' => '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    'x' => '<path d="M18 6 6 18M6 6l12 12"/>',
    'calendar' => '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M16 3v4M8 3v4M4 11h16"/>',
    'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    'tag' => '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    'cash' => '<path d="M7 15H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M7 10a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z"/><path d="M12 14a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/>',
    'world' => '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'video' => '<path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14V10z"/><rect x="3" y="6" width="12" height="12" rx="2"/>',
    'pin' => '<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    'edit' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  }.freeze

  def lesson_icon(name, size: 20, **options)
    paths = LESSON_ICONS.fetch(name.to_s)
    svg_options = {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true'
    }.merge(options)

    content_tag(:svg, paths.html_safe, svg_options)
  end

  def lesson_review_status(lesson)
    case lesson[:status].to_s
    when 'cancelled' then 'cancelled'
    when 'completed', 'no_show' then 'completed'
    else 'upcoming'
    end
  end

  def lesson_upcoming?(lesson)
    %w[confirmed pending].include?(lesson[:status].to_s)
  end

  def lesson_party_label(lesson)
    return t('app.lessons.group_fallback') if lesson[:type].to_s == 'group'

    lesson[:student].presence || t('app.common.student')
  end

  def lesson_teacher_link(lesson)
    name = lesson[:teacher].presence || t('app.common.teacher')
    id = lesson[:teacherId]
    lesson_entity_link(name, id.present? ? teacher_path(id) : nil)
  end

  def lesson_students_links(lesson)
    students = Array(lesson[:students])
    return lesson_party_label(lesson) if students.blank?

    links = students.map do |student|
      name = student[:name].presence || t('app.common.student')
      path = student[:id].present? ? student_path(student[:id]) : nil
      lesson_entity_link(name, path)
    end
    return links.first if links.one?

    content_tag(:span, safe_join(links), class: 'lessons-page__students')
  end

  def lesson_entity_link(name, path)
    return name if path.blank?

    link_to name, path, class: 'lessons-page__entity-link'
  end

  def lesson_subject_label(lesson)
    lesson[:subject].presence || lesson[:title].presence || t('app.lessons.default_subject')
  end

  def lesson_type_label(lesson)
    lesson[:lessonTypeName].presence || t("app.lessons.types.#{lesson[:type]}", default: lesson[:type].to_s.humanize)
  end

  def lesson_badge_tone(status)
    { 'completed' => 'olive', 'cancelled' => 'rose', 'upcoming' => 'amber' }[status] || 'neutral'
  end

  def lesson_cancel_reason(lesson)
    return unless lesson_review_status(lesson) == 'cancelled'

    lesson[:notes].to_s.strip.presence
  end

  def lesson_status_badge(lesson, review: nil)
    review ||= lesson_review_status(lesson)
    reason = lesson_cancel_reason(lesson)
    options = {
      class: "status-badge status-badge--#{lesson_badge_tone(review)}",
      data: {
        badge: '',
        action: 'mouseenter->lessons#showCancelTip mouseleave->lessons#hideCancelTip'
      }
    }
    if reason
      options[:data][:cancel_reason] = reason
      options[:'aria-label'] = "#{t("app.lessons.tab_#{review}")}: #{reason}"
    end

    content_tag(:span, t("app.lessons.tab_#{review}"), options)
  end

  def lesson_search_haystack(lesson)
    [lesson[:title], lesson[:subject], lesson[:teacher], lesson[:student]].compact_blank.join(' ').downcase
  end

  def format_lesson_day_short(date_key)
    date = Date.iso8601(date_key.to_s)
    "#{date.day} #{t("app.student_portal.calendar.months_short.#{MONTH_SHORT_KEYS[date.month - 1]}")}"
  end

  def format_lesson_day_long(date_key)
    "#{format_lesson_day_short(date_key)} #{Date.iso8601(date_key.to_s).year}"
  end

  def format_lesson_agenda_date(date_key)
    date = Date.iso8601(date_key.to_s)
    weekday = t("app.calendar.weekdays.#{%w[sunday monday tuesday wednesday thursday friday saturday][date.wday]}")
    month = t("app.calendar.months.#{Date::MONTHNAMES[date.month].downcase}")
    "#{weekday}, #{month} #{date.day}"
  end

  def lesson_initials(name)
    parts = name.to_s.split(/\s+/).compact_blank
    return 'U' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def lesson_duration_minutes(lesson)
    start_minutes = time_to_minutes(lesson[:startTime])
    end_minutes = time_to_minutes(lesson[:endTime])
    [end_minutes - start_minutes, 0].max
  end

  def time_to_minutes(value)
    hour, minute = value.to_s.split(':').map(&:to_i)
    (hour || 0) * 60 + (minute || 0)
  end

  def format_lesson_time_label(value)
    hour, minute = value.to_s.split(':').map(&:to_i)
    suffix = hour >= 12 ? 'PM' : 'AM'
    display_hour = ((hour + 11) % 12) + 1
    format('%d:%02d %s', display_hour, minute, suffix)
  end

  def format_lesson_time_range(start_time, end_time)
    "#{format_lesson_time_label(start_time)} – #{format_lesson_time_label(end_time)}"
  end

  def lesson_price_label(lesson)
    cents = lesson[:priceCents].nil? ? DEFAULT_PRICE_CENTS : lesson[:priceCents]
    currency = lesson[:currency].presence || DEFAULT_CURRENCY
    amount = (cents.to_i.abs / 100.0).round
    currency == 'EUR' ? "€#{amount}" : "#{currency} #{amount}"
  end

  def lesson_row_payload(lesson)
    review = lesson_review_status(lesson)
    teacher_id = lesson[:teacherId]
    students = Array(lesson[:students]).map { |student| lesson_student_payload(student, teacher_id) }
    {
      id: lesson[:id],
      subject: lesson_subject_label(lesson),
      type: lesson[:type],
      typeLabel: lesson_type_label(lesson),
      date: lesson[:date],
      dateLong: format_lesson_agenda_date(lesson[:date]),
      startTime: lesson[:startTime],
      endTime: lesson[:endTime],
      timeRange: format_lesson_time_range(lesson[:startTime], lesson[:endTime]),
      durationMinutes: lesson[:durationMinutes].presence || lesson_duration_minutes(lesson),
      teacher: lesson[:teacher],
      teacherId: teacher_id,
      teacherInitials: lesson[:teacherInitials].presence || lesson_initials(lesson[:teacher]),
      teacherPhoto: lesson[:teacherPhoto],
      teacherRole: lesson[:teacherRole].presence || t('app.common.teacher'),
      teacherUrl: teacher_id.present? ? teacher_path(teacher_id) : nil,
      students:,
      party: lesson_party_label(lesson),
      price: lesson_price_label(lesson),
      priceCents: lesson[:priceCents],
      review: review,
      reviewLabel: t("app.lessons.tab_#{review}"),
      cancelReason: lesson_cancel_reason(lesson),
      upcoming: lesson_upcoming?(lesson),
      location: lesson[:location],
      meetingLink: lesson[:meetingLink],
      locationText: lesson[:locationText],
      notes: lesson[:notes],
      teacherNote: lesson[:teacherNote],
      studentProgressNote: lesson[:studentProgressNote],
      attendance: lesson[:attendance],
      actualDurationMinutes: lesson[:actualDurationMinutes],
      status: lesson[:status],
      timezone: lesson[:timezone].to_s.tr('_', ' ')
    }
  end

  def lesson_student_payload(student, teacher_id)
    record = student.respond_to?(:[]) ? student : {}
    id = record[:id]
    name = record[:name].presence || t('app.common.student')
    assigned = teacher_id.present? && record[:teacherId].present? && record[:teacherId].to_s == teacher_id.to_s
    {
      id:,
      name:,
      initials: record[:initials].presence || lesson_initials(name),
      photo: record[:photo],
      grade: record[:grade].presence || t('app.common.student'),
      assigned:,
      url: id.present? ? student_path(id) : nil
    }
  end
end
