# frozen_string_literal: true

FactoryBot.define do
  factory :homework do
    workspace
    teacher { association :teacher_profile, workspace: workspace }
    title { 'Past Simple Practice' }
    subject { 'English' }
    topic { 'Past Simple' }
    instructions { 'Complete the worksheet and write five sentences.' }
    assigned_at { 1.week.ago }
    due_at { 3.days.from_now }
    allow_late_submission { false }

    transient do
      students { [] }
    end

    after(:build) do |homework, evaluator|
      Array(evaluator.students).each do |student|
        homework.homework_students.build(student:)
      end
    end

    after(:create) do |homework|
      homework.homework_students.each do |row|
        create(:homework_response, homework_student: row) if row.homework_response.blank?
      end
    end
  end

  factory :homework_student do
    homework
    student { association :student_profile, workspace: homework.workspace }
  end

  factory :homework_response do
    homework_student
    status { :draft }
    written_response { '' }
  end
end
