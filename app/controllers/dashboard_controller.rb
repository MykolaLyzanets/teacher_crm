# frozen_string_literal: true

class DashboardController < AppController
  helper LessonsHelper

  def index
    @now = Time.zone.now
    @teacher_view = current_user.teacher?
    if @teacher_view
      @dashboard = Demo::Dashboards.teacher(current_user_display_name, now: @now)
    else
      @dashboard = Demo::Dashboards.admin(now: @now)
      @lessons_by_date = Demo::Timeline.lessons.group_by { |lesson| lesson[:date].to_s }
    end
  end
end
