# frozen_string_literal: true

module StudentPortalHelper
  PORTAL_ICONS = {
    'calendar' => '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M16 3v4M8 3v4M4 11h16"/><path d="M8 15h2v2H8z"/>',
    'homework' => '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/><path d="M9 12h6M9 16h6"/>',
    'folder' => '<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/>',
    'home' => '<path d="M5 12 3 12 12 3 21 12 19 12"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/>',
    'wallet' => '<path d="M17 8V5a1 1 0 0 0-1-1H6a2 2 0 1 0 0 4h12a1 1 0 0 1 1 1v3"/><path d="M20 12v4h-4a2 2 0 0 1 0-4h4"/><path d="M3 9v10a2 2 0 0 0 2 2h12"/>',
    'alert' => '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    'mail' => '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
    'user' => '<path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
    'bell' => '<path d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H6a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    'logout' => '<path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/><path d="M9 12h12l-3-3M18 15l3-3"/>',
    'search' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'filter' => '<path d="M4 4h16l-6 9v5l-4 2v-7z"/>',
    'chevron-left' => '<path d="m15 6-6 6 6 6"/>',
    'chevron-right' => '<path d="m9 6 6 6-6 6"/>',
    'layout-grid' => '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    'list' => '<path d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01"/>',
    'paperclip' => '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    'video' => '<path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14V10z"/><rect x="3" y="6" width="12" height="12" rx="2"/>',
    'photo' => '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    'file' => '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    'headphones' => '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2zM18 13v7h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1z"/>',
    'link' => '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    'eye' => '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'play' => '<path d="M8 5v14l11-7z"/>',
    'x' => '<path d="M18 6 6 18M6 6l12 12"/>',
    'download' => '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'
  }.freeze

  def student_nav_items
    [
      { path: student_home_path, label: t('app.student_portal.nav.home'), icon: 'home', action: 'home' },
      { path: student_calendar_path, label: t('app.student_portal.nav.calendar'), icon: 'calendar', action: 'calendar' },
      { path: student_homework_path, label: t('app.student_portal.nav.homework'), icon: 'homework', action: 'homework' },
      { path: student_materials_path, label: t('app.student_portal.nav.materials'), icon: 'folder', action: 'materials' },
      { path: student_payments_path, label: t('app.student_portal.nav.payments'), icon: 'wallet', action: 'payments' }
    ]
  end

  def student_page_meta
    scope = "app.student_portal.pages.#{action_name}"
    {
      title: t("#{scope}.title", default: t('app.student_portal.title')),
      description: t("#{scope}.description", default: '')
    }
  end

  def student_nav_active?(action)
    return action_name == 'home' if action == 'home'

    action_name == action
  end

  def student_unread_count
    return 0 if @catalog_student_id.blank?

    Demo::Catalog.notifications.count do |item|
      item[:audience].to_s == 'student' &&
        item[:recipientId].to_s == @catalog_student_id.to_s &&
        !item[:read]
    end
  end

  def portal_first_name
    current_user.full_name.to_s.split(/\s+/).first.presence || t('app.student_portal.title')
  end

  def portal_icon(name, size: 20, **options)
    paths = PORTAL_ICONS.fetch(name.to_s)
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

  def student_calendar_labels
    {
      months: %w[january february march april may june july august september october november december].map { |key| t("app.calendar.months.#{key}") },
      monthsShort: %w[jan feb mar apr may jun jul aug sep oct nov dec].map { |key| t("app.student_portal.calendar.months_short.#{key}") },
      weekdays: %w[mon tue wed thu fri sat sun].map { |key| t("app.calendar.weekdays_short.#{key}") },
      weekdaysFull: %w[monday tuesday wednesday thursday friday saturday sunday].map { |key| t("app.calendar.weekdays.#{key}") },
      locale: I18n.locale.to_s,
      noLessonsOn: t('app.student_portal.calendar.no_lessons_on'),
      emptyTitle: t('app.student_portal.calendar.empty_title'),
      emptyText: t('app.student_portal.calendar.empty_text'),
      join: t('app.student_portal.calendar.join'),
      viewDetails: t('app.student_portal.calendar.view_details'),
      withTeacher: t('app.student_portal.calendar.with_teacher')
    }
  end

  def student_calendar_lessons_json
    Array(@portal_lessons).map do |lesson|
      {
        id: lesson[:id],
        title: lesson[:title].presence || lesson[:subject],
        date: lesson[:date],
        startTime: lesson[:startTime],
        endTime: lesson[:endTime],
        teacher: lesson[:teacher],
        location: lesson[:location],
        meetingLink: lesson[:meetingLink],
        status: lesson[:status],
        type: lesson[:type],
        notes: lesson[:notes]
      }
    end
  end

  def homework_subjects(items = @homework_items)
    Array(items).filter_map { |item| item[:subject].presence }.uniq.sort
  end

  def homework_teachers(items = @homework_items)
    Array(items).filter_map { |item| item[:teacher].presence }.uniq.sort
  end

  def homework_due_label(item)
    due = Demo::Portal.due_context(item)
    case due[:label_key]
    when 'overdue_days' then t('app.student_portal.homework.overdue_days', count: due[:count])
    when 'due_today' then t('app.student_portal.homework.due_today')
    when 'due_tomorrow' then t('app.student_portal.homework.due_tomorrow')
    when 'due_in_days' then t('app.student_portal.homework.due_in_days', count: due[:count])
    else t('app.student_portal.homework.due_on', date: format_lesson_day_short(due[:date] || item[:dueDate]))
    end
  end

  def homework_status_tone(status)
    {
      'overdue' => 'rose',
      'resubmission_requested' => 'rose',
      'in_progress' => 'amber',
      'assigned' => 'amber',
      'reviewed' => 'olive'
    }[status.to_s] || 'neutral'
  end

  def homework_tab_counts(items = @homework_items)
    counts = { 'todo' => 0, 'submitted' => 0, 'reviewed' => 0 }
    Array(items).each { |item| counts[Demo::Portal.tab_for(item)] += 1 }
    counts
  end

  def grouped_portal_materials(items = @materials_items)
    today = Date.current
    week_start = today.beginning_of_week(:monday)
    groups = { 'today' => [], 'this_week' => [], 'earlier' => [] }
    Array(items).each do |item|
      date = Time.iso8601(item[:sharedAt].to_s).to_date
      key = if date == today
              'today'
            elsif date >= week_start && date <= today + 6
              'this_week'
            else
              'earlier'
            end
      groups[key] << item
    rescue ArgumentError, TypeError
      groups['earlier'] << item
    end
    groups.reject { |_key, list| list.empty? }
  end

  def material_type_icon(type)
    { 'video' => 'video', 'image' => 'photo', 'audio' => 'headphones', 'link' => 'link' }[type.to_s] || 'file'
  end

  def material_meta_line(item)
    parts = [t("app.student_portal.materials.types.#{item[:type]}", default: item[:type].to_s.humanize)]
    if %w[video audio].include?(item[:type].to_s)
      parts << Demo::Portal.duration_label(item[:durationSeconds])
    else
      parts << Demo::Portal.file_size_label(item[:size])
    end
    parts << item[:domain]
    parts.compact_blank.join(' · ')
  end

  def material_primary_action(item)
    return t('app.student_portal.materials.preparing') if item[:status].to_s == 'processing'
    return t('app.student_portal.materials.unavailable') if item[:status].to_s == 'failed'
    return t('app.student_portal.materials.watch') if item[:type].to_s == 'video'
    return t('app.student_portal.materials.open_link') if item[:type].to_s == 'link'
    return t('app.student_portal.materials.preview') if item[:accessUrl].present?

    t('app.student_portal.materials.view_details')
  end

  def material_source_label(item)
    case item[:sourceKind].to_s
    when 'homework' then t('app.student_portal.materials.from_homework', title: item[:sourceLabel])
    when 'lesson' then t('app.student_portal.materials.from_lesson', title: item[:sourceLabel])
    else t('app.student_portal.materials.shared_directly', title: item[:sourceLabel])
    end
  end

  def material_subjects(items = @materials_items)
    Array(items).filter_map { |item| item[:subject].presence }.uniq.sort
  end

  def material_teachers(items = @materials_items)
    Array(items).filter_map { |item| item[:sharedBy].presence }.uniq.sort
  end
end
