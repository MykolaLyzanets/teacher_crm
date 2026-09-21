# frozen_string_literal: true

module Homework::DashboardReview
  extend ActiveSupport::Concern

  class_methods do
    def dashboard_review_items(records, now: Time.zone.now)
      Array(records).filter_map do |homework|
        next unless homework.computed_status(at: now) == 'submitted'

        homework.as_dashboard_review_item
      end
    end
  end

  def as_dashboard_review_item
    student_records = students.to_a
    primary = student_records.first
    student_name = primary&.display_label || I18n.t('app.common.student')
    extra = [student_records.size - 1, 0].max
    student_label = if extra.positive?
                      I18n.t('app.homework.more_students', name: student_name, count: extra)
                    else
                      student_name
                    end

    {
      id: id.to_s,
      title: title,
      studentName: student_label,
      dueDate: due_at.to_date.iso8601
    }.with_indifferent_access
  end
end
