# frozen_string_literal: true

module Homework::TeacherReview
  extend ActiveSupport::Concern

  # Group homework: one review action updates every submitted HomeworkResponse with the same
  # feedback/score. Teacher UI preview uses representative_response only; per-student review is
  # not exposed via homework_response_id yet.
  def review_submissions!(decision:, feedback:, score:, reviewer:, resubmission_due_at: nil)
    targets = homework_responses.submitted.to_a
    if targets.empty?
      errors.add(:base, I18n.t('app.homework.nothing_to_review'))
      return false
    end

    normalized = decision.to_s
    unless %w[reviewed resubmission_requested].include?(normalized)
      errors.add(:base, I18n.t('app.homework.invalid_review_decision'))
      return false
    end

    if normalized == 'resubmission_requested' && feedback.blank?
      errors.add(:feedback, I18n.t('app.homework.feedback_required_error'))
      return false
    end

    transaction do
      targets.each do |response|
        apply_review_to_response!(response, normalized, feedback, score, reviewer)
      end
      if normalized == 'reviewed'
        update!(resubmission_due_at: nil)
      elsif resubmission_due_at.present?
        update!(resubmission_due_at:)
      end
    end
    true
  end

  private

  def apply_review_to_response!(response, decision, feedback, score, reviewer)
    if decision == 'reviewed'
      response.update!(
        status: :reviewed,
        feedback: feedback.presence,
        score: score.presence,
        reviewed_at: Time.current,
        reviewed_by: reviewer
      )
    else
      response.update!(
        status: :resubmission_requested,
        feedback:,
        score: nil,
        reviewed_at: nil,
        reviewed_by: nil
      )
    end
  end
end
