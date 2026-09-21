# frozen_string_literal: true

class HomeworkStudent < ApplicationRecord
  include HomeworkStudent::PortalQueryable
  include HomeworkStudent::PortalStatus
  include HomeworkStudent::PortalItem
  include HomeworkStudent::TeacherSubmission

  belongs_to :homework, inverse_of: :homework_students
  belongs_to :student, class_name: 'StudentProfile', inverse_of: :homework_students
  has_one :homework_response, dependent: :destroy, inverse_of: :homework_student

  validates :student_id, uniqueness: { scope: :homework_id }
  validate :student_matches_homework_workspace

  def response_or_draft
    homework_response || HomeworkResponse.new(homework_student: self, status: :draft)
  end

  private

  def student_matches_homework_workspace
    return if homework.blank? || student.blank?
    return if student.workspace_id == homework.workspace_id

    errors.add(:student, :workspace_mismatch)
  end
end
