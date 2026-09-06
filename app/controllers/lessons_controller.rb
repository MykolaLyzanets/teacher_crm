# frozen_string_literal: true

class LessonsController < AppController
  wrap_parameters false
  before_action :ensure_api_workspace!, only: %i[create update outcome]

  def index
    @lessons = catalog_lessons
    @teacher_names = @lessons.map { |lesson| lesson[:teacher].to_s }.compact_blank.uniq.sort
  end

  def create
    teacher = find_lesson_teacher
    return if performed?

    persist_lesson(teacher)
  end

  def update
    lesson = lessons_scope.find_by(id: params[:id])
    if lesson.blank?
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    teacher = find_lesson_teacher(default: lesson.teacher_profile)
    return if performed?

    persist_lesson(teacher, lesson:)
  end

  def outcome
    lesson = lessons_scope.find_by(id: params[:id])
    if lesson.blank?
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    if current_user.teacher? && current_user.teacher_profile&.id != lesson.teacher_id
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    service = Lessons::RecordOutcome.new(lesson:, params: outcome_params)
    if service.save
      render json: service.lesson.as_catalog
    else
      render json: { errors: service.error_messages }, status: :unprocessable_entity
    end
  end

  private

  def persist_lesson(teacher, lesson: nil)
    if series_request? && lesson.blank?
      persist_series(teacher)
    else
      persist_single(teacher, lesson:)
    end
  end

  def persist_single(teacher, lesson: nil)
    attrs = lesson_params
    if override_requested?
      return unless authorize_override!

      attrs[:allow_overlap] = true
      attrs[:override_reason] = override_reason
    end

    service = Lessons::Create.new(teacher_profile: teacher, params: attrs, lesson:)
    if service.save
      status = lesson.present? ? :ok : :created
      render json: service.lesson.as_catalog, status:
    else
      render json: { errors: service.error_messages }, status: :unprocessable_entity
    end
  end

  def persist_series(teacher)
    skip = skip_conflicts_requested?
    override = override_requested? && !skip
    return if override && !authorize_override!

    service = Lessons::Schedule.new(
      teacher_profile: teacher,
      params: lesson_params.merge(schedule_params),
      skip_conflicts: skip,
      override:
    )
    if service.save
      render json: {
        lessons: service.lessons.map(&:as_catalog),
        skippedDates: service.skipped_dates
      }, status: :created
    else
      render json: { errors: service.error_messages }, status: :unprocessable_entity
    end
  end

  def authorize_override!
    unless can_override_schedule?
      render json: { errors: [override_forbidden_message] }, status: :forbidden
      return false
    end
    if override_reason.blank?
      render json: { errors: [override_reason_blank_message] }, status: :unprocessable_entity
      return false
    end

    true
  end

  def find_lesson_teacher(default: nil)
    id = params[:teacher_id].presence || params[:teacherId].presence || default&.id
    if id.blank?
      render json: { errors: ['Teacher is required'] }, status: :unprocessable_entity
      return
    end

    teacher = teacher_profiles_scope.find_by(id:)
    if teacher.blank? || forbidden_teacher?(teacher)
      render json: { error: 'Not found' }, status: :not_found
      return
    end

    teacher
  end

  def forbidden_teacher?(teacher)
    current_user.teacher? && current_user.teacher_profile&.id != teacher.id
  end

  def lesson_params
    permitted = lesson_permitted_params
    core_lesson_params(permitted).merge(optional_lesson_params(permitted))
  end

  def core_lesson_params(permitted)
    {
      subject_id: first_value(permitted, :subject_id, :subjectId),
      lesson_type_id: first_value(permitted, :lesson_type_id, :lessonTypeId),
      student_ids: Array(permitted[:student_ids].presence || permitted[:studentIds]),
      date: permitted[:date],
      start_time: first_value(permitted, :start_time, :startTime),
      end_time: first_value(permitted, :end_time, :endTime),
      starts_at: first_value(permitted, :starts_at, :startsAt),
      ends_at: first_value(permitted, :ends_at, :endsAt)
    }
  end

  def optional_lesson_params(permitted)
    {}.tap do |hash|
      hash[:location] = permitted[:location] if permitted.key?(:location)
      hash[:status] = permitted[:status] if permitted.key?(:status)
      assign_optional(hash, permitted, :meeting_link, :meetingLink)
      assign_optional(hash, permitted, :location_text, :locationText)
      hash[:notes] = permitted[:notes] if permitted.key?(:notes)
      assign_price(hash, permitted)
      hash[:currency] = permitted[:currency] if permitted.key?(:currency)
    end
  end

  def schedule_params
    permitted = lesson_permitted_params
    {
      repeat: first_value(permitted, :repeat),
      repeat_end: first_value(permitted, :repeat_end, :repeatEnd),
      weekdays: Array(permitted[:weekdays]),
      override_reason:
    }
  end

  def series_request?
    repeat = first_value(lesson_permitted_params, :repeat)
    repeat.present? && repeat != 'none'
  end

  def skip_conflicts_requested?
    boolean_flag(:skip_conflicts, :skipConflicts)
  end

  def override_requested?
    boolean_flag(:override_conflict, :overrideConflict)
  end

  def override_reason
    first_value(lesson_permitted_params, :override_reason, :overrideReason).to_s.strip.presence
  end

  def boolean_flag(*keys)
    permitted = lesson_permitted_params
    raw = keys.lazy.map { |key| permitted[key] }.find { |value| !value.nil? }
    ActiveModel::Type::Boolean.new.cast(raw)
  end

  def override_forbidden_message
    I18n.t('activemodel.errors.models.lessons/schedule.attributes.base.override_forbidden')
  end

  def override_reason_blank_message
    I18n.t('activemodel.errors.models.lessons/schedule.attributes.override_reason.blank')
  end

  def assign_price(hash, permitted)
    if permitted.key?(:price_cents)
      hash[:price_cents] = permitted[:price_cents]
    elsif permitted.key?(:priceCents)
      hash[:price_cents] = permitted[:priceCents]
    end
  end

  def lesson_permitted_params
    params.permit(
      :teacher_id, :teacherId,
      :subject_id, :subjectId,
      :lesson_type_id, :lessonTypeId,
      :date, :start_time, :startTime, :end_time, :endTime,
      :starts_at, :startsAt, :ends_at, :endsAt,
      :location, :meeting_link, :meetingLink, :location_text, :locationText,
      :notes, :price_cents, :priceCents, :currency, :status,
      :repeat, :repeat_end, :repeatEnd,
      :skip_conflicts, :skipConflicts,
      :override_conflict, :overrideConflict,
      :override_reason, :overrideReason,
      student_ids: [], studentIds: [], weekdays: []
    )
  end

  def outcome_params
    permitted = params.permit(
      :outcome, :attendance,
      :actual_duration_minutes, :actualDurationMinutes,
      :teacher_note, :teacherNote,
      :student_progress_note, :studentProgressNote
    )
    {
      outcome: permitted[:outcome],
      attendance: permitted[:attendance],
      actual_duration_minutes: first_value(permitted, :actual_duration_minutes, :actualDurationMinutes),
      teacher_note: first_value(permitted, :teacher_note, :teacherNote),
      student_progress_note: first_value(permitted, :student_progress_note, :studentProgressNote)
    }
  end

  def first_value(permitted, *keys)
    keys.lazy.map { |key| permitted[key] }.find(&:present?)
  end

  def assign_optional(hash, permitted, snake, camel)
    return unless permitted.key?(snake) || permitted.key?(camel)

    hash[snake] = permitted[snake] || permitted[camel]
  end
end
