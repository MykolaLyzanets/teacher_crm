# frozen_string_literal: true

module Demo
  module Portal
    module_function

    DUE_SOON_DAYS = 2
    NEW_MATERIAL_DAYS = 3

    def homework_for(student_id)
      Timeline.homework.select { |item| belongs_to_student?(item, student_id) }
    end

    def materials_for(student_id)
      Timeline.materials.select do |item|
        Array(item[:studentIds]).map(&:to_s).include?(student_id.to_s)
      end.sort_by { |item| item[:sharedAt].to_s }.reverse
    end

    def lessons_for_student(student)
      name = Catalog.student_name(student)
      Timeline.lessons.select { |lesson| lesson[:student].to_s == name }
    end

    def progress_for(student_id)
      Catalog.progress.find { |item| item[:studentId].to_s == student_id.to_s }
    end

    def notes_for(student_id)
      Catalog.notes.select { |item| item[:studentId].to_s == student_id.to_s }
                   .sort_by { |item| item[:createdAt].to_s }
                   .reverse
    end

    def belongs_to_student?(item, student_id)
      item[:studentId].to_s == student_id.to_s ||
        Array(item[:studentIds]).map(&:to_s).include?(student_id.to_s)
    end

    def facing_status(item, today: Date.current)
      submission_status = item.dig(:submission, :status).to_s
      return 'resubmission_requested' if submission_status == 'resubmission_requested'
      if submission_status == 'draft' && %w[assigned overdue].include?(item[:status].to_s)
        return 'in_progress'
      end

      display_status(item, today)
    end

    def display_status(item, today)
      status = item[:status].to_s
      return status unless %w[assigned overdue].include?(status)

      due = Date.iso8601((item[:resubmissionDueDate].presence || item[:dueDate]).to_s)
      due < today ? 'overdue' : 'assigned'
    rescue ArgumentError, TypeError
      status
    end

    def tab_for(item, today: Date.current)
      facing = facing_status(item, today:)
      return 'reviewed' if facing == 'reviewed'
      return 'submitted' if %w[submitted needs_review].include?(facing)

      'todo'
    end

    def action_for(item, today: Date.current)
      case facing_status(item, today:)
      when 'resubmission_requested' then 'update'
      when 'in_progress' then 'continue'
      when 'overdue' then 'submit'
      when 'reviewed' then 'view_feedback'
      when 'submitted', 'needs_review' then 'view_submission'
      else 'start'
      end
    end

    def due_context(item, today: Date.current)
      due_key = item[:resubmissionDueDate].presence || item[:dueDate]
      due = Date.iso8601(due_key.to_s)
      diff = (due - today).to_i
      if diff.negative?
        { label_key: 'overdue_days', count: diff.abs, urgent: true, overdue: true, bucket: 'overdue' }
      elsif diff.zero?
        { label_key: 'due_today', count: 0, urgent: true, overdue: false, bucket: 'due_soon' }
      elsif diff == 1
        { label_key: 'due_tomorrow', count: 1, urgent: true, overdue: false, bucket: 'due_soon' }
      elsif diff <= DUE_SOON_DAYS
        { label_key: 'due_in_days', count: diff, urgent: true, overdue: false, bucket: 'due_soon' }
      else
        { label_key: 'due_on', count: 0, date: due_key, urgent: false, overdue: false, bucket: 'later' }
      end
    rescue ArgumentError, TypeError
      { label_key: 'due_on', count: 0, date: item[:dueDate], urgent: false, overdue: false, bucket: 'later' }
    end

    def homework_summary(items, today: Date.current)
      todo = submitted = needs_attention = 0
      items.each do |item|
        tab = tab_for(item, today:)
        todo += 1 if tab == 'todo'
        submitted += 1 if tab == 'submitted'
        facing = facing_status(item, today:)
        due = due_context(item, today:)
        needs_attention += 1 if facing == 'overdue' || facing == 'resubmission_requested' || (tab == 'todo' && due[:urgent])
      end
      { todo: todo, submitted: submitted, reviewed: items.count { |item| tab_for(item, today:) == 'reviewed' }, needsAttention: needs_attention }
    end

    def nearest_todo(items, today: Date.current)
      items.select { |item| tab_for(item, today:) == 'todo' }
           .min_by { |item| [facing_status(item, today:) == 'overdue' ? 0 : 1, item[:dueDate].to_s] }
    end

    def new_materials_count(items, now: Time.zone.now)
      cutoff = now - NEW_MATERIAL_DAYS.days
      items.count do |item|
        Time.iso8601(item[:sharedAt].to_s) >= cutoff
      rescue ArgumentError, TypeError
        false
      end
    end

    def review_for_teacher(name)
      Timeline.homework.select do |item|
        item[:teacher].to_s == name && %w[needs_review submitted].include?(facing_status(item))
      end.map do |item|
        student = Catalog.find_student(item[:studentId])
        item.merge(studentName: student ? Catalog.student_name(student) : item[:studentId])
      end
    end

    def file_size_label(bytes)
      size = bytes.to_i
      return if size <= 0
      return "#{size} B" if size < 1024
      return "#{(size / 1024.0).round} KB" if size < 1_048_576

      "#{(size / 1_048_576.0).round(1)} MB"
    end

    def duration_label(seconds)
      total = seconds.to_i
      return if total <= 0

      minutes = total / 60
      remainder = total % 60
      return format('%d:%02d', minutes, remainder) if minutes < 60

      hours = minutes / 60
      format('%d:%02d:%02d', hours, minutes % 60, remainder)
    end
  end
end
