# frozen_string_literal: true

module Homework::TeacherRow
  extend ActiveSupport::Concern

  def as_teacher_row(at: Time.current) # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
    status = computed_status(at:)
    response = representative_response
    student_submissions = teacher_submission_rows(at:)
    submitted_count = student_submissions.count { |row| row[:hasSubmission] }
    total_students = student_submissions.size
    student_records = students.to_a
    primary = student_records.first
    student_name = primary&.display_label || I18n.t('app.common.student')
    extra = [student_records.size - 1, 0].max
    student_label = if extra.positive?
                      I18n.t('app.homework.more_students', name: student_name, count: extra)
                    else
                      student_name
                    end
    submitted_at = response&.submitted_at&.iso8601
    homework_materials = materials.to_a
    material_ids = homework_materials.map { |material| material.id.to_s }
    local_due_at = due_at_in_teacher_zone
    due_time = local_due_at&.strftime('%H:%M')
    due_time = nil if due_time == '00:00' && local_due_at&.sec == 0

    {
      id: id.to_s,
      title: title,
      status: status,
      tab: tab_for,
      subject: subject.to_s,
      teacher: teacher.display_label,
      submissionIds: material_ids_for_response(response, role: Material.attachment_roles[:submission]),
      reviewIds: material_ids_for_response(response, role: Material.attachment_roles[:review]),
      hasSubmission: response&.submitted_at.present? || response&.submitted? || response&.reviewed?,
      studentIds: student_ids_list,
      studentName: student_name,
      studentLabel: student_label,
      studentInitials: initials_for(student_name),
      assignedDate: assigned_at.to_date.iso8601,
      dueDate: (local_due_at || due_at).to_date.iso8601,
      dueTime: due_time,
      submittedAt: submitted_at,
      instructions: instructions,
      feedback: response&.feedback.to_s,
      response: response&.written_response.to_s,
      privateNote: private_note.to_s,
      lessonId: lesson_id&.to_s,
      lessonTitle: lesson_title_label,
      attachments: material_ids.size,
      materialIds: material_ids,
      late: response&.late? || false,
      canReview: status == 'submitted',
      homeworkResponseId: response&.id&.to_s,
      studentSubmissions: student_submissions,
      submissionSummary: submission_summary_label(submitted_count, total_students),
      search: "#{title} #{student_label}".downcase
    }.with_indifferent_access
  end

  def teacher_submission_rows(at: Time.current)
    homework_students.includes(:student, :homework_response).sort_by { |row| row.student.display_label }.map do |row|
      row.as_teacher_submission_row(at:)
    end
  end

  def submission_summary_label(submitted, total)
    return nil if total <= 1

    I18n.t('app.homework.submission_progress', submitted:, total:)
  end

  def due_at_in_teacher_zone
    return if due_at.blank?

    due_at.in_time_zone(teacher.time_zone)
  end

  private

  def lesson_title_label
    return lesson.subject.name if lesson&.subject.present?

    lesson&.lesson_type&.name
  end

  def initials_for(name)
    parts = name.to_s.split(/\s+/).compact_blank
    return 'ST' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end
end
