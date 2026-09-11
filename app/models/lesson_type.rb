# frozen_string_literal: true

class LessonType < ApplicationRecord
  KINDS = { individual: 0, group: 1, trial: 2, custom: 3 }.freeze
  MODES = { individual: 0, group: 1 }.freeze

  enum kind: KINDS, _prefix: true
  enum mode: MODES, _prefix: true

  belongs_to :subject, inverse_of: :lesson_types
  has_many :lessons, dependent: :restrict_with_error, inverse_of: :lesson_type

  before_validation :normalize_name

  validates :name, presence: true
  validates :name, uniqueness: { scope: :subject_id, case_sensitive: false }
  validates :kind, :mode, presence: true
  validates :default_duration_minutes, numericality: { only_integer: true, greater_than: 0 }
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  def as_catalog
    {
      id:,
      name:,
      kind:,
      mode:,
      defaultDurationMinutes: default_duration_minutes,
      priceCents: price_cents,
      currency:,
      isActive: is_active,
      subjectId: subject_id
    }
  end

  private

  def normalize_name
    self.name = name.to_s.strip.gsub(/[[:space:]]+/, ' ')
  end
end
