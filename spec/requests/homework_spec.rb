# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Homework page' do
  it 'renders the teacher homework workspace with demo assignments' do
    workspace = create(:workspace)
    sign_in workspace.owner

    get homework_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(I18n.t('app.homework.title'))
    expect(response.body).to include(I18n.t('app.homework.subtitle'))
    expect(response.body).to include(I18n.t('app.homework.add'))
    expect(response.body).to include('Past Simple Practice')
    expect(response.body).to include('Listening worksheet')
    expect(response.body).to include(I18n.t('app.homework.tab_to_review'))
    expect(response.body).to include(I18n.t('app.homework.student_submission'))
    expect(response.body).to include(I18n.t('app.homework.correction_title'))
    expect(response.body).to include(I18n.t('app.homework.written_answer'))
    expect(response.body).to include(I18n.t('app.homework.attach_from_materials'))
  end

  it 'redirects students to the student portal' do
    user = create(:user, :student)
    sign_in user

    get homework_path

    expect(response).to redirect_to(student_root_path)
  end
end
