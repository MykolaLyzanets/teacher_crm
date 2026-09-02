# frozen_string_literal: true

module Students
  class Update
    include Photo
    include Invite
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(student_profile:, actor:, params:)
      @student_profile = student_profile
      @user = student_profile.user
      @actor = actor
      @params = params
    end

    attr_reader :user, :student_profile, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      user.errors.clear
      student_profile.errors.clear
      assign_records
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

    attr_reader :actor, :params

    def assign_records
      email = params[:email].to_s.strip
      user.email = email if email.present?
      user.full_name = resolved_full_name
      student_profile.assign_attributes(profile_attrs)
      assign_teacher
    end

    def validate
      user.errors.add(:email, :blank) if user.email.blank?
      student_profile.errors.add(:first_name, :blank) if student_profile.first_name.blank?
      student_profile.errors.add(:last_name, :blank) if student_profile.last_name.blank?
      validate_photo!
      validate_invitation!
    end

    def persist
      User.transaction do
        persist_photo
        user.save!
        student_profile.save!
      end
      invite_user!
    end

    def assign_teacher
      return unless @assigned_teacher || params.key?(:teacher_id)

      if @assigned_teacher
        student_profile.teacher_profile = @assigned_teacher
        student_profile.assigned_at = Time.current
        student_profile.assigned_by = actor.id
        student_profile.assignment_revision = student_profile.assignment_revision.to_i + 1
      else
        student_profile.teacher_profile = nil
        student_profile.assigned_at = nil
        student_profile.assigned_by = nil
        student_profile.assignment_revision = student_profile.assignment_revision.to_i + 1
      end
    end

    def resolved_full_name
      preferred = params[:preferred_name].to_s.strip
      return preferred if preferred.present?

      [params[:first_name], params[:last_name]].map { |part| part.to_s.strip }.compact_blank.join(' ')
    end

    def profile_attrs
      resolve_teacher
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

    def resolve_teacher
      return unless params.key?(:teacher_id)

      id = params[:teacher_id].presence
      if id.blank?
        @assigned_teacher = nil
        return
      end

      @assigned_teacher = student_profile.workspace.teacher_profiles.find_by(id:)
      student_profile.errors.add(:teacher_id, :invalid) if @assigned_teacher.blank?
    end
  end
end
