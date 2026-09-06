# frozen_string_literal: true

class Subject < ApplicationRecord
  belongs_to :teacher_profile, foreign_key: :teacher_id, inverse_of: :taught_subjects
  has_many :lesson_types, dependent: :restrict_with_error, inverse_of: :subject
  has_many :lessons, dependent: :restrict_with_error, inverse_of: :subject

  before_validation :normalize_name

  validates :name, presence: true
  validates :name, uniqueness: { scope: :teacher_id, case_sensitive: false }

  private

  def normalize_name
    self.name = name.to_s.strip.gsub(/[[:space:]]+/, ' ')
  end
end
