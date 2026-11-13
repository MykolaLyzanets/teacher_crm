# frozen_string_literal: true

class TeacherEarning < ApplicationRecord
  include FinanceUahCurrency
  KINDS = {
    lesson_completed: 0,
    cancellation_charged: 1
  }.freeze

  enum :kind, KINDS, prefix: :earning

  belongs_to :workspace, inverse_of: :teacher_earnings
  belongs_to :teacher_profile, inverse_of: :teacher_earnings
  belongs_to :student_profile, inverse_of: :teacher_earnings
  belongs_to :lesson, optional: true, inverse_of: :teacher_earnings
  belongs_to :currency, inverse_of: :teacher_earnings
  has_many :teacher_payout_allocations, dependent: :restrict_with_error, inverse_of: :teacher_earning

  validates :kind, :lesson_price_cents, :earning_cents, presence: true
  validates :lesson_price_cents, numericality: { only_integer: true, greater_than: 0 }
  validates :earning_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :compensation_percent,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true
  validate :workspace_matches_profiles

  private

  def workspace_matches_profiles
    return if workspace.blank?

    errors.add(:teacher_profile_id, 'must belong to the same workspace') if teacher_profile.present? && teacher_profile.workspace_id != workspace_id
    errors.add(:student_profile_id, 'must belong to the same workspace') if student_profile.present? && student_profile.workspace_id != workspace_id
  end
end
