# frozen_string_literal: true

module Demo
  class Seeder
    DEMO_PASSWORD = 'DemoPass123'
    WORKSPACE_NAME = 'Danlio Demo'

    def self.call
      new.call
    end

    def call
      return if User.exists?(email: 'ava.thompson@example.com')

      User.transaction do
        seed_workspace
      end
    end

    private

    def seed_workspace
      teachers = Demo::Catalog.teachers
      owner_row = teachers.find { |row| row[:workspaceRole].to_s == 'administrator' } || teachers.first
      owner = create_owner!(owner_row)
      workspace = create_workspace!(owner)
      owner.update!(workspace:)

      profiles = {}
      teachers.each do |row|
        profiles[row[:id].to_s] = create_teacher!(row, workspace, owner)
      end

      Demo::Catalog.students.each do |row|
        create_student!(row, workspace, owner, profiles)
      end
    end

    def create_owner!(row)
      User.create!(
        email: row[:email],
        full_name: full_name_for(row),
        role: :owner,
        password: DEMO_PASSWORD,
        password_confirmation: DEMO_PASSWORD,
        skip_workspace_presence: true
      )
    end

    def create_workspace!(owner)
      Workspace.create!(
        name: WORKSPACE_NAME,
        workspace_type: :school,
        owner:
      )
    end

    def create_teacher!(row, workspace, owner)
      user = if owner.email == row[:email]
               owner
             else
               password = DEMO_PASSWORD
               User.create!(
                 email: row[:email],
                 full_name: full_name_for(row),
                 role: :teacher,
                 workspace:,
                 password:,
                 password_confirmation: password
               )
             end

      TeacherProfile.create!(
        user:,
        workspace:,
        first_name: row[:firstName],
        last_name: row[:lastName],
        display_name: row[:displayName],
        job_title: row[:jobTitle],
        status: row[:status].presence || 'active',
        phone: row[:phone],
        preferred_contact_method: row[:preferredContactMethod].presence || 'email',
        timezone: row[:timezone],
        location: row[:location],
        subjects: Array(row[:subjects]),
        experience_years: row[:experienceYears],
        bio: row[:bio],
        languages: Array(row[:languages]),
        tags: Array(row[:tags]),
        working_days: Array(row[:workingDays]),
        working_hours: Array(row[:workingHours]),
        default_lesson_duration_minutes: row[:defaultLessonDurationMinutes] || 60,
        max_lessons_per_day: row[:maxLessonsPerDay],
        lesson_formats: Array(row[:lessonFormats]).presence || %w[online],
        default_meeting_link: row[:defaultMeetingLink],
        calendar_color: row[:calendarColor].presence || 'olive',
        notes: row[:notes],
        created_at: parse_time(row[:createdAt]) || Time.current,
        updated_at: parse_time(row[:createdAt]) || Time.current
      )
    end

    def create_student!(row, workspace, owner, teacher_map)
      email = row[:email].presence || "demo.#{row[:id]}@example.com"
      teacher = teacher_map[row[:teacherId].to_s]
      password = DEMO_PASSWORD
      user = User.create!(
        email:,
        full_name: full_name_for(row),
        role: :student,
        workspace:,
        password:,
        password_confirmation: password
      )

      assigned = teacher.present?
      StudentProfile.create!(
        user:,
        workspace:,
        teacher_profile: teacher,
        first_name: row[:firstName],
        last_name: row[:lastName],
        preferred_name: row[:preferredName],
        date_of_birth: parse_date(row[:dateOfBirth]),
        gender: row[:gender],
        status: row[:status].presence || 'active',
        assignment_revision: row[:assignmentRevision].to_i,
        assigned_at: assigned ? parse_time(row[:assignedAt]) : nil,
        assigned_by: assigned ? owner.id : nil,
        phone: row[:phone],
        address: row[:address],
        parent_name: row[:parentName],
        relationship: row[:relationship],
        parent_email: row[:parentEmail],
        parent_phone: row[:parentPhone],
        grade: row[:grade],
        student_code: row[:studentCode],
        enrollment_date: parse_date(row[:enrollmentDate]),
        academic_year: row[:academicYear],
        level: row[:level],
        subjects: Array(row[:subjects]),
        location_preference: row[:locationPreference],
        preferred_days: Array(row[:preferredDays]),
        notes: row[:notes],
        deleted_at: parse_time(row[:deletedAt]),
        created_at: parse_time(row[:createdAt]) || Time.current,
        updated_at: parse_time(row[:createdAt]) || Time.current
      )
    end

    def full_name_for(row)
      row[:displayName].presence ||
        [row[:firstName], row[:lastName]].compact_blank.join(' ').presence ||
        row[:email].to_s.split('@').first
    end

    def parse_time(value)
      return if value.blank?

      Time.zone.parse(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def parse_date(value)
      return if value.blank?

      Date.iso8601(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end
  end
end
