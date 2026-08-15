# frozen_string_literal: true

class TeachersController < AppController
  def index
    @teachers = catalog_teachers.reject { |t| t[:deletedAt].present? }
    @students = catalog_students.reject { |s| s[:deletedAt].present? }
    @stats = calculate_stats(@teachers, @students, catalog_lessons)
  end

  def show
    @teacher = find_teacher(params[:id])
    return unless @teacher

    @assigned_students = catalog_students.select do |student|
      student[:deletedAt].blank? && student[:teacherId].to_s == @teacher[:id].to_s
    end
    @unassigned_students = catalog_students.select do |student|
      student[:deletedAt].blank? && student[:teacherId].blank?
    end
  end

  def new
    @teacher = default_teacher_attrs
  end

  def create
    first_name = params[:first_name].to_s.strip
    last_name = params[:last_name].to_s.strip
    display_name = params[:display_name].to_s.strip
    name = display_name.presence || [first_name, last_name].reject(&:blank?).join(' ').presence || 'Teacher'

    target = find_teacher(params[:id]) || catalog_teachers.first
    target_id = target&.dig(:id) || 'tch-ava'

    redirect_to teacher_path(target_id), notice: I18n.t('app.teachers.created', name: name)
  end

  private

  def catalog_teachers
    Array(Demo::Catalog.teachers).map { |row| row.with_indifferent_access }
  end

  def catalog_students
    Array(Demo::Catalog.students).map { |row| row.with_indifferent_access }
  end

  def catalog_lessons
    Array(Demo::Catalog.lessons).map { |row| row.with_indifferent_access }
  end

  def find_teacher(id)
    return if id.blank?

    if Demo::Catalog.respond_to?(:find_teacher)
      Demo::Catalog.find_teacher(id)&.with_indifferent_access
    else
      catalog_teachers.find { |teacher| teacher[:id].to_s == id.to_s }
    end
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

    teacher_ids = teachers.map { |t| t[:id].to_s }
    active_teachers = teachers.count { |t| t[:status].to_s == 'active' }
    with_students = teachers.count do |teacher|
      students.any? { |s| s[:teacherId].to_s == teacher[:id].to_s }
    end
    assigned_students = students.count do |s|
      s[:teacherId].present? && teacher_ids.include?(s[:teacherId].to_s)
    end

    counted = lessons.reject { |l| l[:status].to_s == 'cancelled' }
    lessons_this_month = counted.count { |l| lesson_in_range?(l, this_month_start, next_month_start) }
    lessons_last_month = counted.count { |l| lesson_in_range?(l, last_month_start, this_month_start) }
    new_this_month = teachers.count { |t| created_in_range?(t, this_month_start, next_month_start) }
    new_last_month = teachers.count { |t| created_in_range?(t, last_month_start, this_month_start) }

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
