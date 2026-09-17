# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Dashboard' do
  it 'renders for a workspace owner when lessons exist' do
    teacher = create(:teacher_profile)
    create(:lesson, teacher:)
    sign_in teacher.workspace.owner

    get dashboard_path

    expect(response).to have_http_status(:ok)
  end

  it 'renders for a teacher when lessons exist' do
    teacher = create(:teacher_profile)
    create(:lesson, teacher:)
    sign_in teacher.user

    get dashboard_path

    expect(response).to have_http_status(:ok)
  end
end
