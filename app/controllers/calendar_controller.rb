# frozen_string_literal: true

class CalendarController < AppController
  def index
    load_catalog
  end

  def new
    if params[:dismiss].present?
      return redirect_back fallback_location: calendar_path unless turbo_frame_request?

      render :new, layout: false
      return
    end

    load_catalog
    assign_draft_params
    render :new, layout: (turbo_frame_request? ? false : 'app')
  end

  private

  def load_catalog
    @lessons = Array(Demo::Catalog.lessons).map(&:with_indifferent_access)
    db_teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    db_students = student_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @teachers = current_workspace.present? ? db_teachers : (db_teachers.presence || Demo::Catalog.teachers)
    @students = current_workspace.present? ? db_students : (db_students.presence || Demo::Catalog.active_students)

    @teacher_names = @teachers.map { |teacher| teacher_display_name(teacher) }.uniq.sort
    @student_names = @lessons.map { |lesson| lesson[:student].to_s }.compact_blank.uniq.sort
    @preset_teacher_id = params[:teacherId].presence || params[:teacher_id].presence
    @preset_student_id = params[:studentId].presence || params[:student_id].presence
    @lessons_json = @lessons.to_json
    @current_teacher_id = current_user.teacher_profile&.id
    @lock_teacher = current_user.teacher? || (current_workspace&.individual? && @current_teacher_id.present?)
    @workspace_timezone = current_user.teacher_profile&.timezone.presence || 'Europe/Kyiv'
  end

  def assign_draft_params
    @draft_date = params[:date].presence || Date.current.iso8601
    @draft_start = params[:start].presence || '10:00'
    @draft_end = params[:end].presence || end_from_start(@draft_start)
    @draft_teacher_id =
      if @lock_teacher
        @current_teacher_id.to_s
      else
        params[:teacher_id].presence || @preset_teacher_id.presence || solo_teacher_id
      end
    @draft_student_id = params[:student_id].presence || @preset_student_id.presence || solo_student_id
  end

  def end_from_start(start)
    hour, minute = start.to_s.split(':').map(&:to_i)
    hour = 10 if hour.nil?
    minute ||= 0
    format('%<hour>02d:%<minute>02d', hour: [hour + 1, 23].min, minute: minute)
  end

  def solo_teacher_id
    return if @teachers.blank? || @teachers.size != 1

    @teachers.first[:id].to_s
  end

  def solo_student_id
    active = Array(@students).reject { |student| student[:status].to_s == 'archived' }
    return if active.size != 1

    active.first[:id].to_s
  end

  def teacher_display_name(teacher)
    teacher[:displayName].presence ||
      [teacher[:firstName], teacher[:lastName]].compact_blank.join(' ').presence ||
      'Teacher'
  end
end
