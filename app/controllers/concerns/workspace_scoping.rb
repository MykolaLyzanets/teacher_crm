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

    scoped = scoped.where(workspace: current_workspace)
    return scoped if current_user.owner?

    if current_user.teacher?
      teacher_id = current_user.teacher_profile&.id
      return scoped.none if teacher_id.blank?

      return scoped.where(teacher_id:)
    end

    StudentProfile.none
  end

  def require_workspace!
    return if current_workspace.present?

    redirect_to dashboard_path, alert: I18n.t('app.workspace.required')
  end
end
