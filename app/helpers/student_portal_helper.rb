# frozen_string_literal: true

module StudentPortalHelper
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

  PORTAL_LEDGER_FILTERS = %w[top_ups lessons adjustments refunds].freeze

  def portal_ledger_filter_keys(transactions)
    counts = PORTAL_LEDGER_FILTERS.index_with do |key|
      transactions.count { |item| item[:category].to_s == key }
    end
    counts.select { |_key, count| count.positive? }.keys
  end

  def portal_balance_value_class(state)
    {
      'negative' => 'sp-pay__balance-value--debt',
      'low' => 'sp-pay__balance-value--low'
    }[state.to_s] || ''
  end

  def portal_balance_status_badge(status)
    pay_health_status_badge(status[:health] || status['health'])
  end

  def portal_icon(name, size: 20, **options)
    icon_tag(name, size: size, **options)
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
      viewHomework: t('app.student_portal.calendar.view_homework'),
      withTeacher: t('app.student_portal.calendar.with_teacher'),
      openHomework: t('app.student_portal.calendar.open_homework'),
      lessonTeacherRole: t('app.student_portal.calendar.lesson_teacher_role'),
      bannerCompleted: t('app.student_portal.calendar.banner_completed'),
      bannerCancelled: t('app.student_portal.calendar.banner_cancelled'),
      locationOnline: t('app.student_portal.calendar.location_online'),
      locationInPerson: t('app.student_portal.calendar.location_in_person'),
      durationMinutes: t('app.student_portal.calendar.duration_minutes'),
      lessonNotesEmpty: t('app.student_portal.calendar.lesson_notes_empty'),
      statusLabels: {
        confirmed: t('app.lessons.status_confirmed'),
        pending: t('app.lessons.status_pending'),
        completed: t('app.lessons.status_completed'),
        cancelled: t('app.lessons.status_cancelled')
      },
      typeLabels: {
        individual: t('app.lessons.types.individual'),
        group: t('app.lessons.types.group'),
        trial: t('app.lessons.types.trial'),
        consultation: t('app.lessons.types.consultation')
      }
    }
  end

  def student_calendar_lessons_json
    homework_by_lesson = Array(@homework_items).group_by { |item| item[:lessonId].to_s }
    Array(@portal_lessons).map do |lesson|
      lesson_id = lesson[:id].to_s
      lesson.to_h.merge(
        'title' => lesson[:title].presence || lesson[:subject],
        'homework' => homework_by_lesson[lesson_id] || []
      )
    end
  end

  def homework_subjects(items = @homework_items)
    Array(items).filter_map { |item| item[:subject].presence }.uniq.sort
  end

  def homework_teachers(items = @homework_items)
    Array(items).filter_map { |item| item[:teacher].presence }.uniq.sort
  end

  def homework_due_label(item)
    due = item[:dueContext] || item['dueContext'] || {}
    case due[:label_key].to_s
    when 'overdue_days' then t('app.student_portal.homework.overdue_days', count: due[:count])
    when 'due_today' then t('app.student_portal.homework.due_today')
    when 'due_tomorrow' then t('app.student_portal.homework.due_tomorrow')
    when 'due_in_days' then t('app.student_portal.homework.due_in_days', count: due[:count])
    else t('app.student_portal.homework.due_on', date: format_lesson_day_short(due[:date] || item[:dueDate]))
    end
  end

  def homework_status_tone(status)
    HomeworkStudent::PortalStatus::FACING_TONES[status.to_s] || 'neutral'
  end

  def student_homework_labels
    {
      locale: I18n.locale.to_s,
      assigned: t('app.student_portal.homework.drawer.assigned'),
      due: t('app.student_portal.homework.drawer.due'),
      submitted: t('app.student_portal.homework.drawer.submitted'),
      relatedLesson: t('app.student_portal.homework.drawer.related_lesson'),
      relatedLessonPrefix: t('app.student_portal.homework.drawer.related_lesson_prefix'),
      instructions: t('app.student_portal.homework.drawer.instructions'),
      materials: t('app.student_portal.homework.drawer.materials'),
      materialsSupporting: t('app.student_portal.homework.drawer.materials_supporting'),
      noMaterials: t('app.student_portal.homework.drawer.no_materials'),
      watchMaterial: t('app.student_portal.materials.watch'),
      downloadMaterial: t('app.student_portal.materials.download'),
      openLink: t('app.student_portal.materials.open_link'),
      openCalendar: t('app.student_portal.homework.drawer.open_calendar'),
      yourSubmission: t('app.student_portal.homework.drawer.your_submission'),
      submissionHint: t('app.student_portal.homework.drawer.submission_hint'),
      writtenAnswer: t('app.student_portal.homework.drawer.written_answer'),
      writtenPlaceholder: t('app.student_portal.homework.drawer.written_placeholder'),
      submissionReadonly: t('app.student_portal.homework.drawer.submission_readonly'),
      submittedBanner: t('app.student_portal.homework.drawer.submitted_banner'),
      noSubmission: t('app.student_portal.homework.drawer.no_submission'),
      teacherFeedback: t('app.student_portal.homework.drawer.teacher_feedback'),
      changesRequested: t('app.student_portal.homework.drawer.changes_requested'),
      newDueDate: t('app.student_portal.homework.drawer.new_due_date'),
      noWrittenFeedback: t('app.student_portal.homework.drawer.no_written_feedback'),
      score: t('app.student_portal.homework.drawer.score'),
      saveDraft: t('app.student_portal.homework.drawer.save_draft'),
      submitHomework: t('app.student_portal.homework.drawer.submit_homework'),
      submitConfirmTitle: t('app.student_portal.homework.drawer.submit_confirm_title'),
      submitConfirmText: t('app.student_portal.homework.drawer.submit_confirm_text'),
      continueEditing: t('app.student_portal.homework.drawer.continue_editing'),
      draftSaved: t('app.student_portal.homework.drawer.draft_saved'),
      submittedToast: t('app.student_portal.homework.submitted_toast'),
      lateWarning: t('app.student_portal.homework.drawer.late_warning'),
      lateBlocked: t('app.student_portal.homework.drawer.late_blocked'),
      answerRequired: t('app.student_portal.homework.drawer.answer_required'),
      notEditable: t('app.student_portal.homework.drawer.not_editable'),
      submitFailed: t('app.student_portal.homework.drawer.submit_failed'),
      monthsShort: %w[jan feb mar apr may jun jul aug sep oct nov dec].map { |key| t("app.student_portal.calendar.months_short.#{key}") },
      weekdaysFull: %w[monday tuesday wednesday thursday friday saturday sunday].map { |key| t("app.calendar.weekdays.#{key}") },
      dueToday: t('app.student_portal.homework.due_today'),
      dueTomorrow: t('app.student_portal.homework.due_tomorrow'),
      dueInDays: t('app.student_portal.homework.due_in_days', count: '__COUNT__').gsub('__COUNT__', '%{count}'),
      overdueOne: t('app.student_portal.homework.overdue_days', count: 1),
      overdueOther: t('app.student_portal.homework.overdue_days', count: 2).gsub('2', '%{count}')
    }
  end

  def homework_tab_counts(items = @homework_items)
    counts = { 'todo' => 0, 'submitted' => 0, 'reviewed' => 0 }
    Array(items).each do |item|
      tab = item[:tab] || item['tab']
      counts[tab] += 1 if counts.key?(tab)
    end
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
