# frozen_string_literal: true

module HomeworkStudent::PortalQueryable
  extend ActiveSupport::Concern

  DUE_SOON_DAYS = 2

  included do
    scope :portal_ordered, -> { joins(:homework).order(Arel.sql('homeworks.due_at ASC')) }
  end

  class_methods do
    def portal_scope(student_profile)
      return none if student_profile.blank?

      portal_ordered
        .includes(
          { homework_response: [:reviewed_by, :materials] },
          homework: [:teacher, :materials, { lesson: %i[subject lesson_type teacher_profile] }]
        )
        .where(student_id: student_profile.id)
        .where(homeworks: { workspace_id: student_profile.workspace_id })
    end

    def portal_items_for(student_profile)
      portal_scope(student_profile).map(&:as_student_portal_item)
    end

    def portal_summary(records, today: Date.current)
      todo = submitted = needs_attention = reviewed = 0
      Array(records).each do |record|
        item = record.is_a?(Hash) ? record : record.as_student_portal_item
        tab = item[:tab].to_s
        todo += 1 if tab == 'todo'
        submitted += 1 if tab == 'submitted'
        reviewed += 1 if tab == 'reviewed'
        facing = item[:facing].to_s
        due = item[:dueContext] || {}
        needs_attention += 1 if facing == 'overdue' || facing == 'resubmission_requested' || (tab == 'todo' && due[:urgent])
      end
      { todo:, submitted:, reviewed:, needsAttention: needs_attention }
    end

    def nearest_todo_item(student_profile, today: Date.current)
      at = today.in_time_zone
      portal_scope(student_profile)
        .select { |record| record.portal_tab(at:) == 'todo' }
        .min_by { |record| [record.facing_status(at:) == 'overdue' ? 0 : 1, record.homework.due_at.to_i] }
        &.as_student_portal_item
    end
  end
end
