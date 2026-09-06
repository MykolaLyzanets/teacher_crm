# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    sequence(:full_name) { |n| "User #{n}" }
    password { User.generate_password }
    password_confirmation { password }
    skip_workspace_presence { true }
    role { :owner }

    trait :owner do
      role { :owner }
    end

    trait :teacher do
      role { :teacher }
    end

    trait :student do
      role { :student }
    end
  end
end
