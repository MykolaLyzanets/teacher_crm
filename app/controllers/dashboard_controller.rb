# frozen_string_literal: true

class DashboardController < AppController
  helper LessonsHelper

  def index
    @now = Time.zone.now
    @teacher_view = current_user.teacher?
    lessons = catalog_lessons
    if @teacher_view
      homework_records = homeworks_scope.includes(:students).ordered_by_due.to_a
      homework_review = Homework.dashboard_review_items(homework_records, now: @now)
      @dashboard = Demo::Dashboards.teacher(
        helpers.current_user_display_name,
        lessons:,
        now: @now,
        homework_review:
      )
    else
      @dashboard = Demo::Dashboards.admin(lessons:, now: @now)
      @lessons_by_date = lessons.group_by { |lesson| lesson[:date].to_s }
    end
  end
end
