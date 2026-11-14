# frozen_string_literal: true

class TeacherAbsence < ApplicationRecord
  ABSENCE_TYPES = {
    sick_leave: 0,
    vacation: 1,
    personal: 2,
    emergency: 3,
    other: 4
  }.freeze

  enum absence_type: ABSENCE_TYPES, _prefix: :absence

  belongs_to :teacher_profile, foreign_key: :teacher_id, inverse_of: :teacher_absences
  has_many :lessons, dependent: :nullify, inverse_of: :teacher_absence

  attr_accessor :skip_assigned_lesson_check

  validates :starts_on, :ends_on, presence: true
  validates :reason_detail, presence: true, if: :absence_other?
  validate :ends_on_not_before_starts_on
  validate :no_overlapping_period
  validate :no_assigned_lessons_in_period

  scope :ordered, -> { order(starts_on: :desc, created_at: :desc) }

  scope :covering, lambda { |date|
    where('starts_on <= ? AND ends_on >= ?', date, date)
  }

  scope :overlapping_period, lambda { |start_on, end_on|
    where('starts_on <= ? AND ends_on >= ?', end_on, start_on)
  }

  def self.covers_date?(teacher_id, date)
    return false if teacher_id.blank? || date.blank?

    where(teacher_id: teacher_id).covering(date).exists?
  end

  private

  def ends_on_not_before_starts_on
    return if starts_on.blank? || ends_on.blank?
    return if ends_on >= starts_on

    errors.add(:ends_on, :greater_than_or_equal_to, count: starts_on)
  end

  def no_overlapping_period
    return if teacher_id.blank? || starts_on.blank? || ends_on.blank?

    overlap = self.class.where(teacher_id: teacher_id).overlapping_period(starts_on, ends_on)
    overlap = overlap.where.not(id: id) if persisted?
    return if !overlap.exists?

    errors.add(:base, I18n.t('app.teachers.absence_period_overlap'))
  end

  def no_assigned_lessons_in_period
    return if skip_assigned_lesson_check
    return if teacher_id.blank? || starts_on.blank? || ends_on.blank?

    workspace_id = teacher_profile&.workspace_id
    return if workspace_id.blank?

    scope = TeacherProfile.where(workspace_id: workspace_id)
    count = Teachers::AbsenceAffectedLessons.new(absence: self, workspace_teachers_scope: scope).assigned_lesson_count
    return if count.zero?

    errors.add(:base, I18n.t('app.teachers.absence_assigned_lessons_block', count: count))
  end
end
