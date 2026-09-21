# frozen_string_literal: true

class StudentPortalController < ApplicationController
  prepend_before_action :authenticate_user!
  before_action :require_student!
  before_action :load_portal_context

  layout 'student_portal'
  helper LessonsHelper

  def home
    @finance = Demo::Finance.portal_finance(@catalog_student_id) if @catalog_student_id
    profile = current_user.student_profile
    @nearest_homework = HomeworkStudent.nearest_todo_item(profile) if profile.present?
    @recent_materials = Array(@materials_items).first(3)
  end

  def calendar; end

  def homework; end

  def materials; end

  def payments
    @finance = Demo::Finance.portal_finance(@catalog_student_id) if @catalog_student_id
  end

  def profile; end

  def notifications
    items = Demo::Catalog.notifications.select do |item|
      item[:audience].to_s == 'student' && item[:recipientId].to_s == @catalog_student_id.to_s
    end
    @notifications = items.sort_by { |item| item[:createdAt].to_s }.reverse
  end

  private

  def require_student!
    unless current_user.student?
      redirect_to dashboard_path, alert: I18n.t('app.student_portal.staff_denied')
      return
    end
    return unless current_user.student_profile&.archived?

    sign_out current_user
    redirect_to new_user_session_path, alert: I18n.t('app.students.not_found_text')
  end

  def load_portal_context
    profile = current_user.student_profile
    @catalog_student = Demo::Catalog.match_student(portal_student_record(profile)) ||
                       Demo::Catalog.active_students.first
    @catalog_student_id = @catalog_student&.dig(:id)
    @portal_lessons = Demo::Portal.lessons_for_student(profile)
    @next_lesson = Demo::Finance.next_lesson_for_student(profile)
    load_portal_demo_extras
  end

  def portal_student_record(profile)
    {
      email: current_user.email,
      firstName: profile&.first_name,
      lastName: profile&.last_name,
      preferredName: profile&.preferred_name
    }
  end

  def load_portal_demo_extras
    load_portal_homework
    return if @catalog_student_id.blank?

    @materials_items = Demo::Portal.materials_for(@catalog_student_id)
    @materials_badge = Demo::Portal.new_materials_count(@materials_items)
  end

  def load_portal_homework
    profile = current_user.student_profile
    return if profile.blank?

    @homework_records = HomeworkStudent.portal_scope(profile).to_a
    @homework_items = @homework_records.map(&:as_student_portal_item)
    @homework_summary = HomeworkStudent.portal_summary(@homework_records)
    @homework_badge = @homework_summary[:needsAttention]
  end
end
