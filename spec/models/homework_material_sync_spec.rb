# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Homework material sync guards' do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }

  def build_homework(**attrs)
    create(:homework, workspace:, teacher:, students: [student], **attrs)
  end

  describe '#sync_material_ids!' do
    it 'does not steal a material already linked to another homework' do
      homework_a = build_homework(title: 'Task A')
      homework_b = build_homework(title: 'Task B')
      attached = create(:material, workspace:, teacher:, homework: homework_a)

      homework_b.sync_material_ids!([attached.id])

      expect(attached.reload.homework_id).to eq(homework_a.id)
      expect(homework_b.materials).to be_empty
    end

    it 'links standalone library materials and clears lesson_id' do
      homework = build_homework
      lesson = create(:lesson, teacher:, status: :completed).tap { |record| record.students = [student]; record.save! }
      library = create(:material, workspace:, teacher:)
      library.update!(lesson_id: lesson.id)

      homework.sync_material_ids!([library.id])

      library.reload
      expect(library.homework_id).to eq(homework.id)
      expect(library.lesson_id).to be_nil
      expect(library.role_assignment?).to be(true)
    end
  end

  describe '#sync_review_material_ids!' do
    it 'does not convert another homework assignment into review material' do
      homework_a = build_homework(title: 'Task A')
      homework_b = build_homework(title: 'Task B')
      row = homework_b.homework_students.first
      row.homework_response.update!(status: :submitted, submitted_at: Time.current, written_response: 'Done')
      assignment = create(:material, workspace:, teacher:, homework: homework_a)

      homework_b.sync_review_material_ids!([assignment.id])

      assignment.reload
      expect(assignment.homework_id).to eq(homework_a.id)
      expect(assignment.role_assignment?).to be(true)
      expect(assignment.homework_response_id).to be_nil
    end

    it 'links standalone library materials to the representative response as review' do
      homework = build_homework
      row = homework.homework_students.first
      row.homework_response.update!(status: :submitted, submitted_at: Time.current, written_response: 'Done')
      library = create(:material, workspace:, teacher:)

      homework.sync_review_material_ids!([library.id])

      library.reload
      expect(library.homework_id).to eq(homework.id)
      expect(library.homework_response_id).to eq(row.homework_response.id)
      expect(library.role_review?).to be(true)
    end
  end
end
