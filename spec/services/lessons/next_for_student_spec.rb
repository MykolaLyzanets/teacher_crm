# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lessons::NextForStudent do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  it 'returns the next confirmed lesson as catalog data' do
    subject_record = create(:subject, teacher_profile: teacher)
    lesson_type = create(:lesson_type, subject: subject_record)
    earlier = create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )
    earlier.update!(starts_at: 1.day.from_now, ends_at: 1.day.from_now + 1.hour)
    later = create(
      :lesson,
      teacher:,
      subject: subject_record,
      lesson_type:,
      students: [student],
      with_student: false
    )
    later.update!(starts_at: 2.days.from_now, ends_at: 2.days.from_now + 1.hour)

    catalog = described_class.call(student)

    expect(catalog[:id]).to eq(earlier.id)
    expect(catalog[:subject]).to eq(subject_record.name)
  end

  it 'returns nil when the student has no upcoming lessons' do
    expect(described_class.call(student)).to be_nil
  end
end
