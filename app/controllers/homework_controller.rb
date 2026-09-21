# frozen_string_literal: true

class HomeworkController < AppController
  helper LessonsHelper

  ELIGIBLE_LESSON_STATUSES = %w[completed no_show].freeze

  wrap_parameters false
  before_action :require_teacher_homework_staff!, only: %i[show create update review]
  before_action :ensure_api_workspace!, only: %i[show create update review]

  def index
    records = homeworks_scope.ordered_by_due.to_a
    @homework_items = records
    @homework_summary = Homework.summary_for(records)
    @default_tab = @homework_summary[:toReview].positive? ? 'to_review' : 'active'
    @student_options = homework_student_filter_options(records)
    @subject_options = records.map { |item| item.subject.to_s }.compact_blank.uniq.sort
    @eligible_lessons = eligible_lessons_for_homework(records)
    @materials_by_id = Demo::Catalog.materials.index_by { |item| item[:id].to_s }
  end

  def show
    homework = find_homework
    return if performed?

    render json: homework_json(homework)
  end

  def create
    lesson = find_lesson_for_create
    return if performed?

    if lesson.homework.present?
      render json: { errors: [I18n.t('app.homework.lesson_already_has_homework')] }, status: :unprocessable_entity
      return
    end

    due_at = parse_due_at(lesson.teacher_profile, create_params[:due_date], create_params[:due_time])
    if due_at.nil?
      render_invalid_due_date!(create_params[:due_date])
      return
    end

    homework = build_homework_for_lesson(lesson, due_at:)
    assign_homework_students!(homework, lesson, create_student_ids(lesson))
    if homework.errors.any?
      render json: { errors: homework.errors.full_messages }, status: :unprocessable_entity
      return
    end

    if homework.save
      ensure_draft_responses!(homework)
      render json: homework_json(homework), status: :created
    else
      render json: { errors: homework.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotUnique
    render json: { errors: [I18n.t('app.homework.lesson_already_has_homework')] }, status: :unprocessable_entity
  end

  def update
    homework = find_homework
    return if performed?

    attrs, due_error = update_attributes(homework)
    if due_error.present?
      render json: { errors: [due_error] }, status: :unprocessable_entity
      return
    end

    homework.assign_attributes(attrs)
    if homework.save
      render json: homework_json(homework)
    else
      render json: { errors: homework.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def review
    homework = find_homework
    return if performed?

    unless homework.review_submissions!(
      decision: review_params[:decision],
      feedback: review_params[:feedback].to_s,
      score: review_params[:score],
      reviewer: current_user,
      resubmission_due_at: parse_optional_time(review_params[:resubmission_due_at], review_params[:resubmissionDueAt])
    )
      render json: { errors: homework.errors.full_messages.presence || [I18n.t('app.homework.nothing_to_review')] },
             status: :unprocessable_entity
      return
    end

    render json: homework_json(homework.reload)
  end

  private

  def require_teacher_homework_staff!
    return if current_user.admin? || current_user.owner? || current_user.teacher?

    render json: { error: I18n.t('app.homework.staff_only') }, status: :forbidden
  end

  def homework_student_filter_options(records)
    seen = {}
    records.each do |homework|
      homework.homework_students.each do |row|
        id = row.student_id.to_s
        next if seen[id]

        seen[id] = row.student.display_label
      end
    end
    seen.sort_by { |_id, name| name }
  end

  def eligible_lessons_for_homework(records)
    assigned_ids = records.filter_map(&:lesson_id).map(&:to_s).to_set
    catalog_lessons.select do |lesson|
      ELIGIBLE_LESSON_STATUSES.include?(lesson[:status].to_s) && assigned_ids.exclude?(lesson[:id].to_s)
    end.sort_by { |lesson| lesson[:date].to_s }.reverse
  end

  def find_homework
    homeworks_scope.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: I18n.t('app.homework.not_found') }, status: :not_found
    nil
  end

  def find_lesson_for_create
    lesson = lessons_scope.includes(:students, :subject, :teacher_profile).find_by(id: create_params[:lesson_id])
    if lesson.blank?
      render json: { error: I18n.t('app.homework.lesson_not_found') }, status: :not_found
      return nil
    end
    unless ELIGIBLE_LESSON_STATUSES.include?(lesson.status.to_s)
      render json: { errors: [I18n.t('app.homework.lesson_not_eligible')] }, status: :unprocessable_entity
      return nil
    end
    lesson
  end

  def build_homework_for_lesson(lesson, due_at:)
    teacher = lesson.teacher_profile
    Homework.new(
      workspace: current_workspace,
      teacher:,
      lesson:,
      title: resolved_title(create_params[:title], lesson),
      subject: create_params[:subject].presence || lesson.subject&.name,
      topic: create_params[:topic],
      instructions: create_params[:instructions],
      private_note: create_params[:private_note],
      allow_late_submission: boolean_param(create_params[:allow_late_submission], default: false),
      assigned_at: Time.current,
      due_at:
    )
  end

  def assign_homework_students!(homework, lesson, student_ids)
    if student_ids.blank?
      homework.errors.add(:students, I18n.t('app.homework.students_required'))
      return
    end

    allowed = lesson.students.where(id: student_ids)
    allowed.each { |student| homework.homework_students.build(student:) }
    homework.validate
    return if student_ids.blank?

    missing = student_ids.map(&:to_i) - allowed.pluck(:id)
    return if missing.empty?

    homework.errors.add(:students, I18n.t('app.homework.invalid_students'))
  end

  def ensure_draft_responses!(homework)
    homework.homework_students.includes(:homework_response).find_each do |row|
      row.create_homework_response!(status: :draft) if row.homework_response.blank?
    end
  end

  def create_student_ids(lesson)
    ids = Array(create_params[:student_ids]).map(&:to_s).compact_blank
    return ids if ids.present?

    lesson.students.pluck(:id).map(&:to_s)
  end

  def update_attributes(homework)
    teacher = homework.teacher
    attrs = {
      title: update_params[:title].presence || homework.title,
      instructions: update_params[:instructions],
      private_note: update_params[:private_note]
    }
    if update_params[:due_date].present?
      due_at = parse_due_at(teacher, update_params[:due_date], update_params[:due_time])
      return [attrs.compact, invalid_due_date_message(update_params[:due_date])] if due_at.nil?

      attrs[:due_at] = due_at
    end
    [attrs.compact, nil]
  end

  def resolved_title(raw_title, lesson)
    raw_title.presence || lesson.subject&.name.presence || I18n.t('app.homework.practice_fallback')
  end

  def parse_due_at(teacher, date_value, time_value)
    return nil if date_value.blank?

    zone = teacher.time_zone
    date = Date.iso8601(date_value.to_s)
    if time_value.present?
      hour, minute = time_value.to_s.split(':').map(&:to_i)
      zone.local(date.year, date.month, date.day, hour, minute, 0)
    else
      zone.local(date.year, date.month, date.day, 23, 59, 0)
    end
  rescue ArgumentError, TypeError
    nil
  end

  def render_invalid_due_date!(date_value)
    render json: { errors: [invalid_due_date_message(date_value)] }, status: :unprocessable_entity
  end

  def invalid_due_date_message(date_value)
    if date_value.blank?
      I18n.t('app.homework.due_required')
    else
      I18n.t('app.homework.invalid_due_date')
    end
  end

  def parse_optional_time(*values)
    raw = values.compact_blank.first
    return if raw.blank?

    Time.zone.parse(raw.to_s)
  rescue ArgumentError, TypeError
    nil
  end

  def homework_json(homework)
    {
      row: homework.as_teacher_row,
      summary: Homework.summary_for(homeworks_scope.ordered_by_due)
    }
  end

  def create_params
    @create_params ||= normalize_homework_params(params.permit(
      :lesson_id, :lessonId, :title, :subject, :topic, :instructions, :private_note, :privateNote,
      :due_date, :dueDate, :due_time, :dueTime, :allow_late_submission, :allowLateSubmission,
      student_ids: [], studentIds: []
    ))
  end

  def update_params
    @update_params ||= normalize_homework_params(params.permit(
      :title, :instructions, :private_note, :privateNote, :due_date, :dueDate, :due_time, :dueTime
    ))
  end

  def review_params
    params.permit(:decision, :feedback, :score, :resubmission_due_at, :resubmissionDueAt, :homework_response_id,
                  :homeworkResponseId)
  end

  def boolean_param(value, default: false)
    cast = ActiveModel::Type::Boolean.new.cast(value)
    cast.nil? ? default : cast
  end

  def normalize_homework_params(permitted)
    map = permitted.to_h.with_indifferent_access
    map[:lesson_id] ||= map.delete(:lessonId)
    map[:due_date] ||= map.delete(:dueDate)
    map[:due_time] ||= map.delete(:dueTime)
    map[:private_note] ||= map.delete(:privateNote)
    map[:allow_late_submission] = map[:allow_late_submission].nil? ? map.delete(:allowLateSubmission) : map[:allow_late_submission]
    map[:student_ids] = Array(map[:student_ids].presence || map.delete(:studentIds))
    map
  end
end
