# frozen_string_literal: true

class StudentsController < AppController
  def index
    @students = Demo::Catalog.active_students
    @teachers = Demo::Catalog.teachers
    @stats = calculate_stats(@students)
  end

  def show
    @student = Demo::Catalog.find_student(params[:id])
    @teachers = Demo::Catalog.teachers
    @teacher = @student && @student[:teacherId].present? ? Demo::Catalog.find_teacher(@student[:teacherId]) : nil
  end

  def new
    @student = default_student_attrs
    @teachers = Demo::Catalog.teachers
  end

  def create
    first_name = params[:first_name].to_s.strip
    last_name = params[:last_name].to_s.strip
    preferred = params[:preferred_name].to_s.strip
    name = preferred.presence || [first_name, last_name].reject(&:blank?).join(' ').presence || 'Student'

    target = Demo::Catalog.find_student(params[:id]) || Demo::Catalog.active_students.first
    target_id = target&.dig(:id) || 'stu-emma'

    redirect_to student_path(target_id), notice: I18n.t('app.students.created', name: name)
  end

  private

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
    active = students.count { |s| s[:status].to_s == 'active' }
    assigned = students.count { |s| s[:teacherId].present? }
    unassigned = total - assigned
    new_this_month = students.count { |s| created_in_range?(s, month_start, next_month) }
    new_last_month = students.count { |s| created_in_range?(s, last_month, month_start) }
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
end
