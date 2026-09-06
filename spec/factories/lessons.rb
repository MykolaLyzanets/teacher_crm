# frozen_string_literal: true

FactoryBot.define do
  factory :lesson do
    status { :confirmed }
    location { :online }

    transient do
      teacher { nil }
      with_student { true }
    end

    after(:build) do |lesson, evaluator|
      teacher = evaluator.teacher || lesson.teacher_profile || create(:teacher_profile)
      subject = lesson.subject || create(:subject, teacher_profile: teacher)
      lesson_type = lesson.lesson_type || create(:lesson_type, subject:)
      lesson.teacher_profile = teacher
      lesson.subject = subject
      lesson.lesson_type = lesson_type
      zone = teacher.time_zone
      lesson.starts_at ||= zone.local(2026, 9, 10, 10, 0, 0)
      lesson.ends_at ||= zone.local(2026, 9, 10, 11, 0, 0)
      next unless evaluator.with_student
      next if lesson.students.any?

      lesson.students << create(:student_profile, workspace: teacher.workspace)
    end
  end
end
