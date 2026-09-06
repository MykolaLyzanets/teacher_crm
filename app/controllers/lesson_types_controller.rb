# frozen_string_literal: true

class LessonTypesController < AppController
  wrap_parameters false
  before_action :ensure_api_workspace!

  def index
    subject = find_subject
    return if performed?

    types = subject.lesson_types.order(:name)
    types = types.where(is_active: true) unless include_inactive?
    render json: types.map { |lesson_type| lesson_type_json(lesson_type) }
  end

  def create
    subject = find_subject
    return if performed?

    lesson_type = subject.lesson_types.new(lesson_type_attrs)
    if lesson_type.save
      render json: lesson_type_json(lesson_type), status: :created
    else
      render json: { errors: lesson_type.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    lesson_type = find_lesson_type
    return if performed?

    if lesson_type.update(lesson_type_attrs)
      render json: lesson_type_json(lesson_type)
    else
      render json: { errors: lesson_type.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def find_subject
    subject = Subject.where(teacher_id: teacher_profiles_scope.select(:id)).find_by(id: params[:subject_id])
    if subject.blank? || teacher_forbidden?(subject.teacher_profile)
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    subject
  end

  def find_lesson_type
    lesson_type = LessonType.joins(subject: :teacher_profile)
                            .merge(Subject.where(teacher_id: teacher_profiles_scope.select(:id)))
                            .find_by(id: params[:id])
    if lesson_type.blank? || teacher_forbidden?(lesson_type.subject.teacher_profile)
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    lesson_type
  end

  def teacher_forbidden?(teacher)
    current_user.teacher? && current_user.teacher_profile&.id != teacher.id
  end

  def include_inactive?
    ActiveModel::Type::Boolean.new.cast(params[:include_inactive])
  end

  def lesson_type_attrs
    attrs = {}
    attrs[:name] = params[:name] if params.key?(:name)
    attrs[:kind] = params[:kind] if params[:kind].present?
    attrs[:mode] = params[:mode] if params[:mode].present?
    duration = params[:default_duration_minutes].presence || params[:defaultDurationMinutes]
    attrs[:default_duration_minutes] = duration if duration.present?
    flag = cast_active_param
    attrs[:is_active] = flag unless flag.nil?
    attrs
  end

  def cast_active_param
    raw = params.key?(:is_active) ? params[:is_active] : params[:isActive]
    return if raw.nil? && !params.key?(:is_active) && !params.key?(:isActive)

    ActiveModel::Type::Boolean.new.cast(raw)
  end

  def lesson_type_json(lesson_type)
    {
      id: lesson_type.id,
      name: lesson_type.name,
      kind: lesson_type.kind,
      mode: lesson_type.mode,
      defaultDurationMinutes: lesson_type.default_duration_minutes,
      isActive: lesson_type.is_active,
      subjectId: lesson_type.subject_id
    }
  end
end
