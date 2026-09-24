# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Material do
  describe 'associations' do
    it { is_expected.to belong_to(:workspace) }
    it { is_expected.to belong_to(:teacher).class_name('TeacherProfile') }
    it { is_expected.to belong_to(:lesson).optional }
    it { is_expected.to belong_to(:homework).optional }
    it { is_expected.to belong_to(:homework_response).optional }
    it { is_expected.to have_many(:material_students).dependent(:destroy) }
    it { is_expected.to have_many(:students).through(:material_students) }
  end
end
