# frozen_string_literal: true

module HomeworkStudent::PortalItem
  extend ActiveSupport::Concern

  def as_student_portal_item(at: Time.current) # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
    ensure_response! if persisted?
    response = response_or_draft
    due = due_context(today: at.to_date)
    facing = facing_status(at:)
    due_on = homework.resubmission_due_at&.to_date || homework.due_at.to_date
    homework_materials = homework.materials.to_a
    material_ids = homework_materials.map { |material| material.id.to_s }
    {
      id: homework_id.to_s,
      lessonId: homework.lesson_id&.to_s,
      lesson: portal_lesson_snapshot,
      homeworkStudentId: id.to_s,
      homeworkResponseId: response.id&.to_s,
      title: homework.title,
      subject: homework.subject.to_s,
      teacher: homework.teacher.display_label,
      instructions: homework.instructions,
      assignedDate: homework.assigned_at.to_date.iso8601,
      dueDate: homework.due_at.to_date.iso8601,
      resubmissionDueDate: homework.resubmission_due_at&.to_date&.iso8601,
      dueDisplayDate: due_on.iso8601,
      feedback: response.feedback.to_s,
      score: response.score.to_s,
      writtenResponse: response.written_response.to_s,
      facing: facing,
      facingLabel: facing_label(facing),
      facingTone: facing_tone(facing),
      tab: portal_tab(at:),
      action: portal_action(at:),
      dueContext: due,
      dueBucket: due[:bucket],
      materialIds: material_ids,
      materials: homework_materials.map(&:as_homework_attachment_summary),
      attachmentCount: homework_materials.size,
      submissionAttachmentIds: response.materials.role_submission.map { |material| material.id.to_s },
      allowLateSubmission: homework.allow_late_submission?,
      editable: portal_submission_editable?(response),
      responseStatus: response.status,
      late: response.late?,
      submittedAt: response.submitted_at&.iso8601,
      reviewedBy: portal_reviewer_name(response),
      reviewedAt: response.reviewed_at&.iso8601
    }.with_indifferent_access
  end

  def portal_lesson_snapshot
    lesson = homework.lesson
    return nil if lesson.blank?

    zone = lesson.teacher_profile.time_zone
    local_start = lesson.starts_at.in_time_zone(zone)
    local_end = lesson.ends_at.in_time_zone(zone)
    {
      id: lesson.id.to_s,
      title: lesson.subject&.name.presence || lesson.lesson_type&.name,
      date: local_start.to_date.iso8601,
      startTime: local_start.strftime('%H:%M'),
      endTime: local_end.strftime('%H:%M'),
      teacher: lesson.teacher_profile&.display_label
    }.with_indifferent_access
  end

  def portal_submission_editable?(response)
    return true if response.draft? || response.resubmission_requested?

    false
  end

  def portal_reviewer_name(response)
    response.reviewed_by&.full_name.presence || homework.teacher.display_label
  end

  def ensure_response!
    return homework_response if homework_response.present?

    create_homework_response!(status: :draft)
  end
end
