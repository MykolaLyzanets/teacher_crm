# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Homeworks API' do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }
  let(:lesson) do
    create(:lesson, teacher:, status: :completed).tap do |record|
      record.students = [student]
      record.save!
    end
  end

  def json_response
    response.parsed_body
  end

  describe 'authorization' do
    it 'forbids students from teacher homework API' do
      homework = create(:homework, workspace:, teacher:, students: [student])
      sign_in student.user

      get "/ua/homeworks/#{homework.id}", as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json_response['error']).to eq(I18n.t('app.homework.staff_only'))
    end
  end

  describe 'POST /homeworks' do
    it 'assigns all lesson students when studentIds are omitted' do
      sign_in workspace.owner

      post homeworks_path, params: {
        lessonId: lesson.id,
        instructions: 'Everyone on the lesson.',
        dueDate: 1.week.from_now.to_date.iso8601
      }, as: :json

      expect(response).to have_http_status(:created)
      expect(Homework.last.homework_students.pluck(:student_id)).to eq([student.id])
    end

    it 'creates homework with draft responses for each student' do
      sign_in workspace.owner

      post homeworks_path, params: {
        lessonId: lesson.id,
        studentIds: [student.id],
        title: 'Past Simple Practice',
        instructions: 'Write five sentences.',
        dueDate: 1.week.from_now.to_date.iso8601
      }, as: :json

      expect(response).to have_http_status(:created)
      homework = Homework.last
      expect(homework.title).to eq('Past Simple Practice')
      expect(homework.homework_students.count).to eq(1)
      expect(homework.homework_responses.first).to be_draft
      expect(json_response.dig('row', 'status')).to eq('assigned')
    end

    it 'keeps due time in the teacher time zone in API rows' do
      teacher.update!(timezone: 'America/New_York')
      due_date = Date.new(2026, 9, 28)
      sign_in workspace.owner

      post homeworks_path, params: {
        lessonId: lesson.id,
        studentIds: [student.id],
        instructions: 'Finish by 3:51 PM.',
        dueDate: due_date.iso8601,
        dueTime: '15:51'
      }, as: :json

      expect(response).to have_http_status(:created)
      homework = Homework.last
      local_due = homework.due_at.in_time_zone(teacher.time_zone)
      expect(local_due.strftime('%H:%M')).to eq('15:51')
      expect(json_response.dig('row', 'dueTime')).to eq('15:51')
      expect(json_response.dig('row', 'dueDate')).to eq(due_date.iso8601)
    end

    it 'rejects an invalid due date' do
      sign_in workspace.owner

      post homeworks_path, params: {
        lessonId: lesson.id,
        studentIds: [student.id],
        instructions: 'Write five sentences.',
        dueDate: 'not-a-date'
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response['errors']).to include(I18n.t('app.homework.invalid_due_date'))
    end

    it 'rejects a lesson that is not completed or no-show' do
      scheduled_lesson = create(:lesson, teacher:, status: :confirmed).tap do |record|
        record.students = [student]
        record.save!
      end
      sign_in workspace.owner

      post homeworks_path, params: {
        lessonId: scheduled_lesson.id,
        studentIds: [student.id],
        instructions: 'Too early.',
        dueDate: 1.week.from_now.to_date.iso8601
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response['errors']).to include(I18n.t('app.homework.lesson_not_eligible'))
      expect(Homework.where(lesson_id: scheduled_lesson.id)).to be_empty
    end

    it 'rejects a lesson that already has homework' do
      create(:homework, workspace:, teacher:, lesson:, students: [student])
      sign_in workspace.owner

      post homeworks_path, params: {
        lessonId: lesson.id,
        studentIds: [student.id],
        instructions: 'Repeat task.',
        dueDate: 1.week.from_now.to_date.iso8601
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response['errors']).to include(I18n.t('app.homework.lesson_already_has_homework'))
    end
  end

  describe 'PATCH /homeworks/:id' do
    it 'updates assignment fields' do
      homework = create(:homework, workspace:, teacher:, students: [student], lesson:)
      sign_in workspace.owner

      patch "/ua/homeworks/#{homework.id}", params: {
        title: 'Updated title',
        instructions: 'Updated instructions.',
        dueDate: 2.weeks.from_now.to_date.iso8601
      }, as: :json

      expect(response).to have_http_status(:ok)
      expect(homework.reload.title).to eq('Updated title')
      expect(json_response.dig('row', 'title')).to eq('Updated title')
    end

    it 'rejects an invalid due date on update' do
      homework = create(:homework, workspace:, teacher:, students: [student], lesson:)
      original_due_at = homework.due_at
      sign_in workspace.owner

      patch "/ua/homeworks/#{homework.id}", params: {
        dueDate: 'bad-date'
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response['errors']).to include(I18n.t('app.homework.invalid_due_date'))
      expect(homework.reload.due_at).to eq(original_due_at)
    end
  end

  describe 'GET /homeworks/:id' do
    it 'returns the teacher row payload' do
      homework = create(:homework, workspace:, teacher:, students: [student], title: 'Reading task')
      sign_in workspace.owner

      get "/ua/homeworks/#{homework.id}", as: :json

      expect(response).to have_http_status(:ok)
      expect(json_response.dig('row', 'title')).to eq('Reading task')
      expect(json_response['summary']).to include('toReview', 'active')
    end
  end

  describe 'POST /homeworks/:id/review' do
    it 'marks submitted work as reviewed' do
      homework = create(:homework, workspace:, teacher:, students: [student])
      response_record = homework.homework_responses.first
      response_record.update!(status: :submitted, submitted_at: Time.current, written_response: 'Done.')
      sign_in workspace.owner

      post review_homework_path(id: homework.id), params: { decision: 'reviewed', feedback: 'Great job.' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(response_record.reload).to be_reviewed
      expect(json_response.dig('row', 'status')).to eq('reviewed')
    end

    it 'clears resubmission_due_at when marking reviewed' do
      homework = create(:homework, workspace:, teacher:, students: [student], resubmission_due_at: 3.days.from_now)
      homework.homework_responses.first.update!(status: :submitted, submitted_at: Time.current, written_response: 'Done.')
      sign_in workspace.owner

      post review_homework_path(id: homework.id), params: { decision: 'reviewed', feedback: 'Great job.' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(homework.reload.resubmission_due_at).to be_nil
    end

    it 'requires feedback when requesting revision' do
      homework = create(:homework, workspace:, teacher:, students: [student])
      homework.homework_responses.first.update!(status: :submitted, submitted_at: Time.current, written_response: 'Done.')
      sign_in workspace.owner

      post review_homework_path(id: homework.id), params: { decision: 'resubmission_requested', feedback: '' }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response['errors'].join).to include(I18n.t('app.homework.feedback_required_error'))
    end
  end

  describe 'PATCH /homework_responses/:id/submit' do
    it 'lets a student submit a draft response' do
      homework = create(:homework, workspace:, teacher:, students: [student])
      response_record = homework.homework_responses.first
      sign_in student.user

      patch submit_homework_response_path(id: response_record.id), params: { writtenResponse: 'My answer.' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(response_record.reload).to be_submitted
      expect(json_response.dig('response', 'writtenResponse')).to eq('My answer.')
      expect(json_response.dig('item', 'tab')).to eq('submitted')
      expect(json_response.dig('item', 'facingLabel')).to eq(I18n.t('app.student_portal.homework.statuses.submitted'))
      expect(json_response.dig('item', 'facingTone')).to eq('amber')
    end

    it 'forbids teachers from submitting responses' do
      homework = create(:homework, workspace:, teacher:, students: [student])
      response_record = homework.homework_responses.first
      sign_in teacher.user

      patch submit_homework_response_path(id: response_record.id), params: { writtenResponse: 'Nope.' }, as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end
end
