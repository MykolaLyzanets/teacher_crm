# frozen_string_literal: true

class Lesson < ApplicationRecord
  STATUSES = { confirmed: 0, cancelled: 1, completed: 2 }.freeze
  LOCATIONS = { online: 0, in_person: 1 }.freeze
  ATTENDANCES = { pending: 0, present: 1, late: 2, absent: 3, excused: 4 }.freeze

  enum status: STATUSES
  enum location: LOCATIONS, _prefix: true
  enum attendance: ATTENDANCES, _prefix: true
  enum charge_decision: { no_charge: 0, charge: 1 }, _prefix: true

  belongs_to :teacher_profile, foreign_key: :teacher_id, inverse_of: :lessons
  belongs_to :subject, inverse_of: :lessons
  belongs_to :lesson_type, inverse_of: :lessons
  belongs_to :cancelled_by, class_name: 'User', optional: true
  has_and_belongs_to_many :students,
                          class_name: 'StudentProfile',
                          join_table: :lessons_students,
                          association_foreign_key: :student_id

  scope :overlapping, lambda { |starts_at, ends_at|
    where('lessons.starts_at < ? AND lessons.ends_at > ?', ends_at, starts_at)
  }

  validates :starts_at, :ends_at, :status, :location, :attendance, presence: true
  validates :actual_duration_minutes, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :ends_after_starts
  validate :subject_belongs_to_teacher
  validate :lesson_type_belongs_to_subject
  validate :subject_and_type_active, on: :create
  validate :students_match_lesson_type_mode
  validate :students_share_teacher_workspace
  validate :teacher_has_no_confirmed_overlap, unless: :allow_overlap?
  validate :student_has_no_confirmed_overlap, unless: :allow_overlap?
  validates :override_reason, presence: true, if: :allow_overlap?

  def billed_price_cents
    price_cents.nil? ? lesson_type&.price_cents : price_cents
  end

  def billed_currency
    currency.presence || lesson_type&.currency
  end

  def as_catalog
    zone = teacher_profile.time_zone
    local_start = starts_at.in_time_zone(zone)
    local_end = ends_at.in_time_zone(zone)
    people = students.to_a
    teacher_name = teacher_profile&.display_label

    {
      id:,
      title: subject&.name,
      subject: subject&.name,
      subjectId: subject_id,
      student: party_label(people),
      studentId: people.first&.id,
      studentIds: people.map(&:id),
      students: people.map { |student| catalog_student(student) },
      teacher: teacher_name,
      teacherId: teacher_id,
      teacherInitials: catalog_initials(teacher_name),
      teacherPhoto: teacher_profile&.photo_url,
      teacherRole: Array(teacher_profile&.subjects).first.presence || I18n.t('app.common.teacher'),
      date: local_start.to_date.iso8601,
      startTime: local_start.strftime('%H:%M'),
      endTime: local_end.strftime('%H:%M'),
      durationMinutes: ((local_end - local_start) / 60).to_i,
      endsAt: ends_at.iso8601,
      seriesId: series_id,
      timezone: zone.tzinfo.name,
      type: lesson_type&.mode,
      status:,
      location:,
      meetingLink: meeting_link,
      locationText: location_text,
      notes:,
      teacherNote: teacher_note,
      studentProgressNote: student_progress_note,
      attendance:,
      actualDurationMinutes: actual_duration_minutes,
      lessonTypeId: lesson_type_id,
      lessonTypeName: lesson_type&.name,
      compensationPercent: teacher_profile&.compensation_rate || TeacherProfile::DEFAULT_COMPENSATION_PERCENT,
      priceCents: billed_price_cents,
      currency: billed_currency,
      cancellationReasonCode: cancellation_reason_code,
      cancellationOtherText: cancellation_other_text,
      cancellationNote: cancellation_note,
      cancelledBy: cancelled_by&.full_name,
      cancelledById: cancelled_by_id,
      chargeDecision: charge_decision,
      chargedCents: charged_cents,
      createdAt: created_at&.iso8601,
    }.with_indifferent_access
  end

  private

  def party_label(people)
    return I18n.t('app.lessons.group_fallback') if lesson_type&.mode_group?

    people.first&.display_label.presence || I18n.t('app.common.student')
  end

  def catalog_student(student)
    name = student.display_label
    {
      id: student.id,
      name:,
      initials: catalog_initials(name),
      photo: student.photo_url,
      grade: student.grade,
      teacherId: student.teacher_id
    }
  end

  def catalog_initials(name)
    parts = name.to_s.split(/\s+/).compact_blank
    return 'U' if parts.empty?
    return parts.first[0, 2].upcase if parts.size == 1

    "#{parts[0][0]}#{parts[1][0]}".upcase
  end

  def ends_after_starts
    return if starts_at.blank? || ends_at.blank? || starts_at < ends_at

    errors.add(:ends_at, :before_start)
  end

  def subject_belongs_to_teacher
    return if subject.blank? || teacher_profile.blank? || subject.teacher_id == teacher_id

    errors.add(:subject, :teacher_mismatch)
  end

  def lesson_type_belongs_to_subject
    return if lesson_type.blank? || subject.blank? || lesson_type.subject_id == subject_id

    errors.add(:lesson_type, :subject_mismatch)
  end

  def subject_and_type_active
    errors.add(:subject, :inactive) if subject && !subject.is_active?
    errors.add(:lesson_type, :inactive) if lesson_type && !lesson_type.is_active?
  end

  def students_match_lesson_type_mode
    return if lesson_type.blank?

    count = students.size
    if lesson_type.mode_individual? && count != 1
      errors.add(:students, :individual_count)
    elsif lesson_type.mode_group? && count < 1
      errors.add(:students, :group_count)
    end
  end

  def students_share_teacher_workspace
    return if teacher_profile.blank? || students.empty?
    return if students.all? { |student| student.workspace_id == teacher_profile.workspace_id }

    errors.add(:students, :workspace_mismatch)
  end

  def teacher_has_no_confirmed_overlap
    return unless confirmed?
    return if teacher_id.blank? || starts_at.blank? || ends_at.blank?

    scope = self.class.confirmed.where(teacher_id:).overlapping(starts_at, ends_at)
    scope = scope.where.not(id:) if persisted?
    errors.add(:base, :teacher_overlap) if scope.exists?
  end

  def student_has_no_confirmed_overlap
    return unless confirmed?
    return if starts_at.blank? || ends_at.blank?

    ids = students.filter_map(&:id)
    return if ids.empty?

    scope = Lesson.confirmed.overlapping(starts_at, ends_at).joins(:students)
    scope = scope.where(student_profiles: { id: ids })
    scope = scope.where.not(lessons: { id: }) if persisted?
    errors.add(:base, :student_overlap) if scope.exists?
  end
end
