# frozen_string_literal: true

module StudentPortalHelper
  PORTAL_ICONS = {
    'calendar' => '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M16 3v4M8 3v4M4 11h16"/><path d="M8 15h2v2H8z"/>',
    'homework' => '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/><path d="M9 12h6M9 16h6"/>',
    'folder' => '<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/>',
    'user' => '<path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
    'bell' => '<path d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H6a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
    'logout' => '<path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/><path d="M9 12h12l-3-3M18 15l3-3"/>',
    'search' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'filter' => '<path d="M4 4h16l-6 9v5l-4 2v-7z"/>',
    'chevron-left' => '<path d="m15 6-6 6 6 6"/>',
    'chevron-right' => '<path d="m9 6 6 6-6 6"/>',
    'layout-grid' => '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    'list' => '<path d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01"/>'
  }.freeze

  def student_nav_items
    [
      { path: student_calendar_path, label: t('app.student_portal.nav.calendar'), icon: 'calendar', action: 'calendar' },
      { path: student_homework_path, label: t('app.student_portal.nav.homework'), icon: 'homework', action: 'homework' },
      { path: student_materials_path, label: t('app.student_portal.nav.materials'), icon: 'folder', action: 'materials' }
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
    action_name == action
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
      noLessonsOn: t('app.student_portal.calendar.no_lessons_on')
    }
  end
end
