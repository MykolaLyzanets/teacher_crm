# frozen_string_literal: true

module Teachers
  class Create
    def initialize(workspace:, actor:, params:)
      @workspace = workspace
      @actor = actor
      @params = params
    end

    attr_reader :user, :teacher_profile, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      build_records
      validate
      return false if errors.any? || user.errors.any? || teacher_profile.errors.any?

      persist
      true
    rescue ActiveRecord::RecordInvalid => e
      errors.merge!(e.record.errors)
      false
    end

    def error_messages
      (
        errors.full_messages +
        Array(user&.errors&.full_messages) +
        Array(teacher_profile&.errors&.full_messages)
      ).uniq
    end

    private

    attr_reader :workspace, :actor, :params

    def build_records
      password = User.generate_password
      @user = User.new(
        email: params[:email].to_s.strip,
        full_name: resolved_full_name,
        role: :teacher,
        workspace:,
        password:,
        password_confirmation: password
      )
      @teacher_profile = TeacherProfile.new(profile_attrs)
      teacher_profile.user = user
      teacher_profile.workspace = workspace
    end

    def validate
      user.errors.add(:email, :blank) if user.email.blank?
      teacher_profile.errors.add(:first_name, :blank) if teacher_profile.first_name.blank?
      teacher_profile.errors.add(:last_name, :blank) if teacher_profile.last_name.blank?
    end

    def persist
      User.transaction do
        user.save!
        teacher_profile.save!
      end
      invite_user if send_invitation?
    end

    def invite_user
      user.send_reset_password_instructions
    end

    def send_invitation?
      return false unless ActiveModel::Type::Boolean.new.cast(params[:invite_to_workspace])

      params[:invitation_timing].to_s != 'create_pending'
    end

    def resolved_full_name
      display = params[:display_name].to_s.strip
      return display if display.present?

      [params[:first_name], params[:last_name]].map { |part| part.to_s.strip }.compact_blank.join(' ')
    end

    def profile_attrs
      {
        first_name: params[:first_name].to_s.strip,
        last_name: params[:last_name].to_s.strip,
        display_name: params[:display_name].to_s.strip.presence,
        job_title: params[:job_title].to_s.strip.presence,
        status: params[:status].presence || default_status,
        phone: params[:phone].to_s.strip.presence,
        preferred_contact_method: params[:preferred_contact_method].presence || 'email',
        timezone: params[:timezone].presence,
        location: params[:location].to_s.strip.presence,
        subjects: Array(params[:subjects]).compact_blank,
        experience_years: integer_or_nil(params[:experience_years]),
        bio: params[:bio].to_s.strip.presence,
        languages: Array(params[:languages]).compact_blank,
        tags: Array(params[:tags]).compact_blank,
        working_days: Array(params[:working_days]).compact_blank,
        working_hours: normalized_working_hours,
        default_lesson_duration_minutes: integer_or_nil(params[:default_lesson_duration_minutes]) || 60,
        max_lessons_per_day: integer_or_nil(params[:max_lessons_per_day]),
        lesson_formats: Array(params[:lesson_formats]).compact_blank.presence || %w[online],
        default_meeting_link: params[:default_meeting_link].to_s.strip.presence,
        calendar_color: params[:calendar_color].presence || 'olive',
        notes: params[:notes].to_s.strip.presence
      }
    end

    def default_status
      ActiveModel::Type::Boolean.new.cast(params[:invite_to_workspace]) ? 'invited' : 'active'
    end

    def normalized_working_hours
      hours = params[:working_hours]
      days = Array(params[:working_days]).compact_blank
      return [] unless hours.respond_to?(:to_h)

      days.filter_map do |day|
        row = hours[day] || hours[day.to_sym]
        next if row.blank?

        start_time = row[:start] || row['start'] || row[:startTime] || row['startTime']
        end_time = row[:end] || row['end'] || row[:endTime] || row['endTime']
        next if start_time.blank? || end_time.blank?

        { 'day' => day, 'startTime' => start_time, 'endTime' => end_time }
      end
    end

    def integer_or_nil(value)
      return if value.blank?

      Integer(value)
    rescue ArgumentError, TypeError
      nil
    end
  end
end
