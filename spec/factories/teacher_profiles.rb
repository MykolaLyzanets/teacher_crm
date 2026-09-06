# frozen_string_literal: true

FactoryBot.define do
  factory :teacher_profile do
    workspace
    first_name { 'Ava' }
    last_name { 'Thompson' }
    timezone { 'Europe/Kyiv' }
    status { :active }
    lesson_formats { %w[online] }

    after(:build) do |profile|
      profile.user ||= build(:user, :teacher, workspace: profile.workspace, skip_workspace_presence: true)
    end

    before(:create) do |profile|
      profile.user.save! if profile.user&.new_record?
    end
  end
end
