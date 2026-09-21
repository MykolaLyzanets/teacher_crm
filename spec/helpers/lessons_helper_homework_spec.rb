# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LessonsHelper, type: :helper do
  describe '#lesson_homework_status' do
    let(:workspace) { create(:workspace) }
    let(:teacher) { create(:teacher_profile, workspace:) }
    let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }
    let(:lesson) do
      create(:lesson, teacher:, status: :completed).tap do |record|
        record.students = [student]
        record.save!
      end
    end

    it 'reads homework from the database via lesson_id' do
      homework = create(:homework, workspace:, teacher:, lesson:, students: [student], title: 'DB homework')
      homework.homework_responses.first.update!(status: :submitted, submitted_at: Time.current, written_response: 'x')

      status = helper.lesson_homework_status(lesson.as_catalog)

      expect(status[:assigned]).to be(true)
      expect(status[:id]).to eq(homework.id.to_s)
      expect(status[:title]).to eq('DB homework')
      expect(status[:status]).to eq('submitted')
    end

    it 'returns unassigned when lesson has no homework' do
      status = helper.lesson_homework_status(lesson.as_catalog)

      expect(status[:assigned]).to be(false)
    end
  end
end
