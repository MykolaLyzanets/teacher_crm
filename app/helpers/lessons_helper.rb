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

  def lesson_subject_label(lesson)
    lesson[:subject].presence || lesson[:title].presence || t('app.lessons.default_subject')
  end

  def lesson_type_label(lesson)
    t("app.lessons.types.#{lesson[:type]}", default: lesson[:type].to_s.humanize)
  end

  def lesson_badge_tone(status)
    { 'completed' => 'olive', 'cancelled' => 'rose', 'upcoming' => 'amber' }[status] || 'neutral'
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
    cents = lesson[:priceCents].presence || DEFAULT_PRICE_CENTS
    currency = lesson[:currency].presence || DEFAULT_CURRENCY
    amount = (cents.to_i.abs / 100.0).round
    currency == 'EUR' ? "€#{amount}" : "#{currency} #{amount}"
  end
end
