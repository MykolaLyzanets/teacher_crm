# frozen_string_literal: true

module HomeworkResponse::Lifecycle
  extend ActiveSupport::Concern

  def save_draft!(written_response:)
    unless draft? || resubmission_requested?
      errors.add(:status, :invalid_transition)
      return false
    end

    self.written_response = written_response
    save
  end

  def submit!(written_response:)
    unless draft? || resubmission_requested?
      errors.add(:status, :invalid_transition)
      return false
    end

    self.written_response = written_response
    self.status = :submitted
    self.submitted_at = Time.current
    save(context: :submit)
  end
end
