# frozen_string_literal: true

class StudentTransaction < ApplicationRecord
  include FinanceUahCurrency
  TRANSACTION_TYPES = {
    payment: 0,
    lesson_charge: 1,
    cancellation_charge: 2,
    adjustment: 3,
    refund: 4,
    opening_balance: 5,
    charge_reversal: 6,
    debt_allocation: 7
  }.freeze

  STATUSES = {
    pending: 0,
    confirmed: 1,
    rejected: 2
  }.freeze

  PAYMENT_METHODS = {
    cash: 0,
    bank_transfer: 1,
    card: 2,
    online: 3,
    other: 4
  }.freeze

  enum :transaction_type, TRANSACTION_TYPES, prefix: :transaction
  enum :status, STATUSES
  enum :method, PAYMENT_METHODS, prefix: :payment_method, allow_nil: true

  belongs_to :workspace, inverse_of: :student_transactions
  belongs_to :student_profile, inverse_of: :student_transactions
  belongs_to :lesson, optional: true, inverse_of: :student_transactions
  belongs_to :currency, inverse_of: :student_transactions
  belongs_to :created_by, class_name: 'User', inverse_of: :created_student_transactions
  belongs_to :confirmed_by, class_name: 'User', optional: true, inverse_of: :confirmed_student_transactions
  belongs_to :related_transaction, class_name: 'StudentTransaction', optional: true,
                                   inverse_of: :related_transactions
  has_many :related_transactions, class_name: 'StudentTransaction',
                                  foreign_key: :related_transaction_id,
                                  dependent: :restrict_with_error,
                                  inverse_of: :related_transaction

  validates :transaction_type, :status, :amount_cents, presence: true
  validates :amount_cents, numericality: { only_integer: true, other_than: 0 }
  validate :workspace_matches_student_profile
  validate :related_transaction_differs
  validate :confirmed_metadata_consistency

  private

  def workspace_matches_student_profile
    return if workspace.blank? || student_profile.blank?
    return if workspace_id == student_profile.workspace_id

    errors.add(:workspace_id, 'must match the student profile workspace')
  end

  def related_transaction_differs
    return if related_transaction_id.blank? || !persisted?
    return if related_transaction_id != id

    errors.add(:related_transaction_id, 'cannot reference itself')
  end

  def confirmed_metadata_consistency
    if status == 'confirmed'
      errors.add(:confirmed_by, 'is required when status is confirmed') if confirmed_by.blank?
      errors.add(:confirmed_at, 'is required when status is confirmed') if confirmed_at.blank?
    elsif confirmed_by.present? || confirmed_at.present?
      errors.add(:status, 'must be confirmed when confirmation metadata is present')
    end
  end
end
