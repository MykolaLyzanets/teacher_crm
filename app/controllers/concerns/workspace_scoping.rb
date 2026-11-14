# frozen_string_literal: true

module WorkspaceScoping
  extend ActiveSupport::Concern

  included do
    helper_method :current_workspace
  end

  private

  def current_workspace
    current_user&.workspace
  end

  def teacher_profiles_scope
    scoped = TeacherProfile.all
    return scoped if current_user.admin?
    return TeacherProfile.none if current_workspace.blank?

    scoped.where(workspace: current_workspace)
  end

  def student_profiles_scope
    scoped = StudentProfile.kept
    return scoped if current_user.admin?
    return StudentProfile.none if current_workspace.blank?

    scoped = scoped.where(workspace: current_workspace)
    return scoped if current_user.owner?

    if current_user.teacher?
      teacher_id = current_user.teacher_profile&.id
      return scoped.none if teacher_id.blank?

      return scoped.where(teacher_id:)
    end

    StudentProfile.none
  end

  def teacher_catalog_payloads(relation = nil)
    scope = (relation || teacher_profiles_scope).includes(:user)
    records = scope.order(:first_name, :last_name).to_a
    teacher_catalog_rows(records)
  end

  def student_catalog_payloads(relation = nil, lesson_pricing: can_view_finance?)
    scope = relation || student_profiles_scope
    records = scope.includes(:user).order(:first_name, :last_name).to_a
    attach_teacher_profiles!(records)
    if lesson_pricing
      ActiveRecord::Associations::Preloader.new(records:, associations: :student_lesson_type_prices).call
    end
    records.map { |student| student.as_catalog(lesson_pricing:) }
  end

  def attach_teacher_profiles!(students)
    teacher_ids = students.filter_map(&:teacher_id).uniq
    return if teacher_ids.empty?

    teachers = TeacherProfile.where(id: teacher_ids).index_by(&:id)
    students.each do |student|
      next if student.teacher_id.blank?

      student.association(:teacher_profile).target = teachers[student.teacher_id]
      student.association(:teacher_profile).loaded!
    end
  end

  def teacher_catalog_rows(records)
    ids = records.map(&:id)
    counts = StudentProfile.kept.where(teacher_id: ids).group(:teacher_id).count
    today = Time.zone.today
    absences = TeacherAbsence.where(teacher_id: ids).covering(today).index_by(&:teacher_id)
    records.map do |teacher|
      payload = teacher.as_catalog(assigned_count: counts[teacher.id].to_i)
      helpers.teacher_apply_display_status!(payload, teacher, absence: absences[teacher.id], date: today)
    end
  end

  def lessons_scope
    scoped = Lesson.all
    return scoped if current_user.admin?
    return Lesson.none if current_workspace.blank?

    teacher_ids = TeacherProfile.where(workspace_id: current_workspace.id).select(:id)
    scoped = scoped.where(teacher_id: teacher_ids)
    return scoped unless current_user.teacher?

    teacher_id = current_user.teacher_profile&.id
    return Lesson.none if teacher_id.blank?

    scoped.where(teacher_id:)
  end

  def catalog_lessons
    lesson_catalog_records(lessons_scope.order(:starts_at)).map(&:as_catalog)
  end

  def lesson_catalog_records(relation)
    relation.includes(
      :teacher_profile,
      :subject,
      :lesson_type,
      :cancelled_by,
      :students
    ).to_a
  end

  def materials_scope
    scoped = Material.includes(:teacher)
    return scoped if current_user.admin?
    return Material.none if current_workspace.blank?

    scoped.where(workspace_id: current_workspace.id)
  end

  def materials_library_by_id
    Material.library_index_for(materials_scope)
  end

  def homeworks_scope
    scoped = Homework.includes(
      :teacher, :materials,
      homework_students: { student: {}, homework_response: :materials }
    )
    return scoped if current_user.admin?
    return Homework.none if current_workspace.blank?

    scoped = scoped.where(workspace_id: current_workspace.id)
    return scoped if current_user.owner?

    if current_user.teacher?
      teacher_id = current_user.teacher_profile&.id
      return Homework.none if teacher_id.blank?

      return scoped.where(teacher_id:)
    end

    Homework.none
  end

  def require_workspace!
    return if current_workspace.present?

    redirect_to dashboard_path, alert: I18n.t('app.workspace.required')
  end
end
