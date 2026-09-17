# frozen_string_literal: true

class DashboardController < AppController
  helper LessonsHelper

  def index
    @now = Time.zone.now
    @teacher_view = current_user.teacher?
    lessons = catalog_lessons
    if @teacher_view
      @dashboard = Demo::Dashboards.teacher(helpers.current_user_display_name, lessons:, now: @now)
    else
      @dashboard = Demo::Dashboards.admin(lessons:, now: @now)
      @lessons_by_date = lessons.group_by { |lesson| lesson[:date].to_s }
    end
  end
end
