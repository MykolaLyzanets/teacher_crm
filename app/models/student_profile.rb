# frozen_string_literal: true

class StudentProfile < ApplicationRecord
  STATUSES = { active: 0, trial: 1, paused: 2, archived: 3 }.freeze
  GENDERS = %w[female male non_binary prefer_not].freeze
  RELATIONSHIPS = %w[mother father parent guardian other].freeze
  LOCATIONS = %w[online in_person hybrid].freeze

  enum status: STATUSES

  mount_uploader :photo, ImageUploader

  belongs_to :user, inverse_of: :student_profile
  belongs_to :workspace, inverse_of: :student_profiles
  belongs_to :teacher_profile, foreign_key: :teacher_id, optional: true, inverse_of: :student_profiles
  belongs_to :assigned_by_user, class_name: 'User', foreign_key: :assigned_by, optional: true,
                                inverse_of: :assigned_student_profiles

  validates :first_name, presence: true
  validates :user_id, uniqueness: true
  validates :gender, inclusion: { in: GENDERS }, allow_blank: true
  validates :relationship, inclusion: { in: RELATIONSHIPS }, allow_blank: true
  validates :emergency_relationship, inclusion: { in: RELATIONSHIPS }, allow_blank: true
  validates :location_preference, inclusion: { in: LOCATIONS }, allow_blank: true
  validate :user_matches_workspace
  validate :teacher_matches_workspace

  scope :kept, -> { where(deleted_at: nil) }

  def self.optional_date(value)
    raw = value.to_s.strip
    return if raw.blank?

    Date.iso8601(raw)
  rescue ArgumentError, TypeError
    nil
  end

  def display_label
    preferred_name.presence || [first_name, last_name].compact_blank.join(' ').presence || 'Student'
  end

  def photo_url
    photo.url if photo.present?
  end

  def assign_to!(teacher_profile, assigned_by:)
    unless workspace_id == teacher_profile.workspace_id
      raise ArgumentError, 'student and teacher must belong to the same workspace'
    end

    update!(
      teacher_profile:,
      assigned_at: Time.current,
      assigned_by: assigner_id(assigned_by),
      assignment_revision: assignment_revision.to_i + 1
    )
  end

  def unassign!
    update!(
      teacher_profile: nil,
      assigned_at: nil,
      assigned_by: nil,
      assignment_revision: assignment_revision.to_i + 1
    )
  end

  def as_catalog
    {
      id:,
      firstName: first_name,
      lastName: last_name,
      preferredName: preferred_name,
      photo: photo_url,
      dateOfBirth: date_of_birth&.iso8601,
      gender:,
      status:,
      email: user&.email,
      phone:,
      address:,
      teacherId: teacher_id,
      teacher: teacher_profile&.display_label,
      assignmentRevision: assignment_revision,
      assignedAt: assigned_at&.iso8601,
      assignedBy: self[:assigned_by],
      grade:,
      studentCode: student_code,
      enrollmentDate: enrollment_date&.iso8601,
      academicYear: academic_year,
      subjects: Array(subjects),
      level:,
      locationPreference: location_preference,
      preferredDays: Array(preferred_days),
      preferredTimeNotes: preferred_time_notes,
      parentName: parent_name,
      relationship:,
      parentEmail: parent_email,
      parentPhone: parent_phone,
      emergencyName: emergency_name,
      emergencyRelationship: emergency_relationship,
      emergencyPhone: emergency_phone,
      notes:,
      deletedAt: deleted_at&.iso8601,
      createdAt: created_at&.iso8601
    }.with_indifferent_access
  end

  private

  def assigner_id(assigner)
    assigner.respond_to?(:id) ? assigner.id : assigner
  end

  def user_matches_workspace
    return if user.blank? || workspace.blank? || user.workspace_id == workspace_id

    errors.add(:workspace_id, 'must match the user workspace')
  end

  def teacher_matches_workspace
    return if teacher_profile.blank? || teacher_profile.workspace_id == workspace_id

    errors.add(:teacher_id, 'must belong to the same workspace')
  end
end
