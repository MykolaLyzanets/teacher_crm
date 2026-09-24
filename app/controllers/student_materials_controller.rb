# frozen_string_literal: true

class StudentMaterialsController < AppController
  before_action :require_materials_staff!
  before_action :set_student

  def create
    material = materials_scope.library.library_standalone.find_by(id: params[:material_id])
    if material.blank?
      redirect_back fallback_location: materials_path, alert: I18n.t('app.lessons.material_not_found')
      return
    end

    MaterialStudent.find_or_create_by!(material:, student: @student)
    redirect_to student_path(@student), notice: I18n.t('app.materials.shared_with_student')
  end

  private

  def require_materials_staff!
    return if current_user.admin? || current_user.owner? || current_user.teacher?

    redirect_to dashboard_path, alert: I18n.t('app.materials.staff_only')
  end

  def set_student
    @student = student_profiles_scope.find_by(id: params[:student_id])
    return if @student.present?

    redirect_to students_path, alert: I18n.t('app.students.not_found_text')
  end
end
