# frozen_string_literal: true

class Workspace < ApplicationRecord
  enum workspace_type: { individual: 0, school: 1 }

  belongs_to :owner, class_name: 'User', inverse_of: :owned_workspace
  has_many :users, dependent: :restrict_with_error, inverse_of: :workspace
  has_many :teacher_profiles, dependent: :destroy, inverse_of: :workspace
  has_many :student_profiles, dependent: :destroy, inverse_of: :workspace

  validates :name, presence: true
  validate :owner_has_owner_role

  private

  def owner_has_owner_role
    return if owner.blank? || owner.owner?

    errors.add(:owner_id, 'must belong to a user with the owner role')
  end
end
