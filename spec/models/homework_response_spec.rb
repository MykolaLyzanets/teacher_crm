# frozen_string_literal: true

require 'rails_helper'

RSpec.describe HomeworkResponse do
  let(:workspace) { create(:workspace) }
  let(:teacher) { create(:teacher_profile, workspace:) }
  let(:student) { create(:student_profile, workspace:, teacher_profile: teacher) }
  let(:homework) { create(:homework, workspace:, teacher:, students: [student]) }
  let(:response_record) { homework.homework_responses.first }

  it 'submits draft responses with validation' do
    expect(response_record.submit!(written_response: 'My homework.')).to be(true)
    expect(response_record.reload).to be_submitted
    expect(response_record.submitted_at).to be_present
  end

  it 'requires written content on submit' do
    expect(response_record.submit!(written_response: '  ')).to be(false)
    expect(response_record.errors[:written_response]).to be_present
  end

  it 'saves drafts without submitting' do
    expect(response_record.save_draft!(written_response: 'Work in progress')).to be(true)
    expect(response_record.reload.written_response).to eq('Work in progress')
    expect(response_record).to be_draft
  end
end
