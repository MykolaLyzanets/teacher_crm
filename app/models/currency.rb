# frozen_string_literal: true

class Currency < ApplicationRecord
  has_many :student_transactions, dependent: :restrict_with_error, inverse_of: :currency
  has_many :teacher_earnings, dependent: :restrict_with_error, inverse_of: :currency
  has_many :teacher_payouts, dependent: :restrict_with_error, inverse_of: :currency

  validates :code, presence: true, uniqueness: { case_sensitive: true }
  validates :name, :symbol, presence: true
  validates :subunit_to_unit, numericality: { only_integer: true, greater_than: 0 }
  validate :only_one_default

  scope :active, -> { where(active: true) }

  def default?
    self[:default]
  end

  private

  def only_one_default
    return if !self[:default]

    scope = self.class.where(default: true)
    scope = scope.where.not(id:) if persisted?
    return if !scope.exists?

    errors.add(:default, 'only one currency can be marked as default')
  end
end
