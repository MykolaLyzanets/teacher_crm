# frozen_string_literal: true

module LessonsHelper
  MONTH_SHORT_KEYS = %w[jan feb mar apr may jun jul aug sep oct nov dec].freeze

  LESSON_ICONS = {
    'plus' => '<path d="M12 5v14M5 12h14"/>',
    'search' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'clipboard' => '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/><path d="M9 12h6M9 16h6"/>',
    'upload' => '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
    'folder' => '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'folder-plus' => '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v6M9 14h6"/>',
    'lock' => '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    'credit-card' => '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
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
    'alert-triangle' => '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    'edit' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    'check' => '<path d="M20 6 9 17l-5-5"/>',
    'circle-check' => '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'calendar-x' => '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M16 3v4M8 3v4M4 11h16"/><path d="m14.5 16.5 5 5M19.5 16.5l-5 5"/>',
    'user-x' => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>',
    'user-off' => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>'
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

  CANCEL_REASON_KEYS = %w[
    student_advance
    student_late
    student_no_show
    teacher_cancelled
    technical
    emergency
    other
  ].freeze

  CANCEL_CHARGE_DEFAULTS = {
    'student_advance' => 'no_charge',
    'student_late' => 'charge',
    'student_no_show' => 'charge',
    'teacher_cancelled' => 'no_charge',
    'technical' => 'no_charge',
    'emergency' => 'no_charge',
    'other' => 'no_charge'
  }.freeze

  def lesson_review_status(lesson)
    case lesson[:status].to_s
    when 'cancelled' then 'cancelled'
    when 'completed', 'no_show' then 'completed'
    else
      lesson_ended?(lesson) ? 'outcome_required' : 'upcoming'
    end
  end

  def lesson_upcoming?(lesson)
    %w[confirmed pending].include?(lesson[:status].to_s) && !lesson_ended?(lesson)
  end

  def lesson_ended?(lesson)
    finish = parse_lesson_time(lesson[:endsAt])
    if finish.blank? && lesson[:date].present? && lesson[:endTime].present?
      zone_name = lesson[:timezone].to_s.tr(' ', '_')
      zone = Time.find_zone(zone_name).presence || Time.zone
      finish = zone.parse("#{lesson[:date]} #{lesson[:endTime]}")
    end

    finish.present? && finish <= Time.current
  rescue ArgumentError, TypeError
    false
  end

  def lesson_cancel_reason_keys
    CANCEL_REASON_KEYS
  end

  def lesson_cancel_charge_default(code)
    CANCEL_CHARGE_DEFAULTS[code.to_s] || 'no_charge'
  end

  def lesson_needs_outcome?(lesson)
    lesson_review_status(lesson) == 'outcome_required'
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
    { 'completed' => 'olive', 'cancelled' => 'rose', 'upcoming' => 'amber', 'outcome_required' => 'amber' }[status] || 'neutral'
  end

  def lesson_cancel_reason(lesson)
    return unless lesson_review_status(lesson) == 'cancelled'

    code = lesson[:cancellationReasonCode].to_s
    if code == 'other'
      return lesson[:cancellationOtherText].to_s.strip.presence || lesson[:notes].to_s.strip.presence
    end
    if CANCEL_REASON_KEYS.include?(code)
      return t("app.lessons.cancel_reasons.#{code}")
    end

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
    return if date_key.blank?

    date = Date.iso8601(date_key.to_s)
    "#{date.day} #{t("app.student_portal.calendar.months_short.#{MONTH_SHORT_KEYS[date.month - 1]}")}"
  rescue ArgumentError, TypeError
    date_key.to_s.presence
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
    return "#{display_hour} #{suffix}" if minute.to_i.zero?

    format('%d:%02d %s', display_hour, minute, suffix)
  end

  def format_lesson_time_range(start_time, end_time)
    "#{format_lesson_time_label(start_time)}–#{format_lesson_time_label(end_time)}"
  end

  def lesson_price_label(lesson)
    cents = lesson[:priceCents]
    return '—' if cents.nil?

    currency = lesson[:currency].presence || 'UAH'
    amount = (cents.to_i.abs / 100.0).round
    currency == 'EUR' ? "€#{amount}" : "#{currency} #{amount}"
  end

  def lesson_homework_status(lesson)
    item = lesson_demo_homework(lesson)
    {
      assigned: item.present?,
      id: item&.dig(:id),
      title: item&.dig(:title),
      dueDate: item&.dig(:dueDate),
      teacher: item&.dig(:teacher),
      status: item&.dig(:status)
    }
  end

  def lesson_demo_homework(lesson)
    items = Demo::Timeline.homework
    return if items.blank?

    catalog_ids = lesson_demo_student_ids(lesson)
    by_student = items.select do |item|
      catalog_ids.include?(item[:studentId].to_s) || Array(item[:studentIds]).map(&:to_s).intersect?(catalog_ids)
    end
    subject = lesson_subject_label(lesson).to_s
    picked = by_student.find { |item| lesson_homework_subject?(item[:subject], subject) } || by_student.first
    return picked if picked
    return if subject.blank?

    items.find { |item| lesson_homework_subject?(item[:subject], subject) }
  end

  def lesson_homework_subject?(item_subject, lesson_subject)
    left = item_subject.to_s.downcase
    right = lesson_subject.to_s.downcase
    return false if left.blank? || right.blank?

    left == right || left.start_with?(right) || right.start_with?(left) || left.include?(right) || right.include?(left)
  end

  def lesson_demo_student_ids(lesson)
    names = (Array(lesson[:students]).map { |student| student[:name].to_s } + [lesson[:student].to_s])
              .map { |name| name.downcase.strip }
              .compact_blank
    Demo::Catalog.students.filter_map do |student|
      student[:id].to_s if names.include?(Demo::Catalog.student_name(student).downcase)
    end
  end

  def lesson_row_payload(lesson)
    review = lesson_review_status(lesson)
    teacher_id = lesson[:teacherId]
    students = Array(lesson[:students]).map { |student| lesson_student_payload(student, teacher_id) }
    homework = lesson_homework_status(lesson)
    {
      id: lesson[:id],
      subject: lesson_subject_label(lesson),
      type: lesson[:type],
      typeLabel: lesson_type_label(lesson),
      lessonTypeName: lesson[:lessonTypeName],
      date: lesson[:date],
      dateLong: format_lesson_agenda_date(lesson[:date]),
      startTime: lesson[:startTime],
      endTime: lesson[:endTime],
      timeRange: format_lesson_time_range(lesson[:startTime], lesson[:endTime]),
      durationMinutes: lesson[:durationMinutes].presence || lesson_duration_minutes(lesson),
      endsAt: lesson[:endsAt],
      seriesId: lesson[:seriesId],
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
      currency: lesson[:currency],
      review: review,
      reviewLabel: t("app.lessons.tab_#{review}"),
      cancelReason: lesson_cancel_reason(lesson),
      cancellationReasonCode: lesson[:cancellationReasonCode],
      cancelledBy: lesson[:cancelledBy],
      chargeDecision: lesson[:chargeDecision],
      chargedCents: lesson[:chargedCents],
      homeworkAssigned: homework[:assigned],
      homeworkTitle: homework[:title],
      homeworkDueDate: homework[:dueDate],
      homeworkTeacher: homework[:teacher],
      createdAt: lesson[:createdAt],
      upcoming: lesson_upcoming?(lesson),
      location: lesson[:location],
      meetingLink: lesson[:meetingLink],
      locationText: lesson[:locationText],
      notes: lesson[:notes],
      teacherNote: lesson[:teacherNote],
      studentProgressNote: lesson[:studentProgressNote],
      attendance: lesson[:attendance],
      actualDurationMinutes: lesson[:actualDurationMinutes],
      compensationPercent: lesson[:compensationPercent],
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
      url: id.present? ? student_path(id) : nil,
      balanceCents: demo_student_balance_cents(name)
    }
  end

  def demo_student_balance_cents(name)
    needle = name.to_s.downcase.strip
    catalog = Demo::Catalog.students.find { |student| Demo::Catalog.student_name(student).downcase == needle }
    Demo::Finance.balance_cents(catalog[:id]) if catalog
  end

  def lesson_details_turbo
    { turbo: true, turbo_frame: 'lesson_details' }
  end

  def lesson_dialog_turbo
    { turbo: true, turbo_frame: 'lesson_dialog' }
  end

  def lesson_edit_dialog_path(lesson)
    new_calendar_path(compact_lesson_dialog_params(lesson).merge(lesson_id: lesson[:id]))
  end

  def lesson_duplicate_dialog_path(lesson)
    new_calendar_path(compact_lesson_dialog_params(lesson))
  end

  def lesson_drawer_title(lesson)
    lesson[:lessonTypeName].presence || lesson_subject_label(lesson)
  end

  def lesson_drawer_subtitle(lesson)
    students = Array(lesson[:students])
    group = lesson[:type].to_s == 'group' || students.size > 1
    type_line = if group
                  "#{t('app.lessons.group_lesson')} · #{t('app.lessons.group_participants', count: students.size)}"
                else
                  t('app.lessons.individual_lesson')
                end
    subject = lesson_subject_label(lesson)
    subject.present? ? "#{type_line} · #{subject}" : type_line
  end

  def lesson_drawer_badge(lesson)
    status = lesson[:status].to_s
    charged = lesson[:chargedCents].to_i.positive? || lesson[:chargeDecision].to_s == 'charge'
    if status == 'completed'
      [t('app.lessons.status_completed'), 'olive']
    elsif status == 'cancelled'
      label = charged ? t('app.lessons.status_cancelled_charged') : t('app.lessons.status_cancelled_not_charged')
      [label, 'rose']
    elsif status == 'pending'
      [t('app.lessons.status_pending'), 'amber']
    else
      [t('app.lessons.status_confirmed'), 'olive']
    end
  end

  def lesson_note_cards(lesson)
    cards = []
    push_lesson_note(cards, t('app.lessons.note_teacher'), lesson[:teacherNote], lesson)
    push_lesson_note(cards, t('app.lessons.note_student'), lesson[:studentProgressNote], lesson)
    general = lesson[:notes].to_s.strip
    reason = lesson_cancel_reason(lesson).to_s.strip
    push_lesson_note(cards, t('app.lessons.note_teacher'), general, lesson) if general.present? && general != reason
    cards
  end

  def lesson_activity_items(lesson)
    actor = lesson[:teacher].presence || t('app.common.teacher')
    created = parse_lesson_time(lesson[:createdAt]) || parse_lesson_time("#{lesson[:date]}T#{lesson[:startTime]}")
    status = lesson[:status].to_s
    items = []
    items << { label: t('app.lessons.activity_created'), user: actor, at: created } if created
    if status == 'completed' || lesson_review_status(lesson) == 'completed'
      items << { label: t('app.lessons.activity_completed'), user: actor, at: parse_lesson_time(lesson[:endsAt]) || created }
    end
    if status == 'cancelled' || lesson_review_status(lesson) == 'cancelled'
      items << { label: t('app.lessons.activity_cancelled'), user: actor, at: parse_lesson_time(lesson[:endsAt]) || created }
    end
    items.reverse
  end

  def format_lesson_activity_time(value)
    time = value.is_a?(Time) ? value : parse_lesson_time(value)
    return value.to_s if time.blank?

    l(time, format: :short)
  end

  def format_lesson_balance(cents, currency)
    amount = lesson_price_label(priceCents: cents.to_i.abs, currency:)
    if cents.to_i.positive?
      t('app.lessons.balance_credit', amount:)
    elsif cents.to_i.negative?
      t('app.lessons.balance_due', amount:)
    else
      amount
    end
  end

  def lesson_payment_summary(lesson)
    completed = lesson[:status].to_s == 'completed' || lesson_review_status(lesson) == 'completed'
    charged = lesson[:chargedCents].to_i.positive?
    student = Array(lesson[:students]).first
    balance = student && student[:balanceCents]
    {
      price: lesson[:priceCents].to_i.zero? ? t('app.lessons.free') : lesson_price_label(lesson),
      charge: if charged
                t('app.lessons.charge_created', date: format_lesson_day_short(lesson[:date]))
              elsif completed
                t('app.lessons.no_charge')
              else
                t('app.lessons.created_on_completion')
              end,
      status: if charged
                t('app.lessons.paid_from_balance')
              elsif completed
                t('app.lessons.no_charge_applied')
              else
                t('app.lessons.pending_completion')
              end,
      balance: balance.nil? ? nil : format_lesson_balance(balance, lesson[:currency])
    }
  end

  def lesson_editable?(lesson)
    review = lesson_review_status(lesson)
    review != 'cancelled' && review != 'completed'
  end

  private

  def compact_lesson_dialog_params(lesson)
    {
      date: lesson[:date],
      start: lesson[:startTime],
      end: lesson[:endTime],
      teacher_id: lesson[:teacherId],
      student_id: Array(lesson[:students]).dig(0, :id) || lesson[:studentId]
    }.compact
  end

  def push_lesson_note(cards, title, body, lesson)
    text = body.to_s.strip
    return if text.blank?

    author = lesson[:teacher].to_s
    date = format_lesson_day_short(lesson[:date])
    cards << { title:, body: text, meta: [author, date].compact_blank.join(' · ') }
  end

  def parse_lesson_time(value)
    return if value.blank?

    Time.iso8601(value.to_s)
  rescue ArgumentError, TypeError
    Time.zone.parse(value.to_s)
  rescue ArgumentError, TypeError
    nil
  end
end
