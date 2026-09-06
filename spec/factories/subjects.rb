# frozen_string_literal: true

FactoryBot.define do
  factory :subject do
    teacher_profile
    sequence(:name) { |n| "English #{n}" }
    is_active { true }
  end
end
