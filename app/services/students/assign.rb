# frozen_string_literal: true

module Students
  class Assign
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    def initialize(student_scope:, teacher_scope:, actor:, student_ids:, teacher_id:)
      @student_scope = student_scope
      @teacher_scope = teacher_scope
      @actor = actor
      @student_ids = Array(student_ids).compact_blank
      @teacher_id = teacher_id
    end

    attr_reader :errors, :teacher

    def save
      @errors = ActiveModel::Errors.new(self)
      resolve
      return false if errors.any?

      persist
      true
    rescue ArgumentError, ActiveRecord::RecordInvalid => e
      errors.add(:base, e.message)
      false
    end

    def error_messages
      errors.full_messages
    end

    def count
      @students&.size.to_i
    end

    def teacher_name
      teacher&.display_label
    end

    private

    attr_reader :student_scope, :teacher_scope, :actor, :student_ids, :teacher_id

    def resolve
      if student_ids.empty?
        errors.add(:base, I18n.t('app.students.assign_none'))
        return
      end

      @teacher = teacher_scope.find_by(id: teacher_id)
      if teacher.blank?
        errors.add(:base, I18n.t('app.students.assign_teacher_missing'))
        return
      end

      @students = student_scope.where(id: student_ids)
      errors.add(:base, I18n.t('app.students.assign_none')) if @students.empty?
    end

    def persist
      StudentProfile.transaction do
        @students.find_each { |student| student.assign_to!(teacher, assigned_by: actor) }
      end
    end
  end
end
