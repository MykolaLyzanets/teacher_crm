# frozen_string_literal: true

module HomeworkResponse::DisplayStatus
  extend ActiveSupport::Concern

  def display_status(at: Time.current)
    return 'needs_revision' if resubmission_requested?
    return 'submitted' if submitted?
    return 'reviewed' if reviewed?

    deadline = homework_student.homework.effective_due_at
    return 'overdue' if deadline.present? && deadline < at

    'assigned'
  end

  def late?
    return false if submitted_at.blank?

    due = homework_student.homework.due_at
    return false if due.blank?

    submitted_at > due
  end
end
