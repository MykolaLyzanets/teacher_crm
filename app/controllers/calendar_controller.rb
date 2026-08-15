# frozen_string_literal: true

class CalendarController < AppController
  def index
    @lessons = Array(Demo::Catalog.lessons).map(&:with_indifferent_access)
    @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @students = student_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)

    @teacher_names = @teachers.map { |teacher| teacher_display_name(teacher) }.uniq.sort
    @student_names = @lessons.map { |lesson| lesson[:student].to_s }.compact_blank.uniq.sort
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
