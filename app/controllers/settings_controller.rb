# frozen_string_literal: true

class SettingsController < AppController
  def index; end

  def lessons; end

  def lesson_types
    @solo = current_workspace&.individual?
  end

  def lesson_type_dialog
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
    @subject = params[:subject].to_s
    render_lesson_type_frame :lesson_subject_delete_dialog
  end

  private

  def render_lesson_type_frame(view)
    if params[:dismiss].present?
      return redirect_back fallback_location: settings_lesson_types_path unless turbo_frame_request?

      render view, layout: false
      return
    end

    render view, layout: (turbo_frame_request? ? false : 'app')
  end
end
