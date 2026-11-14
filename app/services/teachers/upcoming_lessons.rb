# frozen_string_literal: true

module Teachers
  class UpcomingLessons
    def self.relation(teacher_profile, now: Time.zone.now)
      teacher_profile.lessons.confirmed
        .where('lessons.ends_at > ?', now)
        .includes(:students, :subject, :teacher_profile)
        .order(:starts_at)
    end

    def self.count(teacher_profile, now: Time.zone.now)
      relation(teacher_profile, now: now).count
    end
  end
end
