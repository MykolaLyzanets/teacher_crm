# frozen_string_literal: true

class AppController < ApplicationController
  include WorkspaceScoping

  prepend_before_action :authenticate_user!
  before_action :redirect_students_to_portal

  layout 'app'

  helper_method :app_page_stylesheet, :can_manage_teachers?, :can_assign_teacher?

  private

  def app_page_stylesheet
    {
      'students' => 'students',
      'teachers' => 'teachers',
      'calendar' => 'calendar',
      'dashboard' => 'dashboard',
      'lessons' => 'lessons',
      'pages' => 'placeholder'
    }[controller_name]
  end

  def redirect_students_to_portal
    return unless current_user.student?

    redirect_to student_calendar_path
  end

  def can_manage_teachers?
    current_user.owner? || current_user.admin?
  end

  def can_assign_teacher?
    can_manage_teachers?
  end

  def require_owner_staff!
    return if can_manage_teachers?

    redirect_to dashboard_path, alert: I18n.t('app.teachers.forbidden')
  end
end
