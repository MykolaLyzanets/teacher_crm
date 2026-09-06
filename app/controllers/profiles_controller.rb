# frozen_string_literal: true

class ProfilesController < AppController
  before_action :require_workspace!
  before_action :ensure_teacher_profile

  def show
    @teacher = catalog_teacher
  end

  def update
    if persist_profile
      redirect_to profile_path, notice: I18n.t('app.profile.saved')
    else
      @teacher = catalog_teacher
      flash.now[:alert] = @profile_errors.to_sentence
      render :show, status: :unprocessable_entity
    end
  end

  private

  def ensure_teacher_profile
    @teacher_profile = current_user.teacher_profile || create_own_teacher_profile
    return if @teacher_profile

    redirect_to dashboard_path, alert: I18n.t('app.workspace.required')
  end

  def persist_profile
    @profile_errors = []
    ApplicationRecord.transaction do
      current_user.assign_attributes(user_attrs)
      @teacher_profile.assign_attributes(profile_attrs)
      unless current_user.save
        @profile_errors.concat(current_user.errors.full_messages)
        raise ActiveRecord::Rollback
      end
      unless @teacher_profile.save
        @profile_errors.concat(@teacher_profile.errors.full_messages)
        raise ActiveRecord::Rollback
      end
    end
    @profile_errors.blank?
  end

  def user_attrs
    email = params[:email].to_s.strip
    {
      email: email.presence || current_user.email,
      full_name: resolved_full_name
    }
  end

  def profile_attrs
    {
      first_name: params[:first_name].to_s.strip,
      last_name: params[:last_name].to_s.strip.presence,
      phone: params[:phone].to_s.strip.presence,
      timezone: params[:timezone].presence || @teacher_profile.timezone
    }
  end

  def resolved_full_name
    [params[:first_name], params[:last_name]].map { |part| part.to_s.strip }.compact_blank.join(' ').presence ||
      current_user.full_name
  end

  def catalog_teacher
    @teacher_profile.as_catalog
  end

  def create_own_teacher_profile
    return unless current_user.owner? || current_user.teacher?

    first_name, last_name = split_name(current_user.full_name)
    TeacherProfile.create!(
      user: current_user,
      workspace: current_workspace,
      first_name:,
      last_name:,
      display_name: current_user.full_name,
      status: :active,
      preferred_contact_method: :email,
      timezone: TeacherProfile::DEFAULT_TIMEZONE,
      default_lesson_duration_minutes: 60,
      calendar_color: :olive,
      working_days: %w[Monday Tuesday Wednesday Thursday Friday],
      lesson_formats: %w[online]
    )
  end

  def split_name(full_name)
    parts = full_name.to_s.strip.split(/\s+/, 2)
    [parts[0].presence || 'Teacher', parts[1]]
  end
end
