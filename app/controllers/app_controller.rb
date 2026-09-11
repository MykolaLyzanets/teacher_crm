# frozen_string_literal: true

class AppController < ApplicationController
  include WorkspaceScoping

  prepend_before_action :authenticate_user!
  before_action :redirect_students_to_portal

  layout 'app'

  helper_method :app_page_stylesheet, :can_manage_teachers?, :can_assign_teacher?,
                :can_view_finance?, :can_manage_payments?, :can_override_schedule?,
                :staff_notifications, :unread_staff_count, :lesson_modal_request?

  private

  def app_page_stylesheet
    {
      'students' => 'students',
      'teachers' => 'teachers',
      'dashboard' => 'dashboard',
      'payments' => 'payments',
      'pages' => 'placeholder',
      'settings' => 'settings',
      'profiles' => 'settings'
    }[controller_name]
  end

  def lesson_modal_request?
    controller_name == 'lessons' &&
      %w[show complete_dialog cancel_dialog delete_dialog outcome_dialog].include?(action_name)
  end

  def redirect_students_to_portal
    return unless current_user.student?

    redirect_to student_root_path
  end

  def can_manage_teachers?
    current_user&.owner? && current_user.workspace&.school?
  end

  def can_assign_teacher?
    current_user&.owner? || current_user&.admin?
  end

  def require_owner_staff!
    return if can_manage_teachers?

    redirect_to dashboard_path, alert: I18n.t('app.teachers.forbidden')
  end

  def can_view_finance?
    current_user.owner? || current_user.admin?
  end

  def can_override_schedule?
    current_user.owner? || current_user.admin?
  end

  def can_manage_payments?
    can_view_finance?
  end

  def staff_notifications
    Demo::Catalog.notifications.select { |item| item[:audience].to_s == 'staff' }
  end

  def unread_staff_count
    staff_notifications.count { |item| !item[:read] }
  end

  def ensure_api_workspace!
    return if current_user.admin? || current_workspace.present?

    render json: { error: I18n.t('app.workspace.required') }, status: :forbidden
  end
end
