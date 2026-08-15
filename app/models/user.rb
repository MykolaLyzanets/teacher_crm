# frozen_string_literal: true

class User < ApplicationRecord
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :validatable,
         :omniauthable,
         omniauth_providers: [:google_oauth2]

  attr_accessor :skip_workspace_presence

  enum role: { owner: 0, teacher: 1, student: 2, admin: 3 }

  belongs_to :workspace, optional: true, inverse_of: :users
  has_one :owned_workspace, class_name: 'Workspace', foreign_key: :owner_id, inverse_of: :owner,
                            dependent: :restrict_with_error
  has_one :teacher_profile, dependent: :destroy, inverse_of: :user
  has_one :student_profile, dependent: :destroy, inverse_of: :user
  has_many :assigned_student_profiles, class_name: 'StudentProfile', foreign_key: :assigned_by,
                                       inverse_of: :assigned_by_user, dependent: :nullify

  validates :full_name, presence: true, length: { minimum: 2 }
  validates :workspace, presence: true, unless: :workspace_optional?
  validates :workspace_id, absence: true, if: :admin?
  validate :single_profile_type

  def self.generate_password
    "Aa1#{SecureRandom.base58(12)}"
  end

  private

  def workspace_optional?
    admin? || skip_workspace_presence
  end

  def single_profile_type
    return unless teacher_profile && student_profile

    errors.add(:base, 'cannot have both a teacher profile and a student profile')
  end
end
