# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Workspace catalog subjects' do
  it 'lists and creates subjects without a teacher' do
    workspace = create(:workspace)
    owner = workspace.owner
    sign_in owner

    expect do
      post catalog_subjects_path, params: { name: 'English' }, as: :json
    end.to change { workspace.catalog_subjects.count }.by(1)

    expect(response).to have_http_status(:created)

    get catalog_subjects_path(include_inactive: 1), as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to contain_exactly(
      hash_including('name' => 'English', 'isActive' => true, 'lessonTypes' => [])
    )
  end

  it 'does not let a teacher create workspace catalog subjects' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    sign_in teacher.user

    post catalog_subjects_path, params: { name: 'English' }, as: :json

    expect(response).to have_http_status(:forbidden)
    expect(workspace.catalog_subjects.count).to eq(0)
  end

  it 'lets a teacher list workspace catalog subjects' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    create(:subject, :catalog, workspace:, name: 'English')
    sign_in teacher.user

    get catalog_subjects_path, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to contain_exactly(hash_including('name' => 'English'))
  end
end
