# frozen_string_literal: true

module HomeworkStudent::TeacherSubmission
  extend ActiveSupport::Concern

  STATUS_TONE = {
    'submitted' => 'amber',
    'needs_revision' => 'amber',
    'reviewed' => 'olive',
    'overdue' => 'rose',
    'assigned' => 'neutral'
  }.freeze

  def as_teacher_submission_row(at: Time.current)
    response = response_or_draft
    status = response.display_status(at:)
    {
      studentId: student_id.to_s,
      name: student.display_label,
      initials: teacher_submission_initials(student.display_label),
      status: status,
      statusLabel: I18n.t("app.homework.statuses.#{status}", default: status.humanize),
      statusTone: STATUS_TONE[status] || 'neutral',
      hasSubmission: response.submitted? || response.reviewed? || response.resubmission_requested?,
      response: response.written_response.to_s,
      feedback: response.feedback.to_s,
      submittedAt: response.submitted_at&.iso8601,
      homeworkResponseId: response.id&.to_s,
      late: response.late?
    }.with_indifferent_access
  end

  private

  def teacher_submission_initials(name)
    parts = name.to_s.split(/\s+/).compact_blank
    return 'ST' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end
end
