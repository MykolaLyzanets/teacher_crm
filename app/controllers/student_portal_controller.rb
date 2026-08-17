# frozen_string_literal: true

class StudentPortalController < ApplicationController
  prepend_before_action :authenticate_user!
  before_action :require_student!

  layout 'student_portal'

  def home
    redirect_to student_calendar_path
  end

  def calendar; end

  def homework; end

  def materials; end

  def profile; end

  def notifications; end

  private

  def require_student!
    return if current_user.student?

    redirect_to dashboard_path, alert: I18n.t('app.student_portal.staff_denied')
  end
end
