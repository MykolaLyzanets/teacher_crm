# frozen_string_literal: true

FactoryBot.define do
  factory :student_profile do
    workspace
    first_name { 'Emma' }
    last_name { 'Johnson' }
    status { :active }

    after(:build) do |profile|
      profile.user ||= build(:user, :student, workspace: profile.workspace, skip_workspace_presence: true)
    end

    before(:create) do |profile|
      profile.user.save! if profile.user&.new_record?
    end
  end
end
