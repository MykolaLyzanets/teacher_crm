# frozen_string_literal: true

module Teachers
  class AbsenceAffectedLessons
    SUBSTITUTION_STATUSES = {
      needs_replacement: 'needs_replacement',
      substitute_assigned: 'substitute_assigned',
      reschedule_required: 'reschedule_required',
      rescheduled: 'rescheduled',
      restored: 'restored'
    }.freeze

    def initialize(absence:, workspace_teachers_scope:)
      @absence = absence
      @workspace_teachers_scope = workspace_teachers_scope
    end

    def call
      lessons = load_lessons
      rows = lessons.map { |lesson| build_row(lesson) }
      {
        absence: absence_payload,
        unresolvedCount: rows.count { |row| row[:rawStatus] == 'needs_replacement' },
        bulkSubstituteCandidates: bulk_substitute_candidates(lessons),
        lessons: rows
      }.with_indifferent_access
    end

    def assigned_lesson_count
      call[:unresolvedCount].to_i
    end

    private

    attr_reader :absence, :workspace_teachers_scope

    def load_lessons
      linked = []
      if absence.id.present?
        linked = Lesson.confirmed
                     .where(teacher_absence_id: absence.id)
                     .includes(:subject, :teacher_profile, :original_teacher, :students)
                     .to_a
                     .select { |lesson| counts_toward_absence_period?(lesson) }
      end

      period = lessons_for_teacher_in_period

      (linked + period).uniq(&:id).sort_by(&:starts_at)
    end

    def lessons_for_teacher_in_period
      pad_start = absence.starts_on - 1.day
      pad_end = absence.ends_on + 1.day
      db_range = pad_start.beginning_of_day..pad_end.end_of_day

      Lesson.confirmed
        .where(teacher_id: absence.teacher_id)
        .where(starts_at: db_range)
        .includes(:subject, :teacher_profile, :original_teacher, :students)
        .to_a
        .select { |lesson| date_in_absence_period?(lesson) }
    end

    def date_in_absence_period?(lesson)
      anchor = absence_anchor_date(lesson)
      anchor >= absence.starts_on && anchor <= absence.ends_on
    end

    def counts_toward_absence_period?(lesson)
      anchor = absence_anchor_date(lesson)
      if anchor >= absence.starts_on && anchor <= absence.ends_on
        return true
      end

      if lesson.teacher_absence_id != absence.id || !lesson.substitution_rescheduled?
        return false
      end

      if lesson.has_attribute?(:rescheduled_from) && lesson[:rescheduled_from].present?
        return false
      end

      true
    end

    def absence_anchor_date(lesson)
      from = lesson[:rescheduled_from] if lesson.has_attribute?(:rescheduled_from)
      if from.present?
        raw = from['starts_at'] || from[:starts_at]
        if raw.present?
          parsed = Time.zone.parse(raw.to_s)
          return parsed.to_date if parsed.present?
        end
      end

      zone = lesson.teacher_profile&.time_zone || TeacherProfile::DEFAULT_TIMEZONE
      lesson.starts_at.in_time_zone(zone).to_date
    end

    def build_row(lesson)
      raw_status = substitution_status(lesson)
      candidates = candidate_substitutes(lesson)
      display_status = raw_status == 'needs_replacement' && candidates.empty? ? 'reschedule_required' : raw_status
      student = lesson.students.first
      zone = lesson.teacher_profile&.time_zone || TeacherProfile::DEFAULT_TIMEZONE
      local_start = lesson.starts_at.in_time_zone(zone)
      local_end = lesson.ends_at.in_time_zone(zone)

      {
        id: lesson.id,
        status: display_status,
        rawStatus: raw_status,
        studentName: student&.display_label || I18n.t('app.common.student'),
        studentInitials: catalog_initials(student&.display_label),
        subjectName: lesson.subject&.name,
        dateLabel: I18n.l(local_start.to_date, format: :short),
        timeRange: format_time_range(local_start, local_end),
        teacherLine: teacher_line(lesson),
        canRestore: can_restore?(lesson),
        canCancel: lesson.confirmed?,
        canAssign: !%w[substitute_assigned rescheduled restored].include?(raw_status),
        substituteCandidates: candidates.map { |teacher| { id: teacher.id, name: teacher.display_label } },
        rescheduleDate: local_start.to_date.iso8601
      }.with_indifferent_access
    end

    def absence_payload
      teacher = absence.teacher_profile
      {
        id: absence.id,
        teacherId: absence.teacher_id,
        teacherName: teacher&.display_label,
        reasonLabel: absence_reason_label,
        periodLabel: absence_period_label
      }.with_indifferent_access
    end

    def absence_reason_label
      if absence.absence_other? && absence.reason_detail.present?
        return absence.reason_detail
      end

      I18n.t("app.teachers.absence_types.#{absence.absence_type}", default: absence.absence_type.to_s.humanize)
    end

    def absence_period_label
      start_label = I18n.l(absence.starts_on)
      return start_label if absence.starts_on == absence.ends_on

      "#{start_label} – #{I18n.l(absence.ends_on)}"
    end

    def substitution_status(lesson)
      stored = lesson.substitution_status
      if stored == 'substitute_assigned'
        return 'substitute_assigned'
      end
      if stored == 'rescheduled'
        return 'rescheduled'
      end
      if stored == 'restored' && lesson.teacher_id != absence.teacher_id
        return 'restored'
      end

      if lesson.teacher_id == absence.teacher_id
        return 'needs_replacement'
      end

      'needs_replacement'
    end

    def candidate_substitutes(lesson)
      SubstituteCandidates.for_lesson(
        lesson,
        absent_teacher_id: absence.teacher_id,
        teachers_scope: workspace_teachers_scope,
        absence: absence
      )
    end

    def bulk_substitute_candidates(lessons)
      SubstituteCandidates.for_lessons(
        lessons,
        absent_teacher_id: absence.teacher_id,
        teachers_scope: workspace_teachers_scope,
        absence: absence
      ).map { |teacher| { id: teacher.id, name: teacher.display_label } }
    end

    def teacher_line(lesson)
      original = lesson.original_teacher
      if lesson.substitution_substitute_assigned? && original.present?
        return I18n.t(
          'app.teachers.absence_lesson_substitute_line',
          substitute: lesson.teacher_profile&.display_label,
          original: original.display_label
        )
      end

      I18n.t('app.teachers.absence_lesson_teacher_line', name: lesson.teacher_profile&.display_label)
    end

    def can_restore?(lesson)
      return false if lesson.original_teacher_id.blank?

      lesson.substitution_substitute_assigned?
    end

    def format_time_range(start_at, end_at)
      "#{start_at.strftime('%l:%M %p').strip}–#{end_at.strftime('%l:%M %p').strip}"
    end

    def catalog_initials(name)
      parts = name.to_s.split(/\s+/).compact_blank
      return 'S' if parts.empty?
      return parts.first[0, 2].upcase if parts.size == 1

      "#{parts[0][0]}#{parts[1][0]}".upcase
    end
  end
end
