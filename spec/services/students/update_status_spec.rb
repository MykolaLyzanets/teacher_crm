# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Students::UpdateStatus do
  it 'changes the student status without touching other fields' do
    student = create(:student_profile, first_name: 'Emma', last_name: 'Johnson', status: :active)

    service = described_class.new(student_profile: student, status: 'paused')

    expect(service.save).to be(true)
    student.reload
    expect(student).to be_paused
    expect(student.first_name).to eq('Emma')
    expect(student.last_name).to eq('Johnson')
    expect(service.became_archived?).to be(false)
  end

  it 'pauses the student and cancels confirmed lessons' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    student = create(:student_profile, workspace:)
    upcoming = create(:lesson, teacher:, students: [student], with_student: false)
    done = create(
      :lesson,
      teacher:,
      students: [student],
      with_student: false,
      status: :completed,
      attendance: :present
    )

    service = described_class.new(student_profile: student, status: 'paused')

    expect(service.save).to be(true)
    expect(student.reload).to be_paused
    expect(upcoming.reload).to be_cancelled
    expect(upcoming.notes).to eq(I18n.t('app.lessons.cancelled_student_paused'))
    expect(done.reload).to be_completed
  end

  it 'rejects an unknown status' do
    student = create(:student_profile, status: :active)
    service = described_class.new(student_profile: student, status: 'unknown')

    expect(service.save).to be(false)
    expect(service.error_messages).to include(I18n.t('app.students.select_status'))
    expect(student.reload).to be_active
  end

  it 'archives the student and cancels confirmed lessons' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    student = create(:student_profile, workspace:)
    upcoming = create(:lesson, teacher:, students: [student], with_student: false)
    done = create(
      :lesson,
      teacher:,
      students: [student],
      with_student: false,
      status: :completed,
      attendance: :present
    )

    service = described_class.new(student_profile: student, status: 'archived')

    expect(service.save).to be(true)
    expect(service.became_archived?).to be(true)
    expect(student.reload).to be_archived
    expect(upcoming.reload).to be_cancelled
    expect(upcoming.notes).to eq(I18n.t('app.lessons.cancelled_student_archived'))
    expect(done.reload).to be_completed
  end
end
