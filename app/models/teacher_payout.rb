# frozen_string_literal: true

class TeacherPayout < ApplicationRecord
  include FinanceUahCurrency
  PAYMENT_METHODS = StudentTransaction::PAYMENT_METHODS

  enum :method, PAYMENT_METHODS, prefix: :payment_method

  belongs_to :workspace, inverse_of: :teacher_payouts
  belongs_to :teacher_profile, inverse_of: :teacher_payouts
  belongs_to :currency, inverse_of: :teacher_payouts
  belongs_to :created_by, class_name: 'User', inverse_of: :created_teacher_payouts
  has_many :teacher_payout_allocations, dependent: :restrict_with_error, inverse_of: :teacher_payout

  validates :amount_cents, :method, :paid_at, presence: true
  validates :amount_cents, numericality: { only_integer: true, greater_than: 0 }
  validate :workspace_matches_teacher_profile

  private

  def workspace_matches_teacher_profile
    return if workspace.blank? || teacher_profile.blank?
    return if workspace_id == teacher_profile.workspace_id

    errors.add(:workspace_id, 'must match the teacher profile workspace')
  end
end
