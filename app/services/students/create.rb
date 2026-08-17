# frozen_string_literal: true

module Students
  class Create
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(workspace:, actor:, params:)
      @workspace = workspace
      @actor = actor
      @params = params
    end

    attr_reader :user, :student_profile, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      build_records
      validate
      return false if errors.any? || user.errors.any? || student_profile.errors.any?

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
        Array(student_profile&.errors&.full_messages)
      ).uniq
    end

    private

    attr_reader :workspace, :actor, :params

    def build_records
      password = User.generate_password
      @user = User.new(
        email: params[:email].to_s.strip,
        full_name: resolved_full_name,
        role: :student,
        workspace:,
        password:,
        password_confirmation: password
      )
      @student_profile = StudentProfile.new(profile_attrs)
      student_profile.user = user
      student_profile.workspace = workspace
    end

    def validate
      user.errors.add(:email, :blank) if user.email.blank?
      student_profile.errors.add(:first_name, :blank) if student_profile.first_name.blank?
      student_profile.errors.add(:last_name, :blank) if student_profile.last_name.blank?
      resolve_teacher
    end

    def persist
      User.transaction do
        user.save!
        assign_teacher if @assigned_teacher
        student_profile.save!
      end
    end

    def assign_teacher
      student_profile.teacher_profile = @assigned_teacher
      student_profile.assigned_at = Time.current
      student_profile.assigned_by = actor.id
      student_profile.assignment_revision = 1
    end

    def resolve_teacher
      id = params[:teacher_id].presence
      return if id.blank?

      @assigned_teacher = workspace.teacher_profiles.find_by(id:)
      return if @assigned_teacher.present?

      student_profile.errors.add(:teacher_id, :invalid)
    end

    def resolved_full_name
      preferred = params[:preferred_name].to_s.strip
      return preferred if preferred.present?

      [params[:first_name], params[:last_name]].map { |part| part.to_s.strip }.compact_blank.join(' ')
    end

    def profile_attrs
      {
        first_name: params[:first_name].to_s.strip,
        last_name: params[:last_name].to_s.strip,
        preferred_name: params[:preferred_name].to_s.strip.presence,
        date_of_birth: params[:date_of_birth].presence,
        gender: params[:gender].to_s.strip.presence,
        status: params[:status].presence || 'active',
        phone: params[:phone].to_s.strip.presence,
        address: params[:address].to_s.strip.presence,
        parent_name: params[:parent_name].to_s.strip.presence,
        relationship: params[:relationship].to_s.strip.presence,
        parent_email: params[:parent_email].to_s.strip.presence,
        parent_phone: params[:parent_phone].to_s.strip.presence,
        grade: params[:grade].to_s.strip.presence,
        student_code: params[:student_code].to_s.strip.presence,
        enrollment_date: params[:enrollment_date].presence,
        academic_year: params[:academic_year].to_s.strip.presence,
        level: params[:level].to_s.strip.presence,
        subjects: Array(params[:subjects]).compact_blank,
        location_preference: params[:location_preference].presence || 'online',
        preferred_days: Array(params[:preferred_days]).compact_blank,
        preferred_time_notes: params[:preferred_time_notes].to_s.strip.presence,
        emergency_name: params[:emergency_name].to_s.strip.presence,
        emergency_relationship: params[:emergency_relationship].to_s.strip.presence,
        emergency_phone: params[:emergency_phone].to_s.strip.presence,
        notes: params[:notes].to_s.strip.presence
      }
    end
  end
end
