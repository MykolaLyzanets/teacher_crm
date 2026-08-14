# frozen_string_literal: true

class CalendarController < AppController
  def index
    @lessons = Array(Demo::Catalog.lessons).map { |row| row.with_indifferent_access }
    @teachers = Array(Demo::Catalog.teachers).map { |row| row.with_indifferent_access }
    @students = if Demo::Catalog.respond_to?(:active_students)
                  Array(Demo::Catalog.active_students).map { |row| row.with_indifferent_access }
                else
                  Array(Demo::Catalog.students).map { |row| row.with_indifferent_access }
                                            .reject { |s| s[:deletedAt].present? }
                end

    @teacher_names = @teachers.map { |t| teacher_display_name(t) }.uniq.sort
    @student_names = @lessons.map { |l| l[:student].to_s }.reject(&:blank?).uniq.sort
    @preset_teacher_id = params[:teacherId].presence || params[:teacher_id].presence
    @preset_student_id = params[:studentId].presence || params[:student_id].presence
    @lessons_json = @lessons.to_json
  end

  private

  def teacher_display_name(teacher)
    teacher[:displayName].presence ||
      [teacher[:firstName], teacher[:lastName]].compact_blank.join(' ').presence ||
      'Teacher'
  end
end
