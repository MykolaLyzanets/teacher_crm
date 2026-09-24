# frozen_string_literal: true

class MaterialsController < AppController
  before_action :require_materials_staff!

  def index
    @materials = materials_scope.order(created_at: :desc).includes(:teacher, :lesson, :homework)
    @share_student = student_profiles_scope.find_by(id: params[:student_id]) if params[:student_id].present?
    @shareable_materials = materials_scope.library.library_standalone.order(:title)
  end

  def create
    teacher = resolve_teacher
    if teacher.blank?
      return respond_material_error(I18n.t('app.materials.teacher_required'), :forbidden)
    end

    material = Material.build_from_upload(
      workspace: current_workspace,
      teacher:,
      title: material_params[:title],
      subject: material_params[:subject],
      external_url: material_params[:external_url],
      kind: material_params[:external_url].present? ? :link : nil,
      attachment_role: :assignment
    )
    material.file = material_params[:file] if material_params[:file].present?
    material.title = material.title.presence || default_title(material)

    if material.save
      respond_to do |format|
        format.json { render json: { material: material.as_library_entry }, status: :created }
        format.html { redirect_back fallback_location: materials_path, notice: I18n.t('app.materials.created') }
      end
    else
      respond_material_error(material.errors.full_messages.to_sentence)
    end
  end

  private

  def require_materials_staff!
    return if current_user.admin? || current_user.owner? || current_user.teacher?

    redirect_to dashboard_path, alert: I18n.t('app.materials.staff_only')
  end

  def resolve_teacher
    return current_user.teacher_profile if current_user.teacher_profile.present?

    lesson = lessons_scope.find_by(id: material_params[:lesson_id]) if material_params[:lesson_id].present?
    return lesson.teacher_profile if lesson.present?

    homework = homeworks_scope.find_by(id: material_params[:homework_id]) if material_params[:homework_id].present?
    return homework.teacher if homework.present?

    teacher_profiles_scope.order(:first_name, :last_name).first
  end

  def material_params
    params.permit(:title, :subject, :external_url, :file, :lesson_id, :homework_id)
  end

  def default_title(material)
    material_params[:file]&.original_filename.presence ||
      material.external_url.presence ||
      I18n.t('app.lessons.material_link_default')
  end

  def respond_material_error(message, status = :unprocessable_entity)
    respond_to do |format|
      format.json { render json: { errors: [message] }, status: }
      format.html { redirect_back fallback_location: materials_path, alert: message }
    end
  end
end
