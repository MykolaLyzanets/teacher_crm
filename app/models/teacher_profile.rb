# frozen_string_literal: true

class TeacherProfile < ApplicationRecord
  STATUSES = { active: 0, invited: 1, on_leave: 2, inactive: 3 }.freeze
  CONTACT_METHODS = { email: 0, phone: 1, either: 2 }.freeze
  LESSON_DURATIONS = [30, 45, 60, 90].freeze
  LESSON_FORMATS = %w[online in_person hybrid].freeze
  CALENDAR_COLORS = { olive: 0, slate: 1, amber: 2, plum: 3, terra: 4, teal: 5 }.freeze

  enum status: STATUSES
  enum preferred_contact_method: CONTACT_METHODS, _prefix: :contact
  enum calendar_color: CALENDAR_COLORS, _prefix: :calendar

  belongs_to :user, inverse_of: :teacher_profile
  belongs_to :workspace, inverse_of: :teacher_profiles
  has_many :student_profiles, foreign_key: :teacher_id, inverse_of: :teacher_profile, dependent: :nullify

  validates :first_name, presence: true
  validates :user_id, uniqueness: true
  validates :default_lesson_duration_minutes, inclusion: { in: LESSON_DURATIONS }, allow_nil: true
  validate :user_matches_workspace
  validate :lesson_formats_are_known

  def display_label
    display_name.presence || [first_name, last_name].compact_blank.join(' ').presence || 'Teacher'
  end

  def as_catalog
    {
      id:,
      firstName: first_name,
      lastName: last_name,
      displayName: display_label,
      photo:,
      jobTitle: job_title,
      status:,
      email: user&.email,
      phone:,
      preferredContactMethod: preferred_contact_method,
      timezone:,
      location:,
      subjects: Array(subjects),
      workspaceRole: user&.role,
      experienceYears: experience_years,
      languages: Array(languages),
      bio:,
      tags: Array(tags),
      workingDays: Array(working_days),
      workingHours: Array(working_hours),
      defaultLessonDurationMinutes: default_lesson_duration_minutes,
      lessonFormats: Array(lesson_formats),
      defaultMeetingLink: default_meeting_link,
      maxLessonsPerDay: max_lessons_per_day,
      calendarColor: calendar_color,
      inviteToWorkspace: true,
      invitationStatus: invited? ? 'sent' : 'active',
      notes:,
      createdAt: created_at&.iso8601
    }.with_indifferent_access
  end

  private

  def user_matches_workspace
    return if user.blank? || workspace.blank? || user.workspace_id == workspace_id

    errors.add(:workspace_id, 'must match the user workspace')
  end

  def lesson_formats_are_known
    unknown = Array(lesson_formats) - LESSON_FORMATS
    return if unknown.empty?

    errors.add(:lesson_formats, 'contains an unsupported format')
  end
end
