# frozen_string_literal: true

class SettingsController < AppController
  def index; end

  def lessons; end

  def lesson_types
    @teachers = teacher_profiles_scope.order(:first_name, :last_name)
    @preset_teacher_id = preset_teacher_id
    @lock_teacher = current_user.teacher? || @teachers.size <= 1
  end

  def lesson_type_dialog
    @subject_id = params[:subject_id].to_s
    @subject = params[:subject].to_s
    @lesson_type_id = params[:id].to_s
    render_lesson_type_frame :lesson_type_dialog
  end

  def lesson_type_delete_dialog
    @lesson_type_id = params[:id].to_s
    @lesson_type_name = params[:name].to_s
    render_lesson_type_frame :lesson_type_delete_dialog
  end

  def lesson_subject_delete_dialog
    @subject_id = params[:subject_id].to_s
    @subject = params[:subject].to_s
    render_lesson_type_frame :lesson_subject_delete_dialog
  end

  private

  def preset_teacher_id
    params[:teacher_id].presence || current_user.teacher_profile&.id || (@teachers.first&.id if @teachers.one?)
  end

  def render_lesson_type_frame(view)
    if params[:dismiss].present?
      return redirect_back fallback_location: settings_lesson_types_path unless turbo_frame_request?

      render view, layout: false
      return
    end

    render view, layout: (turbo_frame_request? ? false : 'app')
  end
end
