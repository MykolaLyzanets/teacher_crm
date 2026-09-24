# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Homework do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  def build_homework(**attrs)
    create(:homework, workspace:, teacher:, students: [student], **attrs)
  end

  def response_for(homework, status:, **attrs)
    row = homework.homework_students.first
    row.homework_response.update!(status:, **attrs)
  end

  it 'marks draft responses overdue after the due date' do
    homework = build_homework(
      assigned_at: Time.zone.local(2026, 9, 1, 9),
      due_at: Time.zone.local(2026, 9, 10, 23, 59)
    )
    response_for(homework, status: :draft)

    expect(homework.computed_status(at: Time.zone.local(2026, 9, 17, 12))).to eq('overdue')
  end

  it 'treats submitted responses as to-review' do
    homework = build_homework
    response_for(homework, status: :submitted, submitted_at: Time.zone.local(2026, 9, 15, 9))

    expect(homework.computed_status).to eq('submitted')
    expect(homework.tab_for).to eq('to_review')
  end

  it 'keeps resubmission requests in the active tab' do
    homework = build_homework
    response_for(homework, status: :resubmission_requested)

    expect(homework.computed_status).to eq('needs_revision')
    expect(homework.tab_for).to eq('active')
  end

  it 'enforces one homework per lesson in the database' do
    lesson = create(:lesson, teacher:, status: :completed).tap { |record| record.students = [student]; record.save! }
    create(:homework, workspace:, teacher:, lesson:, students: [student])

    duplicate = build(:homework, workspace:, teacher:, lesson:, students: [])

    expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it 'clears resubmission_due_at when marking work reviewed' do
    homework = build_homework(resubmission_due_at: 1.week.from_now)
    response_for(homework, status: :submitted, submitted_at: Time.current, written_response: 'Answer')

    homework.review_submissions!(decision: 'reviewed', feedback: 'Done', score: nil, reviewer: teacher.user.reload)

    expect(homework.reload.resubmission_due_at).to be_nil
  end

  it 'reviews submitted responses' do
    homework = build_homework
    response_for(homework, status: :submitted, submitted_at: Time.current, written_response: 'Answer')

    expect(
      homework.review_submissions!(decision: 'reviewed', feedback: 'Nice', score: '10/10', reviewer: teacher.user.reload)
    ).to be(true)

    expect(homework.homework_responses.first.reload).to be_reviewed
    expect(homework.reload.computed_status).to eq('reviewed')
  end

  it 'counts reviewed homework in the current month' do
    assigned = build_homework(due_at: 2.days.from_now)
    response_for(assigned, status: :draft)

    submitted = build_homework(title: 'Submitted task')
    response_for(submitted, status: :submitted, submitted_at: Time.current)

    overdue = build_homework(title: 'Overdue task', assigned_at: 2.weeks.ago, due_at: 1.week.ago)
    response_for(overdue, status: :draft)

    reviewed = build_homework(title: 'Reviewed task')
    response_for(
      reviewed,
      status: :reviewed,
      submitted_at: 2.days.ago,
      reviewed_at: Time.zone.local(2026, 9, 12, 18)
    )

    summary = described_class.summary_for(
      [assigned, submitted, overdue, reviewed],
      now: Time.zone.local(2026, 9, 17, 12)
    )

    expect(summary).to eq(toReview: 1, active: 1, overdue: 1, reviewedThisMonth: 1)
  end

  it 'includes linked materials in the teacher row' do
    homework = build_homework
    material = create(:material, workspace:, teacher:, homework:, students: [student])

    row = homework.as_teacher_row

    expect(row[:materialIds]).to eq([material.id.to_s])
    expect(row[:attachments]).to eq(1)
  end

  it 'exposes per-student submission rows for group homework' do
    student_two = create(:student_profile, workspace:, teacher_profile: teacher)
    homework = build_homework(students: [student, student_two])
    response_for(homework, status: :submitted, submitted_at: Time.current, written_response: 'Done')
    second = homework.homework_students.find_by!(student: student_two)
    second.homework_response.update!(status: :draft)

    row = homework.as_teacher_row
    submissions = row[:studentSubmissions]

    expect(submissions.size).to eq(2)
    expect(row[:submissionSummary]).to eq(I18n.t('app.homework.submission_progress', submitted: 1, total: 2))
    expect(submissions.count { |entry| entry[:hasSubmission] }).to eq(1)
  end
end
