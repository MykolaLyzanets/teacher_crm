# frozen_string_literal: true

module Teachers
  module SubstituteCandidates
    module_function

    def for_lesson(lesson, absent_teacher_id:, teachers_scope:, absence:)
      teachers_scope
        .active
        .where.not(id: absent_teacher_id)
        .select { |teacher| eligible?(teacher, lesson, absence) }
    end

    def for_lessons(lessons, absent_teacher_id:, teachers_scope:, absence:)
      return [] if lessons.blank?

      first = for_lesson(lessons.first, absent_teacher_id:, teachers_scope:, absence:)
      lessons.drop(1).reduce(first) do |candidates, lesson|
        lesson_ids = for_lesson(lesson, absent_teacher_id:, teachers_scope:, absence:).map(&:id).to_set
        candidates.select { |teacher| lesson_ids.include?(teacher.id) }
      end
    end

    def eligible?(teacher, lesson, _absence)
      lesson_date = lesson.starts_at.in_time_zone(teacher.time_zone).to_date
      if TeacherAbsence.covers_date?(teacher.id, lesson_date)
        return false
      end

      overlap = Lesson.confirmed
                    .where(teacher_id: teacher.id)
                    .overlapping(lesson.starts_at, lesson.ends_at)
                    .where.not(id: lesson.id)
                    .exists?
      return false if overlap

      true
    end
  end
end
