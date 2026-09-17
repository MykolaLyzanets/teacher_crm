# frozen_string_literal: true

module Demo
  module TeacherHomework
    module_function

    DEMO_LESSON_TITLES = {
      'les-4' => 'Group lesson',
      'les-7' => 'English lesson'
    }.freeze

    def items_for(viewer_name:, teacher: false)
      items = Timeline.homework.reject { |item| item[:status].to_s == 'draft' }
      return items unless teacher

      items.select { |item| item[:teacher].to_s == viewer_name.to_s }
    end

    def status(item, today: Date.current)
      return 'needs_revision' if item.dig(:submission, :status).to_s == 'resubmission_requested'

      base = display_status(item, today)
      return 'assigned' if base == 'draft'
      return 'submitted' if %w[needs_review submitted].include?(base)

      base
    end

    def display_status(item, today)
      raw = item[:status].to_s
      if %w[assigned overdue].include?(raw)
        due = Date.iso8601((item[:resubmissionDueDate].presence || item[:dueDate]).to_s)
        return due < today ? 'overdue' : 'assigned'
      end
      return 'needs_review' if raw == 'submitted'

      raw
    rescue ArgumentError, TypeError
      raw
    end

    def tab_for(item, today: Date.current)
      case status(item, today:)
      when 'submitted' then 'to_review'
      when 'assigned', 'needs_revision' then 'active'
      when 'overdue' then 'overdue'
      when 'reviewed' then 'reviewed'
      else 'all'
      end
    end

    def matches_tab?(item, tab, today: Date.current)
      return true if tab.to_s == 'all'

      tab_for(item, today:) == tab.to_s
    end

    def summary(items, now: Time.zone.now)
      today = now.to_date
      month_key = today.strftime('%Y-%m')
      to_review = active = overdue = reviewed_this_month = 0

      items.each do |item|
        current = status(item, today:)
        to_review += 1 if current == 'submitted'
        active += 1 if %w[assigned needs_revision].include?(current)
        overdue += 1 if current == 'overdue'
        next unless current == 'reviewed' && item[:reviewedAt].to_s.slice(0, 7) == month_key

        reviewed_this_month += 1
      end

      {
        toReview: to_review,
        active: active,
        overdue: overdue,
        reviewedThisMonth: reviewed_this_month
      }
    end

    def late_submission?(item)
      submitted = item[:submittedAt].to_s.slice(0, 10)
      due = item[:dueDate].to_s
      submitted.present? && due.present? && submitted > due
    end

    def lesson_title(item)
      item[:lessonTitle].presence || DEMO_LESSON_TITLES[item[:lessonId].to_s]
    end

    def student_ids(item)
      ids = Array(item[:studentIds]).presence || [item[:studentId]]
      ids.map(&:to_s).compact_blank
    end

    def attachments_count(item)
      ids = Array(item[:materialIds])
      return ids.size if ids.any?

      item[:attachmentCount].to_i
    end
  end
end
