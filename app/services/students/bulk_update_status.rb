# frozen_string_literal: true

module Students
  class BulkUpdateStatus
    def initialize(student_scope:, student_ids:, status:)
      @student_scope = student_scope
      @student_ids = Array(student_ids).compact_blank
      @status = status.to_s
    end

    attr_reader :count, :error_messages, :name

    def save
      @error_messages = []
      @count = 0
      unless StudentProfile.statuses.key?(@status)
        @error_messages << I18n.t('app.students.select_status')
        return false
      end
      if @student_ids.empty?
        @error_messages << I18n.t('app.students.assign_none')
        return false
      end

      records = @student_scope.where(id: @student_ids).to_a
      if records.empty?
        @error_messages << I18n.t('app.students.assign_none')
        return false
      end

      StudentProfile.transaction do
        records.each do |student|
          service = Students::UpdateStatus.new(student_profile: student, status: @status)
          next if service.save

          @error_messages.concat(service.error_messages)
          raise ActiveRecord::Rollback
        end
      end
      return false if @error_messages.any?

      @count = records.size
      @name = records.first.display_label if records.one?
      true
    end
  end
end
