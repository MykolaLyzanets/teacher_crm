# frozen_string_literal: true

class CatalogSubjectsController < AppController
  wrap_parameters false
  before_action :ensure_api_workspace!
  before_action :require_workspace_catalog_view!
  before_action :require_workspace_catalog_manage!, only: :create

  def index
    subjects = current_workspace.catalog_subjects.order(:name)
    subjects = subjects.where(is_active: true) if !include_inactive?
    subjects = subjects.includes(:lesson_types)

    render json: subjects.map { |subject|
      types = include_inactive? ? subject.lesson_types : subject.lesson_types.select(&:is_active?)
      subject_json(subject, types: types.sort_by(&:name))
    }
  end

  def create
    subject = current_workspace.catalog_subjects.new(subject_attrs)
    if subject.save
      render json: subject_json(subject), status: :created
    else
      render json: { errors: subject.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def subject_attrs
    attrs = { name: params[:name] }
    flag = cast_active_param
    attrs[:is_active] = flag unless flag.nil?
    attrs
  end

  def include_inactive?
    ActiveModel::Type::Boolean.new.cast(params[:include_inactive])
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
