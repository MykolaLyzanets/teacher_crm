# frozen_string_literal: true

class Homework < ApplicationRecord
  include Homework::TeacherStatus
  include Homework::TeacherReview
  include Homework::TeacherRow
  include Homework::DashboardReview

  belongs_to :workspace, inverse_of: :homeworks
  belongs_to :teacher, class_name: 'TeacherProfile', foreign_key: :teacher_id, inverse_of: :homeworks
  belongs_to :lesson, optional: true, inverse_of: :homework
  has_many :homework_students, dependent: :destroy, inverse_of: :homework
  has_many :students, through: :homework_students, source: :student, class_name: 'StudentProfile'
  has_many :materials, -> { role_assignment },
           class_name: 'Material', foreign_key: :homework_id, dependent: :nullify, inverse_of: :homework
  has_many :homework_responses, through: :homework_students

  validates :title, :instructions, :assigned_at, :due_at, presence: true
  validate :lesson_belongs_to_teacher
  validate :due_at_not_before_assigned_at
  validate :must_have_at_least_one_student, on: :create

  scope :ordered_by_due, -> { order(due_at: :desc) }

  attribute :allow_late_submission, :boolean, default: false

  before_validation :ensure_allow_late_submission_default

  def sync_material_ids!(raw_ids)
    ids = Array(raw_ids).map(&:to_s).compact_blank
    allowed = Material.linkable_to_homework(self).where(id: ids)
    transaction do
      materials.where.not(id: allowed.select(:id)).update_all(homework_id: nil, homework_response_id: nil, lesson_id: nil)
      allowed.update_all(
        homework_id: id,
        attachment_role: Material.attachment_roles[:assignment],
        homework_response_id: nil,
        lesson_id: nil
      )
      share_materials_with_students!(allowed)
    end
  end

  def sync_review_material_ids!(raw_ids)
    response = representative_response
    return if response.blank?

    ids = Array(raw_ids).map(&:to_s).compact_blank
    allowed_ids = workspace.materials.library_standalone.where(id: ids).pluck(:id) +
                  Material.role_review.where(homework_response_id: response.id, id: ids).pluck(:id)
    allowed = workspace.materials.where(id: allowed_ids.uniq)
    transaction do
      Material.role_review.where(homework_response_id: response.id).where.not(id: allowed.select(:id))
            .update_all(homework_id: nil, homework_response_id: nil)
      allowed.update_all(
        homework_id: id,
        homework_response_id: response.id,
        attachment_role: Material.attachment_roles[:review],
        lesson_id: nil
      )
      share_materials_with_students!(allowed)
    end
  end

  def material_ids_list
    materials.map { |material| material.id.to_s }
  end

  def material_ids_for_response(response, role:)
    return [] if response.blank?

    Material.where(homework_response_id: response.id, attachment_role: role).pluck(:id).map(&:to_s)
  end

  private

  def share_materials_with_students!(material_records)
    student_ids = students.pluck(:id)
    material_records.find_each do |material|
      student_ids.each do |student_id|
        MaterialStudent.find_or_create_by!(material_id: material.id, student_id:)
      end
    end
  end

  def ensure_allow_late_submission_default
    self.allow_late_submission = false if allow_late_submission.nil?
  end

  def due_at_not_before_assigned_at
    return if assigned_at.blank? || due_at.blank?
    return if due_at >= assigned_at

    errors.add(:due_at, :before_assigned)
  end

  def must_have_at_least_one_student
    return if homework_students.reject(&:marked_for_destruction?).any?

    errors.add(:students, :blank)
  end

  def lesson_belongs_to_teacher
    return if lesson.blank? || teacher.blank?
    return if lesson.teacher_id == teacher_id

    errors.add(:lesson, :teacher_mismatch)
  end
end
