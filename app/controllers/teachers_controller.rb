# frozen_string_literal: true

class TeachersController < AppController
  before_action :require_workspace!, only: %i[new create]

  def index
    records = teacher_profiles_scope.order(:first_name, :last_name)
    @teachers = records.map(&:as_catalog)
    @students = student_profiles_scope.map(&:as_catalog)
    @stats = calculate_stats(@teachers, @students, catalog_lessons)
  end

  def show
    record = teacher_profiles_scope.find_by(id: params[:id])
    @teacher = record&.as_catalog
    return unless record

    assigned = record.student_profiles.kept.includes(:user, :teacher_profile)
    @assigned_students = assigned.map(&:as_catalog)
    @unassigned_students = student_profiles_scope.where(teacher_id: nil).map(&:as_catalog)
  end

  def new
    @teacher = default_teacher_attrs
  end

  def create
    service = Teachers::Create.new(workspace: current_workspace, actor: current_user, params: teacher_params)
    if service.save
      name = service.teacher_profile.display_label
      redirect_to teacher_path(service.teacher_profile), notice: I18n.t('app.teachers.created', name:)
    else
      @teacher = default_teacher_attrs
      flash.now[:alert] = service.error_messages.to_sentence
      render :new, status: :unprocessable_entity
    end
  end

  private

  def teacher_params
    permitted = params.permit(
      :first_name, :last_name, :display_name, :job_title, :status, :email, :phone,
      :preferred_contact_method, :timezone, :location, :experience_years, :bio,
      :default_lesson_duration_minutes, :max_lessons_per_day, :default_meeting_link,
      :calendar_color, :invite_to_workspace, :invitation_timing, :invitation_message,
      :notes, :workspace_role,
      subjects: [], languages: [], tags: [], working_days: [], lesson_formats: []
    )
    permitted[:working_hours] = permitted_working_hours
    permitted
  end

  def permitted_working_hours
    hours = params[:working_hours]
    return {} if hours.blank?

    day_keys = TeachersHelper::WEEK_DAYS.index_with { %i[start end] }
    hours.permit(day_keys)
  end

  def catalog_lessons
    Array(Demo::Catalog.lessons).map(&:with_indifferent_access)
  end

  def default_teacher_attrs
    {
      firstName: '',
      lastName: '',
      displayName: '',
      jobTitle: '',
      status: 'active',
      email: '',
      phone: '',
      preferredContactMethod: 'email',
      timezone: 'America/New_York',
      location: '',
      subjects: [],
      workspaceRole: '',
      experienceYears: '',
      languages: [],
      bio: '',
      tags: [],
      workingDays: %w[Monday Tuesday Wednesday Thursday Friday],
      defaultLessonDurationMinutes: 60,
      lessonFormats: ['online'],
      calendarColor: 'olive',
      inviteToWorkspace: false,
      invitationTiming: 'send_now',
      notes: ''
    }.with_indifferent_access
  end

  def calculate_stats(teachers, students, lessons)
    now = Time.zone.now
    this_month_start = now.beginning_of_month
    next_month_start = this_month_start.next_month
    last_month_start = this_month_start.prev_month

    teacher_ids = teachers.map { |teacher| teacher[:id].to_s }
    active_teachers = teachers.count { |teacher| teacher[:status].to_s == 'active' }
    with_students = teachers.count do |teacher|
      students.any? { |student| student[:teacherId].to_s == teacher[:id].to_s }
    end
    assigned_students = students.count do |student|
      student[:teacherId].present? && teacher_ids.include?(student[:teacherId].to_s)
    end

    counted = lessons.reject { |lesson| lesson[:status].to_s == 'cancelled' }
    lessons_this_month = counted.count { |lesson| lesson_in_range?(lesson, this_month_start, next_month_start) }
    lessons_last_month = counted.count { |lesson| lesson_in_range?(lesson, last_month_start, this_month_start) }
    new_this_month = teachers.count { |teacher| created_in_range?(teacher, this_month_start, next_month_start) }
    new_last_month = teachers.count { |teacher| created_in_range?(teacher, last_month_start, this_month_start) }

    {
      totalTeachers: teachers.size,
      activeTeachers: active_teachers,
      teachersWithStudents: with_students,
      assignedStudents: assigned_students,
      lessonsThisMonth: lessons_this_month,
      lessonsLastMonth: lessons_last_month,
      newThisMonth: new_this_month,
      newLastMonth: new_last_month
    }.with_indifferent_access
  end

  def lesson_in_range?(lesson, start_time, end_time)
    date = Date.iso8601(lesson[:date].to_s)
    date >= start_time.to_date && date < end_time.to_date
  rescue ArgumentError, TypeError
    false
  end

  def created_in_range?(teacher, start_time, end_time)
    created = Time.zone.parse(teacher[:createdAt].to_s)
    created && created >= start_time && created < end_time
  rescue ArgumentError, TypeError
    false
  end
end
