# frozen_string_literal: true

FactoryBot.define do
  factory :material do
    workspace
    teacher { association :teacher_profile, workspace: }
    title { 'Grammar worksheet' }
    kind { :link }
    status { :ready }
    attachment_role { :assignment }
    external_url { 'https://example.com/worksheet' }
    subject { 'English' }

    transient do
      students { [] }
    end

    after(:create) do |material, evaluator|
      evaluator.students.each do |student|
        material.material_students.find_or_create_by!(student:)
      end
    end

    trait :with_homework do
      transient do
        homework_record { nil }
      end

      after(:create) do |material, evaluator|
        homework = evaluator.homework_record
        next if homework.blank?

        material.update!(homework:)
      end
    end
  end
end
