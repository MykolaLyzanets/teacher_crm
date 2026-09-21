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
  has_many :homework_responses, through: :homework_students

  validates :title, :instructions, :assigned_at, :due_at, presence: true
  validate :lesson_belongs_to_teacher
  validate :due_at_not_before_assigned_at
  validate :must_have_at_least_one_student, on: :create

  scope :ordered_by_due, -> { order(due_at: :desc) }

  attribute :allow_late_submission, :boolean, default: false

  before_validation :ensure_allow_late_submission_default

  private

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
