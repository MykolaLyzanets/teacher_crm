# frozen_string_literal: true

class TeacherAbsencesController < AppController
  before_action :require_owner_staff!
  before_action :set_teacher
  before_action :set_absence, only: %i[
    update destroy
    affected_lessons assign_substitute cancel_lesson restore_teacher
    reschedule_dialog reschedule_check reschedule_lesson
  ]

  def create
    return if performed?

    absence = @teacher.teacher_absences.build(absence_params)
    absence.skip_assigned_lesson_check = params[:review_lessons].present?
    if absence.save
      redirect_after_create(absence)
      return
    end

    redirect_to teacher_path(@teacher), alert: absence.errors.full_messages.to_sentence
  end

  def update
    return if performed?

    if @absence.update(absence_params)
      redirect_to teacher_path(@teacher), notice: I18n.t('app.teachers.absence_updated')
      return
    end

    redirect_to teacher_path(@teacher), alert: @absence.errors.full_messages.to_sentence
  end

  def destroy
    return if performed?

    @absence.destroy
    redirect_to teacher_path(@teacher), notice: I18n.t('app.teachers.absence_deleted')
  end

  def preview
    return if performed?

    starts_on = parse_date(params[:starts_on])
    ends_on = parse_date(params[:ends_on])
    stats = affected_stats(starts_on, ends_on)
    render json: { lessons: stats[:lessons], students: stats[:students] }
  end

  def affected_lessons
    return if performed?

    if !turbo_frame_request?
      redirect_to teacher_path(@teacher, manage_absence: @absence.id)
      return
    end

    @payload = Teachers::AbsenceAffectedLessons.new(
      absence: @absence,
      workspace_teachers_scope: teacher_profiles_scope
    ).call
    render :affected_lessons, layout: false
  end

  def assign_substitute
    return if performed?

    lesson = lessons_scope.find_by(id: params[:lesson_id])
    if lesson.blank?
      return render json: { ok: false, message: I18n.t('app.lessons.not_found', default: 'Lesson not found') }, status: :not_found
    end

    substitute = teacher_profiles_scope.active.find_by(id: params[:substitute_teacher_id])
    if substitute.blank?
      return render json: { ok: false, message: I18n.t('app.teachers.not_found_text') }, status: :not_found
    end

    result = Teachers::AssignSubstitute.new(lesson:, absence: @absence, substitute:).call
    if result[:ok]
      return render json: { ok: true }
    end

    render json: { ok: false, message: result[:message] }, status: :unprocessable_entity
  end

  def cancel_lesson
    return if performed?

    lesson = lessons_scope.find_by(id: params[:lesson_id])
    if lesson.blank?
      return render json: { ok: false, message: I18n.t('app.lessons.not_found', default: 'Lesson not found') }, status: :not_found
    end

    result = Teachers::CancelAffectedLesson.new(lesson:, absence: @absence, actor: current_user).call
    if result[:ok]
      return render json: { ok: true }
    end

    render json: { ok: false, message: result[:message] }, status: :unprocessable_entity
  end

  def restore_teacher
    return if performed?

    lesson = lessons_scope.find_by(id: params[:lesson_id])
    if lesson.blank?
      return render json: { ok: false, message: I18n.t('app.lessons.not_found', default: 'Lesson not found') }, status: :not_found
    end

    result = Teachers::RestoreLessonTeacher.new(lesson:).call
    if result[:ok]
      return render json: { ok: true }
    end

    render json: { ok: false, message: result[:message] }, status: :unprocessable_entity
  end

  def reschedule_dialog
    return if performed?

    lesson = lessons_scope.find_by(id: params[:lesson_id])
    if lesson.blank?
      return head :not_found
    end

    @lesson = lessons_scope
                .includes(:subject, :lesson_type, :students, :teacher_profile, :original_teacher)
                .find(lesson.id)
    @teachers = teacher_profiles_scope.active.order(:first_name, :last_name)
    render :reschedule_dialog, layout: false
  end

  def reschedule_check
    return if performed?

    lesson = lessons_scope.find_by(id: params[:lesson_id])
    teacher = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if lesson.blank? || teacher.blank?
      return head :not_found
    end

    date = parse_date(params[:date])
    payload = Teachers::RescheduleAffectedLesson.check(
      lesson:,
      teacher:,
      date:,
      start_time: params[:start_time],
      end_time: params[:end_time]
    )
    render json: payload
  end

  def reschedule_lesson
    return if performed?

    lesson = lessons_scope.find_by(id: params[:lesson_id])
    teacher = teacher_profiles_scope.active.find_by(id: params[:teacher_id])
    if lesson.blank? || teacher.blank?
      return render json: { ok: false, message: I18n.t('app.lessons.not_found', default: 'Lesson not found') }, status: :not_found
    end

    date = parse_date(params[:date])
    result = Teachers::RescheduleAffectedLesson.new(
      lesson:,
      absence: @absence,
      teacher:,
      date:,
      start_time: params[:start_time],
      end_time: params[:end_time]
    ).call
    if result[:ok]
      return render json: { ok: true }
    end

    render json: { ok: false, message: result[:message] }, status: :unprocessable_entity
  end

  private

  def set_teacher
    @teacher = teacher_profiles_scope.find_by(id: params[:teacher_id])
    return if @teacher.present?

    redirect_to teachers_path, alert: I18n.t('app.teachers.not_found_text')
  end

  def set_absence
    @absence = @teacher.teacher_absences.find_by(id: params[:id])
    return if @absence.present?

    head :not_found
  end

  def absence_params
    params.require(:teacher_absence).permit(:absence_type, :starts_on, :ends_on, :note, :reason_detail)
  end

  def parse_date(value)
    return if value.blank?

    Date.iso8601(value.to_s)
  rescue ArgumentError
    nil
  end

  def redirect_after_create(absence)
    affected = affected_stats(absence.starts_on, absence.ends_on)[:lessons]
    if params[:review_lessons].present?
      notice = I18n.t('app.teachers.absence_recorded')
      if affected.positive?
        redirect_to teacher_path(@teacher, manage_absence: absence.id), notice: notice
      else
        redirect_to teacher_path(@teacher), notice: notice
      end
      return
    end

    notice = if affected.positive?
               I18n.t('app.teachers.absence_created_with_lessons', count: affected)
             else
               I18n.t('app.teachers.absence_recorded')
             end
    redirect_to teacher_path(@teacher), notice: notice
  end

  def affected_stats(starts_on, ends_on)
    if starts_on.blank? || ends_on.blank?
      return { lessons: 0, students: 0 }
    end

    preview_absence = TeacherAbsence.new(
      teacher_id: @teacher.id,
      teacher_profile: @teacher,
      starts_on: starts_on,
      ends_on: ends_on
    )
    rows = Teachers::AbsenceAffectedLessons.new(
      absence: preview_absence,
      workspace_teachers_scope: teacher_profiles_scope
    ).call[:lessons]
    lesson_count = rows.size
    student_count = rows.map { |row| row[:studentName].to_s }.compact_blank.uniq.size
    { lessons: lesson_count, students: student_count }
  end
end
