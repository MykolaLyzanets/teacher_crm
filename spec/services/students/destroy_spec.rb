# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Students::Destroy do
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
    already_cancelled = create(
      :lesson,
      teacher:,
      students: [student],
      with_student: false,
      status: :cancelled
    )

    described_class.new(student_profile: student).call

    expect(student.reload).to be_archived
    expect(upcoming.reload).to be_cancelled
    expect(upcoming.notes).to eq(I18n.t('app.lessons.cancelled_student_archived'))
    expect(done.reload).to be_completed
    expect(already_cancelled.reload).to be_cancelled
  end
end
