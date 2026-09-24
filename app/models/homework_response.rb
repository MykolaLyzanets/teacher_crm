# frozen_string_literal: true

class HomeworkResponse < ApplicationRecord
  include HomeworkResponse::DisplayStatus
  include HomeworkResponse::Lifecycle

  STATUSES = { draft: 0, submitted: 1, reviewed: 2, resubmission_requested: 3 }.freeze

  enum status: STATUSES

  belongs_to :homework_student, inverse_of: :homework_response
  belongs_to :reviewed_by, class_name: 'User', optional: true, inverse_of: :reviewed_homework_responses
  has_many :materials, dependent: :destroy, inverse_of: :homework_response

  validates :status, presence: true
  validates :written_response, presence: true, on: :submit
end
