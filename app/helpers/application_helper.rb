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
    items = [
      { path: dashboard_path, label: t('app.nav.dashboard'), icon: 'dashboard', match: 'dashboard' },
      { path: teachers_path, label: t('app.nav.teachers'), icon: 'teachers', match: 'teachers' },
      { path: students_path, label: t('app.nav.students'), icon: 'students', match: 'students' },
      { path: calendar_path, label: t('app.nav.calendar'), icon: 'calendar', match: 'calendar' },
      { path: lessons_path, label: t('app.nav.lessons'), icon: 'book', match: 'lessons' },
      { path: homework_path, label: t('app.nav.homework'), icon: 'homework', match: 'homework' },
      { path: payments_path, label: t('app.nav.payments'), icon: 'payments', match: 'payments' },
      { path: reports_path, label: t('app.nav.reports'), icon: 'reports', match: 'reports' },
      { path: messages_path, label: t('app.nav.messages'), icon: 'messages', match: 'messages' }
    ]
    return items if !user_signed_in? || current_user.owner? || current_user.admin?

    items.reject { |item| item[:match] == 'teachers' }
  end

  def signed_in_home_path
    return new_user_session_path unless user_signed_in?
    return student_root_path if current_user.student?

    dashboard_path
  end

  def can_manage_teachers?
    user_signed_in? && (current_user.owner? || current_user.admin?)
  end

  def can_view_finance?
    user_signed_in? && (current_user.owner? || current_user.admin?)
  end

  def can_assign_teacher?
    can_manage_teachers?
  end

  def lesson_types_seed_json
    Demo::Catalog.lesson_types_seed.to_json
  end

  def app_i18n_json(*roots)
    roots.flatten.each_with_object({}) do |root, hash|
      key = root.to_s.split('.').last
      hash[key] = I18n.t(root)
    end.to_json
  end

  def auth_form_i18n(kind)
    strings = {
      email_blank: t('sessions.errors.email_blank'),
      email_invalid: t('sessions.errors.email_invalid'),
      show_password: t('sessions.show_password'),
      hide_password: t('sessions.hide_password')
    }

    case kind.to_sym
    when :login
      strings[:password_blank] = t('sessions.errors.password_blank')
    when :register
      strings.merge!(
        name_blank: t('registrations.errors.name_blank'),
        name_short: t('registrations.errors.name_short'),
        password_blank: t('registrations.errors.password_blank'),
        password_requirements: t('registrations.errors.password_requirements'),
        confirm_blank: t('registrations.errors.confirm_blank'),
        confirm_mismatch: t('registrations.errors.confirm_mismatch'),
        terms: t('registrations.errors.terms'),
        workspace_type: t('registrations.errors.workspace_type'),
        workspace_name: t('registrations.errors.workspace_name'),
        submit: t('registrations.submit'),
        creating: t('registrations.creating')
      )
    end

    strings.to_json
  end

  def current_user_display_name
    current_user&.full_name.presence || current_user&.email
  end

  def current_user_initials
    parts = current_user_display_name.to_s.split(/\s+/).compact_blank
    return 'U' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def current_user_role_label
    role = current_user&.role
    key = {
      'owner' => 'owner_role',
      'teacher' => 'teacher_role',
      'student' => 'student_role',
      'admin' => 'admin_role'
    }[role]
    key ? t("app.header.#{key}") : role.to_s.humanize
  end

  def google_oauth_enabled?
    GoogleOauth.configured?
  end
end
