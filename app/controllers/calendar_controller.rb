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
    @workspace_timezone = calendar_workspace_timezone(@draft_teacher_id)
    render :new, layout: (turbo_frame_request? ? false : 'app')
  end

  private

  def load_catalog
    @lessons = catalog_lessons
    @teachers = teacher_catalog_payloads
    @students = student_catalog_payloads
    @bookable_students = @students.select { |student| StudentProfile.bookable_status?(student[:status]) }

    @teacher_names = @teachers.map { |teacher| teacher_display_name(teacher) }.uniq.sort
    @student_names = @students.map { |student| student_display_name(student) }.compact_blank.uniq.sort
    @preset_teacher_id = params[:teacherId].presence || params[:teacher_id].presence
    @preset_student_id = params[:studentId].presence || params[:student_id].presence
    @lessons_json = @lessons.to_json
    @current_teacher_id = current_user.teacher_profile&.id
    @lock_teacher = current_user.teacher? || selectable_teachers.size <= 1
    @workspace_timezone = calendar_workspace_timezone
    @teacher_absences_json = calendar_teacher_absences_json
  end

  def calendar_teacher_absences_json
    teacher_ids = Array(@teachers).map { |row| row[:id] }
    return '[]' if teacher_ids.empty?

    TeacherAbsence.where(teacher_id: teacher_ids).map do |absence|
      {
        teacherId: absence.teacher_id,
        startsOn: absence.starts_on.iso8601,
        endsOn: absence.ends_on.iso8601,
        absenceType: absence.absence_type,
        reasonLabel: absence_reason_label_for_calendar(absence)
      }
    end.to_json
  end

  def absence_reason_label_for_calendar(absence)
    if absence.absence_other? && absence.reason_detail.present?
      return absence.reason_detail
    end

    I18n.t("app.teachers.absence_types.#{absence.absence_type}", default: absence.absence_type.to_s.humanize)
  end

  def calendar_workspace_timezone(teacher_id = nil)
    own_zone = current_user.teacher_profile&.timezone.presence
    return own_zone if own_zone

    id = teacher_id.presence || @preset_teacher_id.presence || solo_teacher_id
    resolved_id = id.to_s.presence
    if resolved_id.present?
      teacher = Array(@teachers).find { |row| row[:id].to_s == resolved_id }
      zone = teacher&.dig(:timezone).to_s.presence
      return zone if zone
    end

    TeacherProfile::DEFAULT_TIMEZONE
  end

  def assign_draft_params
    @draft_date = params[:date].presence || Date.current.iso8601
    @draft_start = params[:start].presence || '10:00'
    @draft_end = params[:end].presence || end_from_start(@draft_start)
    @draft_teacher_id =
      if @lock_teacher
        @current_teacher_id.to_s.presence || solo_teacher_id
      else
        params[:teacher_id].presence || @preset_teacher_id.presence || solo_teacher_id
      end
    @draft_student_id = bookable_student_id(params[:student_id].presence || @preset_student_id.presence || solo_student_id)
  end

  def end_from_start(start)
    hour, minute = start.to_s.split(':').map(&:to_i)
    hour = 10 if hour.nil?
    minute ||= 0
    format('%<hour>02d:%<minute>02d', hour: [hour + 1, 23].min, minute:)
  end

  def selectable_teachers
    Array(@teachers).reject { |teacher| teacher[:status].to_s == 'archived' }
  end

  def solo_teacher_id
    list = selectable_teachers
    return if list.size != 1

    list.first[:id].to_s
  end

  def selectable_students
    Array(@bookable_students)
  end

  def bookable_student_id(id)
    return if id.blank?

    selectable_students.find { |student| student[:id].to_s == id.to_s }&.fetch(:id, nil)&.to_s
  end

  def solo_student_id
    list = selectable_students
    return if list.size != 1

    list.first[:id].to_s
  end

  def teacher_display_name(teacher)
    teacher[:displayName].presence ||
      [teacher[:firstName], teacher[:lastName]].compact_blank.join(' ').presence ||
      'Teacher'
  end

  def student_display_name(student)
    student[:preferredName].presence ||
      [student[:firstName], student[:lastName]].compact_blank.join(' ').presence
  end
end
