# frozen_string_literal: true

FactoryBot.define do
  factory :lesson_type do
    subject
    name { 'Individual' }
    kind { :individual }
    mode { :individual }
    default_duration_minutes { 60 }
    is_active { true }

    trait :group do
      name { 'Group' }
      kind { :group }
      mode { :group }
    end

    trait :trial do
      name { 'Trial' }
      kind { :trial }
      mode { :individual }
      default_duration_minutes { 30 }
    end
  end
end
