# frozen_string_literal: true

FactoryBot.define do
  factory :subject do
    teacher_profile
    workspace { teacher_profile.workspace }
    sequence(:name) { |n| "English #{n}" }
    is_active { true }

    trait :catalog do
      teacher_profile { nil }
      teacher_id { nil }
      workspace
    end
  end
end
