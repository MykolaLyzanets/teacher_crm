# frozen_string_literal: true

module HomeworkStudent::PortalStatus
  extend ActiveSupport::Concern

  FACING_TONES = {
    'overdue' => 'rose',
    'resubmission_requested' => 'rose',
    'in_progress' => 'amber',
    'assigned' => 'amber',
    'submitted' => 'amber',
    'reviewed' => 'olive'
  }.freeze

  def facing_label(facing)
    I18n.t("app.student_portal.homework.statuses.#{facing}", default: facing.to_s.humanize)
  end

  def facing_tone(facing)
    FACING_TONES[facing.to_s] || 'neutral'
  end

  def calendar_status(at: Time.current)
    due = homework.effective_due_at
    return 'assigned' if due.blank?

    due < at ? 'overdue' : 'assigned'
  end

  def facing_status(at: Time.current)
    response = response_or_draft
    return 'resubmission_requested' if response.resubmission_requested?
    return 'reviewed' if response.reviewed?
    return 'submitted' if response.submitted?

    base = calendar_status(at:)
    return 'in_progress' if response.draft? && %w[assigned overdue].include?(base)

    base
  end

  def portal_tab(at: Time.current)
    facing = facing_status(at:)
    return 'reviewed' if facing == 'reviewed'
    return 'submitted' if facing == 'submitted'

    'todo'
  end

  def portal_action(at: Time.current)
    case facing_status(at:)
    when 'resubmission_requested' then 'update'
    when 'in_progress' then 'continue'
    when 'overdue' then 'submit'
    when 'reviewed' then 'view_feedback'
    when 'submitted' then 'view_submission'
    else 'start'
    end
  end

  def due_context(today: Date.current)
    due_key = homework.resubmission_due_at.presence || homework.due_at
    due = due_key.in_time_zone.to_date
    diff = (due - today).to_i
    if diff.negative?
      { label_key: 'overdue_days', count: diff.abs, urgent: true, overdue: true, bucket: 'overdue' }
    elsif diff.zero?
      { label_key: 'due_today', count: 0, urgent: true, overdue: false, bucket: 'due_soon' }
    elsif diff == 1
      { label_key: 'due_tomorrow', count: 1, urgent: true, overdue: false, bucket: 'due_soon' }
    elsif diff <= HomeworkStudent::PortalQueryable::DUE_SOON_DAYS
      { label_key: 'due_in_days', count: diff, urgent: true, overdue: false, bucket: 'due_soon' }
    else
      { label_key: 'due_on', count: 0, date: due.iso8601, urgent: false, overdue: false, bucket: 'later' }
    end
  rescue ArgumentError, TypeError
    { label_key: 'due_on', count: 0, date: homework.due_at&.to_date&.iso8601, urgent: false, overdue: false, bucket: 'later' }
  end
end
