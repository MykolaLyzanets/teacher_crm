# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Appearance' do
  it 'saves the picker on the teacher account' do
    teacher = create(:teacher_profile)
    sign_in teacher.user

    patch appearance_path, params: { appearance: { theme: 'emerald', background: 'light' } }, as: :json

    expect(response).to have_http_status(:ok)
    expect(teacher.user.reload.appearance).to include('theme' => 'emerald', 'background' => 'light')
  end

  it 'saves the picker on the student account' do
    student = create(:student_profile)
    sign_in student.user

    patch appearance_path, params: { appearance: { color: 'olive', theme: 'amber' } }, as: :json

    expect(response).to have_http_status(:ok)
    expect(student.user.reload.appearance).to include('color' => 'olive', 'theme' => 'amber')
  end

  it 'drops unknown keys and invalid values' do
    teacher = create(:teacher_profile)
    sign_in teacher.user

    patch appearance_path, params: {
      appearance: { theme: 'blue', hack: '<script>', font: 'Inter Bold' }
    }, as: :json

    expect(response).to have_http_status(:ok)
    expect(teacher.user.reload.appearance).to eq('theme' => 'blue')
  end

  it 'boots the cabinet with the stored appearance' do
    teacher = create(:teacher_profile)
    teacher.user.update!(appearance: { 'theme' => 'rose', 'background' => 'sage' })
    sign_in teacher.user

    get dashboard_path

    expect(response.body).to include('id="danlio-appearance"')
    expect(response.body).to include('"theme":"rose"')
    expect(response.body).to include('"background":"sage"')
  end
end
