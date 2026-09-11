# frozen_string_literal: true

module CalendarHelper
  def calendar_json(value)
    ERB::Util.json_escape(value.to_json)
  end

  def calendar_create_turbo_data(sync: false)
    data = { turbo: true, turbo_frame: 'create_lesson' }
    data[:calendar_target] = 'createLink' if sync
    data
  end

  def calendar_new_dialog_path(**params)
    new_calendar_path(params.compact)
  end

  def calendar_page_data(embedded: false)
    data = {
      controller: 'calendar',
      calendar_i18n_value: app_i18n_json('app.calendar', 'app.statuses', 'app.common', 'app.lessons'),
      calendar_lessons_value: @lessons_json,
      calendar_teachers_value: @teachers.to_json,
      calendar_students_value: (embedded ? Array(@bookable_students) : @students).to_json,
      calendar_teacher_id_value: @preset_teacher_id.to_s,
      calendar_student_id_value: @preset_student_id.to_s,
      calendar_show_price_value: can_view_finance?.to_s,
      calendar_can_override_value: can_override_schedule?.to_s,
      calendar_can_manage_teachers_value: can_manage_teachers?.to_s,
      calendar_lock_teacher_value: @lock_teacher.to_s,
      calendar_current_teacher_id_value: @current_teacher_id.to_s,
      calendar_timezone_value: @workspace_timezone,
      calendar_create_url_value: new_calendar_path,
      calendar_dismiss_url_value: new_calendar_path(dismiss: 1),
      calendar_lessons_url_value: lessons_path,
      calendar_subjects_url_value: teacher_subjects_path(teacher_id: '__ID__'),
      calendar_lesson_types_url_value: subject_lesson_types_path(subject_id: '__ID__'),
      calendar_teacher_url_value: teacher_path('__ID__'),
      calendar_actor_value: current_user_display_name
    }
    data[:calendar_embedded_value] = true if embedded
    data[:calendar_edit_id_value] = params[:lesson_id].to_s if params[:lesson_id].present?
    data
  end
end
