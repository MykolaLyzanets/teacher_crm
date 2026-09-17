# frozen_string_literal: true

module HomeworkHelper
  HOMEWORK_ICONS = {
    'plus' => '<path d="M12 5v14M5 12h14"/>',
    'search' => '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'clipboard-check' => '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/><path d="m9 14 2 2 4-4"/>',
    'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    'alert-triangle' => '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    'circle-check' => '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'eye' => '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'pencil' => '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    'paperclip' => '<path d="M15 7l-6.5 6.5a3.5 3.5 0 0 0 5 5l6.5-6.5a7 7 0 0 0-10-10l-6.5 6.5a3.5 3.5 0 0 0 5 5l6.5-6.5"/>',
    'calendar-event' => '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M16 3v4M8 3v4M4 11h16"/><path d="M8 15h.01M12 15h.01M16 15h.01"/>',
    'x' => '<path d="M18 6 6 18M6 6l12 12"/>',
    'file' => '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>',
    'video' => '<path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14V10z"/><rect x="3" y="6" width="12" height="12" rx="2"/>',
    'link' => '<path d="M9 15l6-6"/><path d="M13 6l1.5-1.5a3.54 3.54 0 0 1 5 5L18 11"/><path d="M11 18l-1.5 1.5a3.54 3.54 0 0 1-5-5L6 13"/>',
    'upload' => '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>'
  }.freeze

  STATUS_TONE = {
    'reviewed' => 'olive',
    'submitted' => 'amber',
    'needs_revision' => 'amber',
    'overdue' => 'rose',
    'assigned' => 'neutral'
  }.freeze

  TABS = %w[to_review active overdue reviewed all].freeze
  STATUS_FILTERS = %w[assigned submitted needs_revision reviewed overdue].freeze

  def homework_icon(name, size: 20, **options)
    paths = HOMEWORK_ICONS.fetch(name.to_s)
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

  def teacher_homework_status_label(status)
    t("app.homework.statuses.#{status}", default: status.to_s.humanize)
  end

  def teacher_homework_status_tone(status)
    STATUS_TONE[status.to_s] || 'neutral'
  end

  def homework_students(item)
    Demo::TeacherHomework.student_ids(item).filter_map { |id| Demo::Catalog.find_student(id) }
  end

  def homework_student_name(item)
    student = homework_students(item).first
    student ? Demo::Catalog.student_name(student) : t('app.common.student')
  end

  def homework_student_label(item)
    students = homework_students(item)
    name = homework_student_name(item)
    extra = students.size - 1
    extra.positive? ? t('app.homework.more_students', name:, count: extra) : name
  end

  def homework_student_initials(item)
    parts = homework_student_name(item).to_s.split(/\s+/).compact_blank
    return 'ST' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def homework_date_label(value)
    student_profile_date_label(value) || '—'
  end

  def homework_materials_for(item)
    Array(item[:materialIds]).filter_map { |id| @materials_by_id&.[](id.to_s) }
  end

  def homework_materials_target(scope, name)
    return name if scope.to_s != 'review'

    "review#{name.to_s.camelize}"
  end

  def homework_template_item
    {
      id: 'hw-new',
      studentId: '',
      studentIds: [],
      title: '',
      assignedDate: Date.current.iso8601,
      dueDate: (Date.current + 7).iso8601,
      teacher: current_user_display_name,
      status: 'assigned',
      subject: '',
      instructions: '',
      attachmentCount: 0,
      materialIds: []
    }
  end

  def homework_row_payload(item)
    status = Demo::TeacherHomework.status(item)
    {
      id: item[:id],
      title: item[:title],
      status: status,
      tab: Demo::TeacherHomework.tab_for(item),
      subject: item[:subject],
      teacher: item[:teacher],
      submissionIds: Array(item.dig(:submission, :attachmentIds)),
      reviewIds: Array(item[:reviewAttachmentIds]),
      hasSubmission: item[:submission].present? || item[:submittedAt].present?,
      studentIds: Demo::TeacherHomework.student_ids(item),
      studentName: homework_student_name(item),
      studentLabel: homework_student_label(item),
      studentInitials: homework_student_initials(item),
      assignedDate: item[:assignedDate],
      dueDate: item[:dueDate],
      dueTime: item[:dueTime],
      submittedAt: item[:submittedAt],
      instructions: item[:instructions],
      feedback: item[:feedback],
      response: item.dig(:submission, :writtenResponse),
      privateNote: item[:privateNote],
      lessonId: item[:lessonId],
      lessonTitle: Demo::TeacherHomework.lesson_title(item),
      attachments: Demo::TeacherHomework.attachments_count(item),
      materialIds: Array(item[:materialIds]),
      late: Demo::TeacherHomework.late_submission?(item),
      canReview: status == 'submitted',
      search: "#{item[:title]} #{homework_student_label(item)}".downcase
    }
  end
end
