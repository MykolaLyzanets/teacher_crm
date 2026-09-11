# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Teacher form' do
  it 'marks email as required on the create form' do
    workspace = create(:workspace)
    sign_in workspace.owner

    get new_teacher_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("#{I18n.t('app.teachers.email')}<span class=\"teachers-page__req\">*</span>")
    expect(response.body).to match(/name="email"[^>]*required/)
    expect(response.body).not_to include('Необовʼязковий контактний email')
  end

  it 'renders lesson types on the teacher profile' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:, first_name: 'Maya', last_name: 'Ice')
    sign_in workspace.owner

    get teacher_path(id: teacher.id)

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('id="lesson-types"')
    expect(response.body).to include(I18n.t('app.lesson_types.lessons_pricing'))
    expect(response.body).to include('data-lesson-types-target="list"')
    expect(response.body).to include('data-lesson-types-mode-value="catalog"')
  end
end
