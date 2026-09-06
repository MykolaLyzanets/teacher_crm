# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Subject do
  describe 'associations' do
    it { is_expected.to belong_to(:teacher_profile).with_foreign_key(:teacher_id) }
    it { is_expected.to have_many(:lesson_types).dependent(:restrict_with_error) }
    it { is_expected.to have_many(:lessons).dependent(:restrict_with_error) }
  end

  describe 'validations' do
    subject { build(:subject) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:name).scoped_to(:teacher_id).case_insensitive }
  end

  it 'belongs to a teacher and does not store workspace_id' do
    teacher = create(:teacher_profile)
    record = create(:subject, teacher_profile: teacher, name: 'English')

    expect(record.teacher_profile).to eq(teacher)
    expect(record).not_to respond_to(:workspace_id)
    expect(described_class.column_names).not_to include('workspace_id')
  end
end
