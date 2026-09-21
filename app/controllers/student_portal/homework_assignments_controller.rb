# frozen_string_literal: true

module StudentPortal
  class HomeworkAssignmentsController < ApplicationController
    wrap_parameters false

    prepend_before_action :authenticate_user!
    before_action :require_student!

    def show
      assignment = portal_scope.find(params[:id])
      render json: portal_json(assignment)
    rescue ActiveRecord::RecordNotFound
      render json: { error: I18n.t('app.homework.not_found') }, status: :not_found
    end

    private

    def require_student!
      return if current_user.student? && current_user.student_profile.present?

      respond_to do |format|
        format.json { render json: { error: I18n.t('app.student_portal.staff_denied') }, status: :forbidden }
        format.html { redirect_to dashboard_path, alert: I18n.t('app.student_portal.staff_denied') }
      end
    end

    def portal_scope
      HomeworkStudent.portal_scope(current_user.student_profile)
    end

    def portal_json(assignment)
      profile = current_user.student_profile
      {
        item: assignment.as_student_portal_item,
        summary: HomeworkStudent.portal_summary(HomeworkStudent.portal_scope(profile))
      }
    end
  end
end
