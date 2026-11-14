# frozen_string_literal: true

class TeacherProfile < ApplicationRecord
  STATUSES = { active: 0, invited: 1, on_leave: 2, inactive: 3, archived: 4 }.freeze
  CONTACT_METHODS = { email: 0, phone: 1, either: 2 }.freeze
  LESSON_DURATIONS = [30, 45, 60, 90].freeze
  LESSON_FORMATS = %w[online in_person hybrid].freeze
  DEFAULT_TIMEZONE = 'Europe/Kyiv'
  DEFAULT_COMPENSATION_PERCENT = 60
  DEFAULT_LESSON_DURATION_MINUTES = 60

  enum status: STATUSES
  enum preferred_contact_method: CONTACT_METHODS, _prefix: :contact
  enum calendar_color: TeacherCalendarColors.enum_definition, _prefix: :calendar

  mount_uploader :photo, ImageUploader

  belongs_to :user, inverse_of: :teacher_profile
  belongs_to :workspace, inverse_of: :teacher_profiles
  has_many :student_profiles, foreign_key: :teacher_id, inverse_of: :teacher_profile, dependent: :nullify
  has_many :taught_subjects, class_name: 'Subject', foreign_key: :teacher_id, inverse_of: :teacher_profile,
                             dependent: :destroy
  has_many :lesson_types, through: :taught_subjects
  has_many :lessons, foreign_key: :teacher_id, inverse_of: :teacher_profile, dependent: :restrict_with_error
  has_many :homeworks, foreign_key: :teacher_id, inverse_of: :teacher, dependent: :restrict_with_error
  has_many :materials, foreign_key: :teacher_id, inverse_of: :teacher, dependent: :restrict_with_error
  has_many :teacher_absences, foreign_key: :teacher_id, inverse_of: :teacher_profile, dependent: :destroy
  has_many :teacher_earnings, dependent: :restrict_with_error, inverse_of: :teacher_profile
  has_many :teacher_payouts, dependent: :restrict_with_error, inverse_of: :teacher_profile

  validates :first_name, presence: true
  validates :user_id, uniqueness: true
  validates :default_lesson_duration_minutes, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :compensation_percent, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            if: :compensation_percent_attribute?
  validate :user_matches_workspace
  validate :lesson_formats_are_known

  def display_label
    display_name.presence || [first_name, last_name].compact_blank.join(' ').presence || 'Teacher'
  end

  def time_zone
    Time.find_zone(timezone.presence) || Time.find_zone(DEFAULT_TIMEZONE)
  end

  def photo_url
    photo.url if photo.present?
  end

  def compensation_rate
    return DEFAULT_COMPENSATION_PERCENT unless compensation_percent_attribute?
    return DEFAULT_COMPENSATION_PERCENT if compensation_percent.nil?

    compensation_percent
  end

  def compensation_setup_json
    return '{}' unless has_attribute?(:compensation_setup)

    compensation_setup.presence&.to_json || '{}'
  end

  def lesson_catalog_json
    modes = catalog_delivery_modes
    rows = taught_subjects.includes(:lesson_types).order(:name).map do |subject|
      {
        id: subject.id,
        name: subject.name,
        isActive: subject.is_active,
        lessonTypes: subject.lesson_types.sort_by(&:name).map do |type|
          {
            id: type.id,
            name: type.name,
            kind: type.kind,
            mode: type.mode,
            defaultDurationMinutes: type.default_duration_minutes,
            deliveryModes: modes,
            isActive: type.is_active
          }
        end
      }
    end
    rows.to_json
  end

  def as_catalog(assigned_count: nil)
    {
      id:,
      firstName: first_name,
      lastName: last_name,
      displayName: display_label,
      photo: photo_url,
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
      availabilitySlots: availability_slots_for_catalog,
      defaultLessonDurationMinutes: default_lesson_duration_minutes || DEFAULT_LESSON_DURATION_MINUTES,
      lessonFormats: Array(lesson_formats),
      defaultMeetingLink: default_meeting_link,
      maxLessonsPerDay: max_lessons_per_day,
      calendarColor: calendar_color,
      calendarColorHex: TeacherCalendarColors.hex_for(calendar_color),
      compensationPercent: compensation_rate,
      inviteToWorkspace: true,
      invitationStatus: invited? ? 'sent' : 'active',
      notes:,
      assignedCount: assigned_count.nil? ? student_profiles.kept.count : assigned_count.to_i,
      createdAt: created_at&.iso8601
    }.with_indifferent_access
  end

  private

  def compensation_percent_attribute?
    has_attribute?(:compensation_percent)
  end

  def user_matches_workspace
    return if user.blank? || workspace.blank? || user.workspace_id == workspace_id

    errors.add(:workspace_id, 'must match the user workspace')
  end

  def lesson_formats_are_known
    unknown = Array(lesson_formats) - LESSON_FORMATS
    return if unknown.empty?

    errors.add(:lesson_formats, 'contains an unsupported format')
  end

  def availability_slots_for_catalog
    return [] unless has_attribute?(:availability_slots)

    TeacherAvailability.slots_for_form(self)
  end

  def catalog_delivery_modes
    modes = Array(lesson_formats).map(&:to_s) & %w[online in_person]
    modes = ['online'] if modes.empty?
    modes
  end
end
