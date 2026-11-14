# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TeacherAbsence do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }

  it 'requires reason detail when type is other' do
    absence = teacher.teacher_absences.build(
      absence_type: :other,
      starts_on: Date.current,
      ends_on: Date.current
    )
    expect(absence).not_to be_valid
    expect(absence.errors[:reason_detail]).to be_present
  end

  it 'saves a sick leave absence' do
    absence = teacher.teacher_absences.create!(
      absence_type: :sick_leave,
      starts_on: Date.current,
      ends_on: Date.current + 2.days,
      note: 'Flu'
    )
    expect(absence).to be_persisted
    expect(absence).to be_absence_sick_leave
  end

  it 'rejects an absence that overlaps an existing period' do
    teacher.teacher_absences.create!(
      absence_type: :sick_leave,
      starts_on: Date.new(2026, 11, 13),
      ends_on: Date.new(2026, 11, 27)
    )
    duplicate = teacher.teacher_absences.build(
      absence_type: :vacation,
      starts_on: Date.new(2026, 11, 20),
      ends_on: Date.new(2026, 11, 30)
    )
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:base]).to include(I18n.t('app.teachers.absence_period_overlap'))
  end

  it 'rejects an absence with the same date range' do
    teacher.teacher_absences.create!(
      absence_type: :sick_leave,
      starts_on: Date.new(2026, 11, 13),
      ends_on: Date.new(2026, 11, 27)
    )
    duplicate = teacher.teacher_absences.build(
      absence_type: :personal,
      starts_on: Date.new(2026, 11, 13),
      ends_on: Date.new(2026, 11, 27)
    )
    expect(duplicate).not_to be_valid
  end

  it 'allows adjacent non-overlapping absences' do
    teacher.teacher_absences.create!(
      absence_type: :sick_leave,
      starts_on: Date.new(2026, 11, 1),
      ends_on: Date.new(2026, 11, 10)
    )
    next_absence = teacher.teacher_absences.build(
      absence_type: :vacation,
      starts_on: Date.new(2026, 11, 11),
      ends_on: Date.new(2026, 11, 20)
    )
    expect(next_absence).to be_valid
  end
end
