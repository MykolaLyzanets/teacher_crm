# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LessonType do
  describe 'associations' do
    it { is_expected.to belong_to(:subject) }
    it { is_expected.to have_many(:lessons).dependent(:restrict_with_error) }
  end

  describe 'validations' do
    subject { build(:lesson_type) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:name).scoped_to(:subject_id).case_insensitive }
    it { is_expected.to validate_numericality_of(:default_duration_minutes).only_integer.is_greater_than(0) }
    it { is_expected.to validate_numericality_of(:price_cents).only_integer.is_greater_than_or_equal_to(0).allow_nil }
  end

  it 'stores kind and mode independently' do
    record = create(:lesson_type, :trial)

    expect(record).to be_kind_trial
    expect(record).to be_mode_individual
    expect(record.kind).not_to eq(record.mode)
  end
end
