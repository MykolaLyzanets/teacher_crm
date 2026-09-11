# frozen_string_literal: true

class SubjectsController < AppController
  wrap_parameters false
  before_action :ensure_api_workspace!

  def index
    teacher = find_teacher
    return if performed?

    subjects = teacher.taught_subjects.order(:name)
    subjects = subjects.where(is_active: true) unless include_inactive?
    subjects = subjects.includes(:lesson_types)

    render json: subjects.map { |subject|
      types = include_inactive? ? subject.lesson_types : subject.lesson_types.select(&:is_active?)
      subject_json(subject, types: types.sort_by(&:name))
    }
  end

  def create
    teacher = find_teacher
    return if performed?

    subject = teacher.taught_subjects.new(subject_attrs)
    if subject.save
      render json: subject_json(subject), status: :created
    else
      render json: { errors: subject.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    subject = find_subject
    return if performed?

    if subject.update(subject_attrs)
      render json: subject_json(subject)
    else
      render json: { errors: subject.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def find_teacher
    teacher = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if teacher.blank? || teacher_forbidden?(teacher)
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    teacher
  end

  def find_subject
    subject = Subject.where(teacher_id: teacher_profiles_scope.select(:id)).find_by(id: params[:id])
    if subject.blank? || teacher_forbidden?(subject.teacher_profile)
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    subject
  end

  def teacher_forbidden?(teacher)
    current_user.teacher? && current_user.teacher_profile&.id != teacher.id
  end

  def include_inactive?
    ActiveModel::Type::Boolean.new.cast(params[:include_inactive])
  end

  def subject_attrs
    attrs = {}
    attrs[:name] = params[:name] if params.key?(:name)
    flag = cast_active_param
    attrs[:is_active] = flag unless flag.nil?
    attrs
  end

  def cast_active_param
    raw = params.key?(:is_active) ? params[:is_active] : params[:isActive]
    return if raw.nil? && !params.key?(:is_active) && !params.key?(:isActive)

    ActiveModel::Type::Boolean.new.cast(raw)
  end

  def subject_json(subject, types: nil)
    payload = { id: subject.id, name: subject.name, isActive: subject.is_active }
    return payload if types.nil?

    payload[:lessonTypes] = types.map(&:as_catalog)
    payload
  end
end
