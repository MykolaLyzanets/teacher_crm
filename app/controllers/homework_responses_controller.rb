# frozen_string_literal: true

class HomeworkResponsesController < AppController
  wrap_parameters false
  before_action :ensure_api_workspace!
  before_action :require_student_profile!

  def update
    response = find_response
    return if performed?

    unless response && owns_response?(response)
      render json: { error: I18n.t('app.homework.forbidden') }, status: :forbidden
      return
    end

    if response.save_draft!(written_response: draft_params[:written_response].to_s)
      render json: student_response_json(response)
    else
      render json: { errors: response.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def submit
    response = find_response
    return if performed?

    unless response.homework_student.student_id == current_user.student_profile.id
      render json: { error: I18n.t('app.homework.forbidden') }, status: :forbidden
      return
    end

    if response.submit!(written_response: submit_params[:written_response].to_s)
      render json: student_response_json(response)
    else
      render json: { errors: response.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def require_student_profile!
    return if current_user.student? && current_user.student_profile.present?

    render json: { error: I18n.t('app.homework.students_only_submit') }, status: :forbidden
  end

  def find_response
    scope = HomeworkResponse.joins(homework_student: :homework)
    scope = scope.merge(Homework.where(workspace_id: current_workspace.id)) if current_workspace.present?
    scope.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: I18n.t('app.homework.not_found') }, status: :not_found
    nil
  end

  def owns_response?(response)
    response.homework_student.student_id == current_user.student_profile&.id
  end

  def student_response_json(response)
    student = current_user.student_profile
    assignment = response.homework_student
    {
      response: response_json(response),
      item: assignment.as_student_portal_item,
      summary: HomeworkStudent.portal_summary(HomeworkStudent.portal_scope(student))
    }
  end

  def draft_params
    params.permit(:written_response, :writtenResponse).tap do |permitted|
      permitted[:written_response] ||= permitted.delete(:writtenResponse)
    end
  end

  def submit_params
    params.permit(:written_response, :writtenResponse).tap do |permitted|
      permitted[:written_response] ||= permitted.delete(:writtenResponse)
    end
  end

  def response_json(response)
    {
      id: response.id.to_s,
      status: response.status,
      writtenResponse: response.written_response.to_s,
      submittedAt: response.submitted_at&.iso8601
    }
  end
end
