# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Demo::TeacherHomework do
  def item(overrides = {})
    {
      id: 'hw-test',
      studentId: 'stu-emma',
      title: 'Practice',
      assignedDate: '2026-09-10',
      dueDate: '2026-09-20',
      teacher: 'Ava Thompson',
      status: 'assigned'
    }.merge(overrides)
  end

  it 'marks assigned homework overdue after the due date' do
    expect(described_class.status(item(dueDate: '2026-09-10'), today: Date.new(2026, 9, 17))).to eq('overdue')
  end

  it 'treats needs_review and submitted as to-review' do
    submitted = item(status: 'submitted')
    expect(described_class.status(submitted)).to eq('submitted')
    expect(described_class.tab_for(submitted)).to eq('to_review')
  end

  it 'keeps resubmission requests in the active tab' do
    revision = item(status: 'assigned', submission: { status: 'resubmission_requested' })
    expect(described_class.status(revision)).to eq('needs_revision')
    expect(described_class.tab_for(revision)).to eq('active')
  end

  it 'counts reviewed homework in the current month' do
    items = [
      item(status: 'needs_review'),
      item(status: 'assigned', dueDate: '2026-09-21'),
      item(status: 'overdue', dueDate: '2026-09-01'),
      item(status: 'reviewed', reviewedAt: '2026-09-12T18:00:00.000Z')
    ]
    summary = described_class.summary(items, now: Time.zone.local(2026, 9, 17, 12, 0, 0))

    expect(summary).to eq(toReview: 1, active: 1, overdue: 1, reviewedThisMonth: 1)
  end
end
