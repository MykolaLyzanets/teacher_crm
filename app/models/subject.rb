# frozen_string_literal: true

class Subject < ApplicationRecord
  belongs_to :workspace
  belongs_to :teacher_profile, foreign_key: :teacher_id, optional: true, inverse_of: :taught_subjects
  has_many :lesson_types, dependent: :restrict_with_error, inverse_of: :subject
  has_many :lessons, dependent: :restrict_with_error, inverse_of: :subject

  scope :catalog, -> { where(teacher_id: nil) }

  before_validation :normalize_name
  before_validation :sync_workspace_from_teacher

  validates :name, presence: true
  validates :name, uniqueness: { scope: :workspace_id, case_sensitive: false }, if: :catalog?
  validates :name, uniqueness: { scope: :teacher_id, case_sensitive: false }, if: :teacher_owned?
  validates :workspace_id, presence: true

  def catalog?
    teacher_id.nil?
  end

  def teacher_owned?
    teacher_id.present?
  end

  private

  def normalize_name
    self.name = name.to_s.strip.gsub(/[[:space:]]+/, ' ')
  end

  def sync_workspace_from_teacher
    self.workspace_id ||= teacher_profile&.workspace_id
  end
end
