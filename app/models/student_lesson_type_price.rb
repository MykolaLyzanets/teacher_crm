# frozen_string_literal: true

class StudentLessonTypePrice < ApplicationRecord
  self.table_name = 'student_lesson_type_prices'

  belongs_to :workspace, inverse_of: :student_lesson_type_prices
  belongs_to :student_profile, foreign_key: :student_id, inverse_of: :student_lesson_type_prices
  belongs_to :lesson_type, inverse_of: :student_lesson_type_prices

  validates :price_cents, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :currency, inclusion: { in: [Finance::FinanceHelper::FINANCE_CURRENCY_CODE] }
  validates :lesson_type_id, uniqueness: { scope: :student_id }
  validate :workspace_matches_student
  validate :lesson_type_in_workspace

  private

  def workspace_matches_student
    return if workspace.blank? || student_profile.blank?
    return if workspace_id == student_profile.workspace_id

    errors.add(:workspace_id, 'must match the student workspace')
  end

  def lesson_type_in_workspace
    return if lesson_type.blank? || workspace.blank?

    subject_workspace_id = lesson_type.subject&.workspace_id
    return if subject_workspace_id == workspace_id

    errors.add(:lesson_type_id, 'must belong to the workspace catalog')
  end
end
