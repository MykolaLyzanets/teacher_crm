# frozen_string_literal: true

class TeachersController < AppController
  helper FinanceHelper
  helper LessonsHelper

  before_action :require_owner_staff!
  before_action :require_workspace!, only: %i[
    new create edit update destroy delete_dialog assign_dialog unassign_dialog absence_dialog offering_dialog
    archive_lessons_dialog cancel_archive_lessons
  ]
  before_action :set_teacher_record, only: %i[show edit update destroy cancel_archive_lessons]

  def index
    @teachers = teacher_catalog_payloads
    @students = student_catalog_payloads
    @stats = calculate_stats(@teachers, @students, catalog_lessons)
  end

  def show
    return if @teacher_record.blank?

    @teacher = @teacher_record.as_catalog
    today = Time.zone.today
    current_absence = @teacher_record.teacher_absences.covering(today).first
    helpers.teacher_apply_display_status!(@teacher, @teacher_record, absence: current_absence, date: today)
    week_start = helpers.teacher_availability_week_start
    week_end = week_start + 6.days
    @teacher_absences = @teacher_record.teacher_absences.ordered
    @teacher_absences_for_week = @teacher_absences.select { |row| row.starts_on <= week_end && row.ends_on >= week_start }

    assigned = @teacher_record.student_profiles.kept.includes(:user)
    teacher_label = @teacher_record.display_label
    @assigned_students = assigned.map { |student| student.as_catalog(teacher_name: teacher_label, lesson_pricing: false) }
    @catalog_teacher = Demo::Catalog.match_teacher(@teacher)
    if can_view_finance?
      @teacher_finance = Teachers::ProfileFinance.new(teacher_profile: @teacher_record).call
      @earnings = @teacher_finance[:primary][:summary]
    end
    @school_workspace = current_workspace.blank? || current_workspace.school? || current_user.admin?
    @absence_manageable_ids = absence_ids_with_affected_lessons(@teacher_absences)
    @archive_lessons_count = Teachers::UpcomingLessons.count(@teacher_record) if @teacher_record.archived?
  end

  def new
    @teacher = default_teacher_attrs
    @editing = false
  end

  def edit
    return if @teacher_record.blank?

    @teacher = @teacher_record.as_catalog.merge(
      lessonCatalog: @teacher_record.lesson_catalog_json,
      compensationSetup: @teacher_record.compensation_setup_json
    )
    @editing = true
    render :new
  end

  def create
    service = Teachers::Create.new(workspace: current_workspace, actor: current_user, params: teacher_params)
    if service.save
      name = service.teacher_profile.display_label
      redirect_to teacher_path(service.teacher_profile), notice: I18n.t('app.teachers.created', name:)
    else
      @teacher = teacher_form_attrs
      @editing = false
      flash.now[:alert] = service.error_messages.to_sentence
      render :new, status: :unprocessable_entity
    end
  end

  def update
    return if @teacher_record.blank?
    return update_status if params[:status_only].present?

    next_status = teacher_params[:status].to_s
    if next_status == 'archived' && !@teacher_record.archived? && Teachers::UpcomingLessons.count(@teacher_record).positive?
      redirect_to delete_dialog_teachers_path(teacher_id: @teacher_record.id, from_edit: 1),
                  alert: I18n.t('app.teachers.archive_lessons_use_dialog')
      return
    end

    service = Teachers::Update.new(teacher_profile: @teacher_record, actor: current_user, params: teacher_params)
    if service.save
      name = service.teacher_profile.display_label
      redirect_to teacher_path(service.teacher_profile), notice: I18n.t('app.teachers.updated', name:)
    else
      @teacher = teacher_form_attrs(record: @teacher_record)
      @editing = true
      flash.now[:alert] = service.error_messages.to_sentence
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    if @teacher_record.blank?
      redirect_to teachers_path, alert: I18n.t('app.teachers.not_found_text')
      return
    end

    name = @teacher_record.display_label
    cancel_lessons = params[:cancel_lessons].to_s == '1'
    manage_lessons = params[:manage_lessons].to_s == '1'
    Teachers::Destroy.new(teacher_profile: @teacher_record, cancel_lessons: cancel_lessons).call

    if manage_lessons && !cancel_lessons && Teachers::UpcomingLessons.count(@teacher_record).positive?
      redirect_to teacher_path(@teacher_record, manage_archive: 1), notice: I18n.t('app.teachers.archived', name:)
      return
    end

    redirect_to teachers_path, notice: I18n.t('app.teachers.archived', name:)
  end

  def delete_dialog
    @teacher_record = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if @teacher_record.blank?
      return redirect_to teachers_path unless turbo_frame_request?

      render :delete_dialog, layout: false
      return
    end

    @teacher = @teacher_record.as_catalog
    @upcoming_lessons = Teachers::UpcomingLessons.relation(@teacher_record)
    @upcoming_count = @upcoming_lessons.size
    render :delete_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  def archive_lessons_dialog
    @teacher_record = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if @teacher_record.blank?
      head :not_found
      return
    end

    @teacher = @teacher_record.as_catalog
    @upcoming_lessons = Teachers::UpcomingLessons.relation(@teacher_record)
    render :archive_lessons_dialog, layout: false
  end

  def cancel_archive_lessons
    return if @teacher_record.blank?

    Lessons::CancelForTeacher.new(teacher_profile: @teacher_record).call
    redirect_to teacher_path(@teacher_record), notice: I18n.t('app.teachers.archive_lessons_cancelled')
  end

  def update_status
    status = params[:status].to_s
    if status == 'archived' && !@teacher_record.archived? && Teachers::UpcomingLessons.count(@teacher_record).positive?
      redirect_to teachers_path(delete_teacher_id: @teacher_record.id)
      return
    end

    service = Teachers::UpdateStatus.new(teacher_profile: @teacher_record, status:)
    name = @teacher_record.display_label
    if service.save
      redirect_to teachers_path, notice: I18n.t('app.teachers.status_updated', name:)
      return
    end

    redirect_to teachers_path, alert: service.error_messages.to_sentence
  end

  def assign_dialog
    @teacher_record = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if @teacher_record.blank?
      return redirect_to teachers_path unless turbo_frame_request?

      render :assign_dialog, layout: false
      return
    end

    @teacher = @teacher_record.as_catalog
    @assignable_students = student_profiles_scope
                           .where('student_profiles.teacher_id IS DISTINCT FROM ?', @teacher_record.id)
                           .order(:first_name, :last_name)
                           .map(&:as_catalog)
    render :assign_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  def unassign_dialog
    @teacher_record = teacher_profiles_scope.find_by(id: params[:teacher_id])
    @student_record = student_profiles_scope.find_by(id: params[:student_id])
    if @teacher_record.blank? || @student_record.blank?
      return redirect_to(@teacher_record.present? ? teacher_path(@teacher_record) : teachers_path) unless turbo_frame_request?

      render :unassign_dialog, layout: false
      return
    end

    @teacher = @teacher_record.as_catalog
    @student = @student_record.as_catalog
    render :unassign_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  def absence_dialog
    @teacher_record = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if @teacher_record.blank?
      return redirect_to teachers_path unless turbo_frame_request?

      render :absence_dialog, layout: false
      return
    end

    @teacher = @teacher_record.as_catalog
    @editing_absence = @teacher_record.teacher_absences.find_by(id: params[:absence_id])
    @existing_absence_periods = helpers.teacher_absence_existing_periods(
      @teacher_record,
      except_id: @editing_absence&.id
    )
    render :absence_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  def offering_dialog
    return render :offering_dialog, layout: false if turbo_frame_request? && params[:dismiss].present?

    @teacher_record = teacher_profiles_scope.find_by(id: params[:teacher_id])
    if @teacher_record.blank?
      return redirect_to teachers_path unless turbo_frame_request?

      render :offering_dialog, layout: false
      return
    end

    render :offering_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  private

  def teacher_params
    permitted = params.permit(
      :first_name, :last_name, :display_name, :job_title, :status, :email, :phone,
      :preferred_contact_method, :timezone, :location, :experience_years, :bio,
      :default_lesson_duration_minutes, :duration_preset, :custom_duration,
      :max_lessons_per_day, :default_meeting_link,
      :calendar_color, :invite_to_workspace, :invitation_timing, :invitation_message,
      :notes, :workspace_role, :senior_teacher, :photo, :remove_photo, :lesson_catalog, :compensation_setup,
      :availability_slots,
      subjects: [], languages: [], tags: [], working_days: [], lesson_formats: []
    )
    permitted[:working_hours] = permitted_working_hours if params[:working_hours].present?
    permitted
  end

  def permitted_working_hours
    hours = params[:working_hours]
    return {} if hours.blank?

    day_keys = TeachersHelper::WEEK_DAYS.index_with { %i[start end] }
    hours.permit(day_keys)
  end

  def set_teacher_record
    scope = teacher_profiles_scope
    if action_name.in?(%w[edit update])
      scope = scope.includes(taught_subjects: :lesson_types)
    end
    @teacher_record = scope.find_by(id: params[:id])
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
      timezone: TeacherProfile::DEFAULT_TIMEZONE,
      location: '',
      subjects: [],
      workspaceRole: '',
      experienceYears: '',
      languages: [],
      bio: '',
      tags: [],
      workingDays: [],
      defaultLessonDurationMinutes: TeacherProfile::DEFAULT_LESSON_DURATION_MINUTES,
      lessonFormats: [],
      calendarColor: 'olive',
      inviteToWorkspace: false,
      invitationTiming: 'send_now',
      seniorTeacher: false,
      notes: '',
      lessonCatalog: '[]',
      compensationSetup: '{}',
      availabilitySlots: []
    }.with_indifferent_access
  end

  def teacher_form_attrs(submitted = teacher_params, record: nil)
    fallback = record&.as_catalog || default_teacher_attrs
    data = submitted.to_h.with_indifferent_access
    photo = data[:remove_photo].to_s == '1' ? nil : fallback[:photo]
    duration =
      if data[:duration_preset].to_s == 'custom'
        data[:custom_duration].presence || fallback[:defaultLessonDurationMinutes]
      else
        data[:duration_preset].presence || data[:default_lesson_duration_minutes].presence ||
          fallback[:defaultLessonDurationMinutes]
      end
    slots = TeacherAvailability.parse_slots(data[:availability_slots])
    legacy = slots.any? ? TeacherAvailability.derive_legacy(slots) : nil
    working_days = legacy ? legacy[:working_days] : Array(data[:working_days]).compact_blank
    working_hours =
      if legacy
        legacy[:working_hours]
      elsif data[:working_hours].respond_to?(:to_h)
        working_days.filter_map do |day|
          row = data[:working_hours][day] || data[:working_hours][day.to_sym]
          next if row.blank?

          start_time = row[:start] || row['start']
          end_time = row[:end] || row['end']
          next if start_time.blank? || end_time.blank?

          { 'day' => day, 'startTime' => start_time, 'endTime' => end_time }
        end
      else
        fallback[:workingHours]
      end
    lesson_formats =
      if legacy
        legacy[:lesson_formats]
      else
        Array(data[:lesson_formats]).compact_blank.presence || fallback[:lessonFormats]
      end
    availability_slots =
      if record && TeacherProfile.column_names.include?('availability_slots')
        TeacherAvailability.slots_for_form(record)
      elsif slots.any?
        slots
      else
        fallback[:availabilitySlots]
      end

    fallback.merge(
      firstName: data[:first_name].to_s,
      lastName: data[:last_name].to_s,
      displayName: data[:display_name].to_s,
      jobTitle: data[:job_title].to_s,
      status: data[:status].presence || fallback[:status],
      email: data[:email].to_s,
      phone: data[:phone].to_s,
      preferredContactMethod: data[:preferred_contact_method].presence || 'email',
      timezone: data[:timezone].presence || fallback[:timezone],
      location: data[:location].to_s,
      subjects: data.key?(:subjects) ? Array(data[:subjects]).compact_blank : fallback[:subjects],
      experienceYears: data.key?(:experience_years) ? data[:experience_years] : fallback[:experienceYears],
      bio: data.key?(:bio) ? data[:bio].to_s : fallback[:bio],
      languages: data.key?(:languages) ? Array(data[:languages]).compact_blank : fallback[:languages],
      tags: data.key?(:tags) ? Array(data[:tags]).compact_blank : fallback[:tags],
      workingDays: working_days,
      workingHours: working_hours,
      availabilitySlots: availability_slots,
      defaultLessonDurationMinutes: duration.to_i.positive? ? duration.to_i : fallback[:defaultLessonDurationMinutes] ||
        TeacherProfile::DEFAULT_LESSON_DURATION_MINUTES,
      lessonFormats: lesson_formats,
      defaultMeetingLink: data[:default_meeting_link].to_s,
      maxLessonsPerDay: data[:max_lessons_per_day],
      calendarColor: data[:calendar_color].presence || fallback[:calendarColor],
      notes: data[:notes].to_s,
      seniorTeacher: data.key?(:senior_teacher) ? ActiveModel::Type::Boolean.new.cast(data[:senior_teacher]) : fallback[:seniorTeacher],
      photo:,
      inviteToWorkspace: data[:invite_to_workspace].to_s == '1',
      lessonCatalog: data[:lesson_catalog].presence || fallback[:lessonCatalog].presence ||
        record&.lesson_catalog_json || '[]',
      compensationSetup: data[:compensation_setup].presence || fallback[:compensationSetup].presence ||
        record&.compensation_setup_json || '{}'
    ).with_indifferent_access
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

  def absence_ids_with_affected_lessons(absences)
    scope = teacher_profiles_scope
    absences.filter_map do |absence|
      rows = Teachers::AbsenceAffectedLessons.new(absence:, workspace_teachers_scope: scope).call[:lessons]
      absence.id if rows.present?
    end.to_set
  end
end
