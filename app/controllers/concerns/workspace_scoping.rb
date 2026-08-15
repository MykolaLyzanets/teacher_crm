# frozen_string_literal: true

module WorkspaceScoping
  extend ActiveSupport::Concern

  included do
    helper_method :current_workspace
  end

  private

  def current_workspace
    current_user&.workspace
  end

  def teacher_profiles_scope
    scoped = TeacherProfile.includes(:user, :student_profiles)
    return scoped if current_user.admin?
    return TeacherProfile.none if current_workspace.blank?

    scoped.where(workspace: current_workspace)
  end

  def student_profiles_scope
    scoped = StudentProfile.includes(:user, :teacher_profile).kept
    return scoped if current_user.admin?
    return StudentProfile.none if current_workspace.blank?

    scoped.where(workspace: current_workspace)
  end

  def require_workspace!
    return if current_workspace.present?

    redirect_to dashboard_path, alert: I18n.t('app.workspace.required')
  end
end
