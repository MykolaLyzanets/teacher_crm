# frozen_string_literal: true

FactoryBot.define do
  factory :workspace do
    sequence(:name) { |n| "Workspace #{n}" }
    workspace_type { :school }
    owner factory: %i[user owner]

    after(:create) do |workspace|
      owner = workspace.owner
      next if owner.workspace_id == workspace.id

      owner.update!(workspace:, skip_workspace_presence: true)
    end
  end
end
