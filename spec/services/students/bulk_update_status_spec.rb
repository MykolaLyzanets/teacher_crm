# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Students::BulkUpdateStatus do
  it 'updates status for every selected student' do
    workspace = create(:workspace)
    first = create(:student_profile, workspace:, status: :active)
    second = create(:student_profile, workspace:, status: :trial)

    service = described_class.new(
      student_scope: StudentProfile.where(workspace:),
      student_ids: [first.id, second.id],
      status: 'paused'
    )

    expect(service.save).to be(true)
    expect(service.count).to eq(2)
    expect(first.reload).to be_paused
    expect(second.reload).to be_paused
  end

  it 'cancels confirmed lessons when pausing selected students' do
    workspace = create(:workspace)
    teacher = create(:teacher_profile, workspace:)
    student = create(:student_profile, workspace:)
    upcoming = create(:lesson, teacher:, students: [student], with_student: false)

    service = described_class.new(
      student_scope: StudentProfile.where(workspace:),
      student_ids: [student.id],
      status: 'paused'
    )

    expect(service.save).to be(true)
    expect(upcoming.reload).to be_cancelled
    expect(upcoming.notes).to eq(I18n.t('app.lessons.cancelled_student_paused'))
  end

  it 'rejects an empty selection' do
    workspace = create(:workspace)
    service = described_class.new(student_scope: StudentProfile.where(workspace:), student_ids: [], status: 'paused')

    expect(service.save).to be(false)
    expect(service.error_messages).to include(I18n.t('app.students.assign_none'))
  end
end
