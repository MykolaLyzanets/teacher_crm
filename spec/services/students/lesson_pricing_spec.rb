# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Students::LessonPricing do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }
  let(:subject) { create(:subject, workspace:, teacher_profile: nil) }
  let(:lesson_type) { create(:lesson_type, subject:, price_cents: 5000) }

  describe '.sync!' do
    it 'stores rows per lesson type in UAH' do
      raw = [
        {
          lessonTypeId: lesson_type.id,
          subjectId: subject.id,
          subjectName: subject.name,
          lessonTypeName: lesson_type.name,
          priceCents: 3200,
          currency: 'UAH'
        }
      ]

      described_class.sync!(student_profile: student, raw: raw.to_json)

      row = student.student_lesson_type_prices.find_by!(lesson_type_id: lesson_type.id)
      expect(row.price_cents).to eq(3200)
      expect(row.currency).to eq('UAH')
    end

    it 'removes lesson types no longer listed' do
      described_class.sync!(
        student_profile: student,
        raw: [{ lessonTypeId: lesson_type.id, priceCents: 1000 }].to_json
      )
      described_class.sync!(student_profile: student, raw: [].to_json)

      expect(student.student_lesson_type_prices.count).to eq(0)
    end
  end

  describe '.price_cents_for_lesson_type' do
    it 'matches by subject and lesson type name when ids differ' do
      teacher_subject = create(:subject, workspace:, teacher_profile: teacher, name: 'English')
      teacher_lesson_type = create(:lesson_type, subject: teacher_subject, name: 'Individual', price_cents: 5000)

      StudentLessonTypePrice.create!(
        workspace:,
        student_profile: student,
        lesson_type:,
        price_cents: 2800,
        currency: 'UAH'
      )

      expect(
        described_class.price_cents_for_lesson_type(student_profile: student, lesson_type: teacher_lesson_type)
      ).to eq(2800)
    end
  end

  describe '.price_cents_for' do
    it 'returns the stored price for a lesson type' do
      StudentLessonTypePrice.create!(
        workspace:,
        student_profile: student,
        lesson_type:,
        price_cents: 2800,
        currency: 'UAH'
      )

      expect(described_class.price_cents_for(student_profile: student, lesson_type_id: lesson_type.id)).to eq(2800)
    end
  end

  describe '.catalog_rows' do
    it 'serializes stored prices for the student form' do
      StudentLessonTypePrice.create!(
        workspace:,
        student_profile: student,
        lesson_type:,
        price_cents: 4500,
        currency: 'UAH'
      )

      rows = described_class.catalog_rows(student)

      expect(rows.size).to eq(1)
      expect(rows.first[:lessonTypeId]).to eq(lesson_type.id.to_s)
      expect(rows.first[:priceCents]).to eq(4500)
    end
  end
end
