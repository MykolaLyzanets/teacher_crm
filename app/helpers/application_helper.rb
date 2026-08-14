# frozen_string_literal: true

module ApplicationHelper
  def locale_switch_path(locale)
    locale = locale.to_sym
    url_for(locale: locale == I18n.default_locale ? nil : locale)
  rescue ActionController::UrlGenerationError
    root_path(locale: locale == I18n.default_locale ? nil : locale)
  end

  def html_lang
    I18n.locale == :ua ? 'uk' : I18n.locale.to_s
  end

  def icon_tag(name, size: nil, **options)
    options[:alt] = options.fetch(:alt, '')
    options[:width] = size if size
    options[:height] = size if size
    image_tag("icons/#{name}.svg", **options)
  end

  def calendar_preview_events
    [
      { column: 1, row: 2, span: 2, title: 'Math Lesson', detail: 'Grade 7A', person: 'John Smith', tone: 'sage' },
      { column: 2, row: 3, span: 2, title: 'Physics', detail: 'Grade 10B', person: 'Sarah Johnson', tone: 'mist' },
      { column: 3, row: 2, span: 2, title: 'English Literature', detail: 'Grade 8A', person: 'Linda Martinez', tone: 'stone' },
      { column: 4, row: 2, span: 2, title: 'Biology', detail: 'Grade 10A', person: 'Sarah Johnson', tone: 'olive' },
      { column: 3, row: 4, span: 2, title: 'History', detail: 'Grade 9B', person: 'Robert Taylor', tone: 'sand' },
      { column: 2, row: 6, span: 2, title: 'Chemistry', detail: 'Grade 11A', person: 'Michael Brown', tone: 'sand' },
      { column: 3, row: 8, span: 2, title: 'Spanish', detail: 'Grade 7B', person: 'Emily Davis', tone: 'mist' },
      { column: 5, row: 3, span: 2, title: 'Math Lesson', detail: 'Grade 7A', person: 'John Smith', tone: 'sage' },
      { column: 5, row: 7, span: 2, title: 'Art & Design', detail: 'Grade 8B', person: 'Linda Martinez', tone: 'stone' },
      { column: 6, row: 6, span: 2, title: 'Staff Meeting', detail: 'Conference Room', person: nil, tone: 'olive' }
    ]
  end

  def calendar_preview_all_day
    [
      { column: 1, title: 'Science Fair', tone: 'sage' },
      { column: 2, title: 'Staff Meeting', tone: 'sand' },
      { column: 5, title: 'Parent–Teacher Day', tone: 'mist' }
    ]
  end

  def calendar_preview_mini_days
    (0...35).map do |index|
      day = index - 2
      if day < 1
        [30 + day, true]
      elsif day > 31
        [day - 31, true]
      else
        [day, false]
      end
    end
  end

  def calendar_preview_filters
    [
      ['#66734a', t('home.calendar.filter_classes')],
      ['#7d8b5c', t('home.calendar.filter_meetings')],
      ['#96a077', t('home.calendar.filter_events')],
      ['#a89a70', t('home.calendar.filter_personal')],
      ['#a68a76', t('home.calendar.filter_reminders')]
    ]
  end

  def app_nav_items
    [
      { path: dashboard_path, label: 'Dashboard', icon: 'dashboard', match: 'dashboard' },
      { path: students_path, label: 'Students', icon: 'students', match: 'students' },
      { path: teachers_path, label: 'Teachers', icon: 'teachers', match: 'teachers' },
      { path: calendar_path, label: 'Calendar', icon: 'calendar', match: 'calendar' },
      { path: lessons_path, label: 'Lessons', icon: 'book', match: 'lessons' },
      { path: homework_path, label: 'Homework', icon: 'homework', match: 'homework' },
      { path: payments_path, label: 'Payments', icon: 'payments', match: 'payments' },
      { path: reports_path, label: 'Reports', icon: 'reports', match: 'reports' },
      { path: messages_path, label: 'Messages', icon: 'messages', match: 'messages' }
    ]
  end
end
