# frozen_string_literal: true

module Homework::TeacherStatus
  extend ActiveSupport::Concern

  DISPLAY_STATUS_PRIORITY = %w[submitted needs_revision overdue assigned reviewed].freeze
  TAB_BY_STATUS = {
    'submitted' => 'to_review',
    'assigned' => 'active',
    'needs_revision' => 'active',
    'overdue' => 'overdue',
    'reviewed' => 'reviewed'
  }.freeze

  class_methods do
    def summary_for(records, now: Time.zone.now)
      today = now.to_date
      month_key = today.strftime('%Y-%m')
      to_review = active = overdue = reviewed_this_month = 0

      Array(records).each do |homework|
        current = homework.computed_status(at: now)
        to_review += 1 if current == 'submitted'
        active += 1 if %w[assigned needs_revision].include?(current)
        overdue += 1 if current == 'overdue'
        next unless current == 'reviewed' && homework.reviewed_at&.strftime('%Y-%m') == month_key

        reviewed_this_month += 1
      end

      {
        toReview: to_review,
        active: active,
        overdue: overdue,
        reviewedThisMonth: reviewed_this_month
      }
    end
  end

  def effective_due_at
    resubmission_due_at.presence || due_at
  end

  def student_ids_list
    homework_students.map { |row| row.student_id.to_s }
  end

  def computed_status(at: Time.current)
    statuses = homework_students.map { |row| row.response_or_draft.display_status(at:) }
    return 'assigned' if statuses.empty?

    DISPLAY_STATUS_PRIORITY.each do |candidate|
      return candidate if statuses.include?(candidate)
    end

    'assigned'
  end

  def tab_for(at: Time.current)
    TAB_BY_STATUS.fetch(computed_status(at:), 'all')
  end

  def reviewed_at
    homework_responses.filter_map(&:reviewed_at).max
  end

  def representative_response
    homework_responses.where(status: %i[submitted resubmission_requested reviewed]).order(submitted_at: :desc).first ||
      homework_responses.order(updated_at: :desc).first
  end
end
