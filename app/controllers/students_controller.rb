# frozen_string_literal: true

class StudentsController < AppController
  helper LessonsHelper
  helper FinanceHelper
  before_action :require_workspace!, only: %i[new create edit update destroy assign_dialog assign unassign delete_dialog]
  before_action :require_assign_permission!, only: %i[assign_dialog assign unassign]
  before_action :set_student_record, only: %i[show edit update destroy unassign]

  def index
    @students = student_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @stats = calculate_stats(@students)
  end

  def show
    @student = @student_record&.as_catalog
    @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @teacher = @student_record&.teacher_profile&.as_catalog
    @catalog_student = Demo::Catalog.match_student(@student) if @student
    student_name = @student ? [@student[:preferredName].presence || @student[:firstName], @student[:lastName]].compact_blank.join(' ') : nil
    @student_homework = []
    @student_notes = []
    @student_progress = nil
    @finance = nil
    @pricing = nil
    @balance_cents = 0
    if @catalog_student
      @finance = Demo::Finance.portal_finance(@catalog_student[:id])
      @pricing = Demo::Finance.pricing_for(@catalog_student[:id])
      @balance_cents = Demo::Finance.balance_cents(@catalog_student[:id])
      @student_lessons = Demo::Portal.lessons_for_student(@catalog_student)
      @student_homework = Demo::Portal.homework_for(@catalog_student[:id])
      @student_progress = Demo::Portal.progress_for(@catalog_student[:id])
      @student_notes = Demo::Portal.notes_for(@catalog_student[:id])
    else
      @student_lessons = Demo::Timeline.lessons.select { |lesson| lesson[:student].to_s == student_name }
    end
    @profile_tab = student_profile_tab
  end

  def new
    @student = default_student_attrs
    @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @editing = false
  end

  def edit
    return if @student_record.blank?

    @student = @student_record.as_catalog
    @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @editing = true
    render :new
  end

  def create
    service = Students::Create.new(workspace: current_workspace, actor: current_user, params: student_params)
    if service.save
      name = service.student_profile.display_label
      notice = service.invited? ? I18n.t('app.students.created_and_invited', name:) : I18n.t('app.students.created', name:)
      redirect_to student_path(service.student_profile), notice:
    else
      @student = default_student_attrs
      @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
      @editing = false
      flash.now[:alert] = service.error_messages.to_sentence
      render :new, status: :unprocessable_entity
    end
  end

  def update
    return if @student_record.blank?

    service = Students::Update.new(student_profile: @student_record, actor: current_user, params: student_params)
    if service.save
      name = service.student_profile.display_label
      notice = service.invited? ? I18n.t('app.students.invite_sent', name:) : I18n.t('app.students.updated', name:)
      redirect_to student_path(service.student_profile), notice:
    else
      @student = @student_record.as_catalog
      @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
      @editing = true
      flash.now[:alert] = service.error_messages.to_sentence
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    if @student_record.blank?
      redirect_to students_path, alert: I18n.t('app.students.not_found_text')
      return
    end

    name = @student_record.display_label
    Students::Destroy.new(student_profile: @student_record).call
    redirect_to students_path, notice: I18n.t('app.students.deleted', name:)
  end

  def delete_dialog
    @student_record = student_profiles_scope.find_by(id: params[:student_id])
    if @student_record.blank?
      return redirect_to students_path unless turbo_frame_request?

      render :delete_dialog, layout: false
      return
    end

    @student = @student_record.as_catalog
    render :delete_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  def assign_dialog
    @student_ids = student_profiles_scope.where(id: Array(params[:student_ids])).ids
    if @student_ids.empty?
      return redirect_to students_path unless turbo_frame_request?

      render :assign_dialog, layout: false
      return
    end

    @teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @selected_teacher_id =
      if @student_ids.one?
        student_profiles_scope.find_by(id: @student_ids.first)&.teacher_id
      end
    render :assign_dialog, layout: (turbo_frame_request? ? false : 'app')
  end

  def assign
    service = Students::Assign.new(
      student_scope: student_profiles_scope,
      teacher_scope: teacher_profiles_scope,
      actor: current_user,
      student_ids: params[:student_ids],
      teacher_id: params[:teacher_id]
    )
    if service.save
      notice =
        if service.count == 1
          I18n.t('app.students.assigned_to_toast', name: service.teacher_name)
        else
          I18n.t('app.students.assigned_many', count: service.count, name: service.teacher_name)
        end
      redirect_back fallback_location: students_path, notice:
    else
      redirect_back fallback_location: students_path, alert: service.error_messages.to_sentence
    end
  end

  def unassign
    if @student_record.blank?
      redirect_to students_path, alert: I18n.t('app.students.not_found_text')
      return
    end

    @student_record.unassign!
    redirect_to student_path(@student_record), notice: I18n.t('app.students.removed_toast')
  end

  private

  def student_params
    permitted = params.permit(
      :first_name, :last_name, :preferred_name, :date_of_birth, :gender, :status,
      :teacher_id, :email, :phone, :address, :parent_name, :relationship, :parent_email,
      :parent_phone, :grade, :student_code, :enrollment_date, :academic_year, :level,
      :location_preference, :preferred_time_notes, :emergency_name, :emergency_relationship,
      :emergency_phone, :notes, :photo, :remove_photo, :invite_to_workspace, subjects: [], preferred_days: []
    )
    permitted.delete(:teacher_id) unless can_assign_teacher?
    permitted
  end

  def set_student_record
    @student_record = student_profiles_scope.find_by(id: params[:id])
  end

  def require_assign_permission!
    return if can_assign_teacher?

    redirect_to students_path, alert: I18n.t('app.teachers.forbidden')
  end

  def default_student_attrs
    {
      firstName: '',
      lastName: '',
      preferredName: '',
      status: 'active',
      email: '',
      phone: '',
      grade: '',
      subjects: [],
      level: '',
      locationPreference: 'online',
      preferredDays: [],
      parentName: '',
      relationship: '',
      parentEmail: '',
      parentPhone: '',
      notes: '',
      teacherId: nil
    }.with_indifferent_access
  end

  def calculate_stats(students)
    now = Time.zone.now
    month_start = now.beginning_of_month
    next_month = month_start.next_month
    last_month = month_start.prev_month

    total = students.size
    active = students.count { |student| student[:status].to_s == 'active' }
    assigned = students.count { |student| student[:teacherId].present? }
    unassigned = total - assigned
    new_this_month = students.count { |student| created_in_range?(student, month_start, next_month) }
    new_last_month = students.count { |student| created_in_range?(student, last_month, month_start) }
    monthly_change =
      if new_last_month.zero?
        new_this_month.positive? ? 100.0 : nil
      else
        ((new_this_month - new_last_month).to_f / new_last_month * 100).round(1)
      end

    {
      totalStudents: total,
      activeStudents: active,
      assignedStudents: assigned,
      unassignedStudents: unassigned,
      newThisMonth: new_this_month,
      monthlyChangePercent: monthly_change
    }.with_indifferent_access
  end

  def created_in_range?(student, start_time, end_time)
    created = Time.zone.parse(student[:createdAt].to_s)
    created && created >= start_time && created < end_time
  rescue ArgumentError, TypeError
    false
  end

  def student_profile_tab
    allowed = %w[overview lessons homework progress notes]
    allowed.insert(4, 'payments') if can_view_finance?
    tab = params[:tab].to_s
    allowed.include?(tab) ? tab : 'overview'
  end
end
