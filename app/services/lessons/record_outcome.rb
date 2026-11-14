# frozen_string_literal: true

module Lessons
  class RecordOutcome
    extend ActiveModel::Naming
    extend ActiveModel::Translation

    OUTCOMES = %w[completed cancelled confirmed].freeze
    RECORDED_ATTENDANCE = %w[present late absent excused].freeze
    REASON_CODES = %w[
      student_advance student_late student_no_show teacher_cancelled technical emergency other
    ].freeze

    def initialize(lesson:, params:)
      @lesson = lesson
      @params = params.to_h.with_indifferent_access
    end

    attr_reader :lesson, :errors

    def save
      @errors = ActiveModel::Errors.new(self)
      outcome = @params[:outcome].to_s
      unless OUTCOMES.include?(outcome)
        errors.add(:base, :invalid_outcome)
        return false
      end

      ok = case outcome
           when 'completed' then complete
           when 'cancelled' then cancel
           else correct
           end
      return false unless ok
      return true if @lesson.completed? && outcome == 'completed' && !@lesson.changed?

      success = false
      ActiveRecord::Base.transaction do
        lesson.save!
        lesson.reload
        success = save_finance!(outcome)
        if !success
          Rails.logger.warn("[Lessons::RecordOutcome] finance failed lesson=#{lesson.id}: #{error_messages.join(' | ')}")
          raise ActiveRecord::Rollback
        end
      end
      success
    rescue ActiveRecord::RecordInvalid => e
      errors.merge!(e.record.errors)
      false
    rescue ActiveRecord::RecordNotFound => e
      errors.add(:base, e.message)
      false
    end

    def error_messages
      (errors.full_messages + Array(lesson&.errors&.full_messages)).uniq
    end

    private

    def complete
      return true if @lesson.completed?

      unless @lesson.confirmed?
        errors.add(:base, :not_confirmed)
        return false
      end

      attendance = normalize_attendance
      unless RECORDED_ATTENDANCE.include?(attendance)
        errors.add(:attendance, :blank)
        return false
      end

      minutes = duration_minutes
      if minutes.blank? || !minutes.is_a?(Integer) || minutes <= 0
        errors.add(:actual_duration_minutes, :blank)
        return false
      end

      decision = attendance == 'excused' ? :no_charge : :charge
      charged = decision == :charge ? @lesson.billed_price_cents.to_i : 0

      @lesson.assign_attributes(
        status: :completed,
        attendance:,
        actual_duration_minutes: minutes,
        teacher_note: text_value(:teacher_note, :teacherNote),
        student_progress_note: text_value(:student_progress_note, :studentProgressNote),
        charge_decision: decision,
        charged_cents: charged
      )
      true
    end

    def cancel
      unless @lesson.confirmed?
        errors.add(:base, :not_confirmed)
        return false
      end

      code = @params[:reason_code].presence || @params[:reasonCode].presence
      other = text_value(:other_reason_text, :otherReasonText)
      if code.to_s == 'other' && other.blank?
        errors.add(:base, :describe_reason)
        return false
      end

      decision = charge? ? :charge : :no_charge
      charged = decision == :charge ? @lesson.billed_price_cents.to_i : 0
      note = text_value(:cancellation_note, :cancellationNote)
      readable = cancel_reason_label(code, other)

      @lesson.assign_attributes(
        status: :cancelled,
        attendance: :pending,
        actual_duration_minutes: nil,
        teacher_note: nil,
        student_progress_note: nil,
        notes: [readable, note].compact_blank.join("\n\n").presence || I18n.t('app.lessons.cancelled_manual'),
        cancellation_reason_code: code,
        cancellation_other_text: code.to_s == 'other' ? other : nil,
        cancellation_note: note,
        cancelled_by_id: @params[:cancelled_by_id].presence || @params[:cancelledById],
        charge_decision: decision,
        charged_cents: charged
      )
      true
    end

    def correct
      unless @lesson.completed? || @lesson.cancelled?
        errors.add(:base, :not_recorded)
        return false
      end

      attrs = {
        status: :confirmed,
        attendance: :pending,
        actual_duration_minutes: nil,
        teacher_note: nil,
        student_progress_note: nil
      }
      if @lesson.cancelled?
        attrs[:notes] = nil
        attrs[:cancellation_reason_code] = nil
        attrs[:cancellation_other_text] = nil
        attrs[:cancellation_note] = nil
        attrs[:cancelled_by_id] = nil
        attrs[:charge_decision] = :no_charge
        attrs[:charged_cents] = 0
      end
      @lesson.assign_attributes(attrs)
      true
    end

    def normalize_attendance
      raw = @params[:attendance].to_s
      raw == 'attended' ? 'present' : raw
    end

    def duration_minutes
      raw = first_value(:actual_duration_minutes, :actualDurationMinutes)
      return if raw.blank?

      Integer(raw)
    rescue ArgumentError, TypeError
      raw
    end

    def charge?
      %w[charge 1 true].include?(@params[:charge_decision].to_s) ||
        %w[charge 1 true].include?(@params[:chargeDecision].to_s)
    end

    def cancel_reason_label(code, other)
      return other if code.to_s == 'other'
      if REASON_CODES.include?(code.to_s)
        return I18n.t("app.lessons.cancel_reasons.#{code}")
      end

      text_value(:notes)
    end

    def text_value(*keys)
      first_value(*keys).to_s.strip.presence
    end

    def first_value(*keys)
      keys.lazy.map { |key| @params[key] }.find { |value| !value.nil? }
    end

    def save_finance!(outcome)
      return undo_lesson_finance! if outcome == 'confirmed'

      actor = finance_actor
      service = case outcome
                when 'completed'
                  Finance::TakeLessonPayment.new(lesson:, created_by: actor)
                when 'cancelled'
                  Finance::TakeCancellationPayment.new(lesson:, created_by: actor)
                end
      return true if service.nil?

      return true if service.save(use_transaction: false)

      errors.merge!(service.errors)
      false
    end

    # Undo lesson and cancellation charges when staff move a lesson back to confirmed.
    def undo_lesson_finance!
      actor = finance_actor
      charge_types = StudentTransaction.transaction_types.values_at(:lesson_charge, :cancellation_charge)
      charges = StudentTransaction.confirmed.where(lesson_id: lesson.id, transaction_type: charge_types)

      charges.find_each do |charge|
        undo = Finance::UndoTransaction.new(
          transaction: charge,
          created_by: actor,
          reason: 'Lesson corrected'
        )
        next if undo.save(use_transaction: false)

        errors.merge!(undo.errors)
        return false
      end
      true
    end

    def finance_actor
      actor_id = @params[:cancelled_by_id].presence || @params[:cancelledById].presence
      if actor_id.present?
        user = User.find_by(id: actor_id)
        return user if user.present?
      end

      lesson.teacher_profile&.workspace&.owner
    end
  end
end
