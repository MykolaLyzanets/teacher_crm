# frozen_string_literal: true

module HomeworkHelper
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
    icon_tag(name, size: size, **options)
  end

  def teacher_homework_status_label(status)
    t("app.homework.statuses.#{status}", default: status.to_s.humanize)
  end

  def teacher_homework_status_tone(status)
    STATUS_TONE[status.to_s] || 'neutral'
  end

  def homework_students(item)
    ids = homework_student_ids(item)
    StudentProfile.where(id: ids).sort_by { |student| ids.index(student.id.to_s) || ids.length }
  end

  def homework_student_ids(item)
    return item.student_ids_list if item.is_a?(Homework)

    Array(item[:studentIds]).presence || [item[:studentId]].compact.map(&:to_s)
  end

  def homework_student_name(item)
    student = homework_students(item).first
    student ? student.display_label : t('app.common.student')
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
    if item.is_a?(Homework)
      return item.materials.map(&:as_library_entry)
    end

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
      tab: 'active',
      subject: '',
      instructions: '',
      submissionIds: [],
      reviewIds: [],
      hasSubmission: false,
      studentName: '',
      studentLabel: '',
      studentInitials: 'ST',
      dueTime: '',
      submittedAt: '',
      feedback: '',
      response: '',
      privateNote: '',
      lessonTitle: '',
      attachments: 0,
      materialIds: [],
      late: false,
      canReview: false,
      homeworkResponseId: '',
      studentSubmissions: [],
      submissionSummary: '',
      search: ''
    }
  end

  def homework_row_payload(item)
    return item.as_teacher_row if item.is_a?(Homework)

    item
  end
end
