# frozen_string_literal: true

class LessonMaterialsController < AppController
  MAX_MATERIALS_PER_LESSON = 10

  before_action :set_lesson

  def create
    return if performed?

    if Material.role_assignment.where(lesson_id: @lesson.id).count >= MAX_MATERIALS_PER_LESSON
      return redirect_to_lesson(alert: I18n.t('app.lessons.materials_limit'))
    end

    if params[:material_id].present?
      attach_library_material
    else
      create_material
    end
  end

  private

  def set_lesson
    @lesson = lessons_scope.includes(:students, :subject, :teacher_profile).find_by(id: params[:lesson_id])
    if @lesson.blank?
      redirect_to lessons_path, alert: I18n.t('app.lessons.not_found')
      return
    end
    return unless current_user.teacher?
    return if current_user.teacher_profile&.id == @lesson.teacher_id

    redirect_to lessons_path, alert: I18n.t('app.lessons.not_found')
  end

  def attach_library_material
    material = materials_scope.library.library_standalone.find_by(id: params[:material_id])
    if material.blank?
      redirect_to_lesson(alert: I18n.t('app.lessons.material_not_found'))
      return
    end

    material.update!(
      lesson: @lesson,
      homework_id: nil,
      homework_response_id: nil,
      subject: material.subject.presence || @lesson.subject&.name,
      attachment_role: :assignment
    )
    material.share_with_lesson_students!(@lesson)
    redirect_to_lesson(notice: I18n.t('app.lessons.material_attached'))
  end

  def create_material
    material = Material.build_from_upload(
      workspace: @lesson.teacher_profile.workspace,
      teacher: @lesson.teacher_profile,
      lesson: @lesson,
      title: material_params[:title].presence || default_title,
      subject: @lesson.subject&.name,
      external_url: material_params[:external_url],
      kind: material_params[:external_url].present? ? :link : nil,
      attachment_role: :assignment
    )
    material.file = material_params[:file] if material_params[:file].present?

    if material.save
      material.share_with_lesson_students!(@lesson)
      redirect_to_lesson(notice: I18n.t('app.lessons.material_added'))
    else
      redirect_to_lesson(alert: material.errors.full_messages.to_sentence)
    end
  end

  def material_params
    params.permit(:title, :external_url, :file)
  end

  def default_title
    material_params[:file]&.original_filename.presence || I18n.t('app.lessons.material_link_default')
  end

  def redirect_to_lesson(notice: nil, alert: nil)
    redirect_to lesson_path(@lesson), notice:, alert:
  end
end
