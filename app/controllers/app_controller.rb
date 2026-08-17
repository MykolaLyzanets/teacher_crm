# frozen_string_literal: true

class AppController < ApplicationController
  include WorkspaceScoping

  prepend_before_action :authenticate_user!
  before_action :redirect_students_to_portal

  layout 'app'

  helper_method :app_page_stylesheet

  private

  def app_page_stylesheet
    {
      'students' => 'students',
      'teachers' => 'teachers',
      'calendar' => 'calendar',
      'dashboard' => 'dashboard',
      'pages' => 'placeholder'
    }[controller_name]
  end

  def redirect_students_to_portal
    return unless current_user.student?

    redirect_to student_calendar_path
  end
end
