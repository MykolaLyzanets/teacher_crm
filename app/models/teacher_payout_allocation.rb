# frozen_string_literal: true

class TeacherPayoutAllocation < ApplicationRecord
  # Cross-table workspace / teacher / currency alignment is validated here.
  # Future payout services must still enforce totals and idempotent allocation rules.

  belongs_to :teacher_payout, inverse_of: :teacher_payout_allocations
  belongs_to :teacher_earning, inverse_of: :teacher_payout_allocations

  validates :amount_cents, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validate :payout_matches_earning_scope

  private

  def payout_matches_earning_scope
    return if teacher_payout.blank? || teacher_earning.blank?

    errors.add(:teacher_earning_id, 'must belong to the same workspace as the payout') if teacher_payout.workspace_id != teacher_earning.workspace_id
    errors.add(:teacher_earning_id, 'must belong to the same teacher as the payout') if teacher_payout.teacher_profile_id != teacher_earning.teacher_profile_id
    errors.add(:teacher_earning_id, 'must use the same currency as the payout') if teacher_payout.currency_id != teacher_earning.currency_id
  end
end
