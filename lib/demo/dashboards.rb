# frozen_string_literal: true

module Demo
  module Dashboards
    EMPTY_PAYMENTS_OVERVIEW = {
      paymentsReceived: {},
      lessonRevenue: {},
      outstandingDebt: {},
      teacherEarnings: {},
      teacherPayouts: {},
      schoolGrossProfit: {}
    }.freeze

    module_function

    def admin(lessons:, now: Time.zone.now)
      today = now.to_date
      today_lessons = lessons_on(lessons, today)
      attention = lesson_needs_attention(lessons, now)
      teachers = Catalog.teachers

      {
        today: today,
        summary: {
          lessonsToday: today_lessons.size,
          completedToday: today_lessons.count { |lesson| completed?(lesson) },
          upcomingToday: today_lessons.count { |lesson| upcoming?(lesson) },
          teachersActiveToday: today_lessons.map { |lesson| lesson[:teacher].to_s }.uniq.size,
          needsAttentionCount: attention.size
        },
        needsAttention: attention,
        todayLessons: today_lessons.sort_by { |lesson| lesson[:startTime].to_s },
        availability: teacher_availability(teachers, today_lessons, now),
        payments: EMPTY_PAYMENTS_OVERVIEW.dup,
        pendingCount: 0,
        payoutsRemaining: {}
      }.with_indifferent_access
    end

    def teacher(name, lessons:, now: Time.zone.now, homework_review: [])
      today = now.to_date
      today_lessons = lessons_on(lessons, today).sort_by { |lesson| lesson[:startTime].to_s }
      next_lesson = today_lessons.find { |lesson| upcoming?(lesson) && !past?(lesson, now) } ||
                    today_lessons.find { |lesson| in_progress?(lesson, now) }
      hours = today_lessons.sum { |lesson| duration_hours(lesson) }
      homework_review = Array(homework_review)

      {
        today: today,
        firstName: name.to_s.split.first,
        summary: {
          lessonsToday: today_lessons.size,
          teachingHoursToday: hours.round(1),
          homeworkToReview: homework_review.size,
          substituteLessonsCount: 0
        },
        nextLesson: next_lesson,
        todayLessons: today_lessons,
        homeworkReview: homework_review,
        substituteLessons: []
      }.with_indifferent_access
    end

    def lessons_on(lessons, date)
      key = date.iso8601
      lessons.select { |lesson| lesson[:date].to_s == key && lesson[:status].to_s != 'cancelled' }
    end

    def lesson_needs_attention(lessons, now)
      items = []
      lessons.each do |lesson|
        next if !past?(lesson, now) || !upcoming?(lesson)

        items << {
          id: "outcome-#{lesson[:id]}",
          category: 'lessons',
          kind: 'outcome_required',
          title: "#{lesson[:title].presence || lesson[:subject]} needs an outcome",
          subtitle: [lesson[:student], lesson[:teacher]].compact_blank.join(' · '),
          dateLabel: lesson[:date],
          badge: 'Outcome required',
          action: 'Confirm outcome',
          lessonId: lesson[:id]
        }
      end
      items
    end

    def teacher_availability(teachers, today_lessons, now)
      teachers.map do |teacher|
        name = Catalog.teacher_name(teacher)
        own = today_lessons.select { |lesson| lesson[:teacher].to_s == name }
        next_lesson = own.find { |lesson| upcoming?(lesson) && !past?(lesson, now) }
        status = if own.any? { |lesson| in_progress?(lesson, now) }
                   'teaching_now'
                 elsif own.any? && own.all? { |lesson| completed?(lesson) || past?(lesson, now) }
                   'finished'
                 elsif own.any?
                   'available'
                 else
                   'available'
                 end

        {
          teacher: teacher,
          name: name,
          lessonsToday: own.size,
          nextLessonTime: next_lesson&.dig(:startTime),
          status: status
        }
      end
    end

    def upcoming?(lesson)
      %w[confirmed pending].include?(lesson[:status].to_s)
    end

    def completed?(lesson)
      %w[completed no_show].include?(lesson[:status].to_s)
    end

    def past?(lesson, now)
      date = Date.iso8601(lesson[:date].to_s)
      return true if date < now.to_date
      return false if date > now.to_date

      hour, minute = lesson[:endTime].to_s.split(':').map(&:to_i)
      Time.zone.local(date.year, date.month, date.day, hour, minute) < now
    rescue ArgumentError, TypeError
      false
    end

    def in_progress?(lesson, now)
      return false unless upcoming?(lesson)

      date = Date.iso8601(lesson[:date].to_s)
      return false unless date == now.to_date

      start_hour, start_min = lesson[:startTime].to_s.split(':').map(&:to_i)
      end_hour, end_min = lesson[:endTime].to_s.split(':').map(&:to_i)
      starts = Time.zone.local(date.year, date.month, date.day, start_hour, start_min)
      ends = Time.zone.local(date.year, date.month, date.day, end_hour, end_min)
      now >= starts && now < ends
    rescue ArgumentError, TypeError
      false
    end

    def duration_hours(lesson)
      start_hour, start_min = lesson[:startTime].to_s.split(':').map(&:to_i)
      end_hour, end_min = lesson[:endTime].to_s.split(':').map(&:to_i)
      ((end_hour * 60 + end_min) - (start_hour * 60 + start_min)) / 60.0
    rescue ArgumentError, TypeError
      1
    end
  end
end
