# frozen_string_literal: true

module Students
  module LessonPricing
    module_function

    def parse(raw)
      data = raw.is_a?(String) ? JSON.parse(raw) : raw
      return [] unless data.is_a?(Array)

      data.filter_map do |row|
        next if row.blank?

        h = row.with_indifferent_access
        lesson_type_id = h[:lessonTypeId].to_s.presence
        next if lesson_type_id.blank?

        {
          lesson_type_id: lesson_type_id.to_i,
          price_cents: h[:priceCents].to_i
        }
      end
    rescue JSON::ParserError
      []
    end

    def catalog_rows(student_profile)
      records = student_profile.student_lesson_type_prices.to_a
      return [] if records.empty?

      types = LessonType.where(id: records.map(&:lesson_type_id).uniq).index_by(&:id)
      subjects = Subject.where(id: types.values.map(&:subject_id).uniq).index_by(&:id)

      records.sort_by do |row|
        type = types[row.lesson_type_id]
        subject = subjects[type&.subject_id]
        [subject&.name.to_s, type&.name.to_s]
      end.map do |row|
        type = types.fetch(row.lesson_type_id)
        subject = subjects.fetch(type.subject_id)
        {
          lessonTypeId: type.id.to_s,
          subjectId: subject.id.to_s,
          subjectName: subject.name,
          lessonTypeName: type.name,
          priceCents: row.price_cents,
          currency: row.currency
        }.with_indifferent_access
      end
    end

    def price_cents_for(student_profile:, lesson_type_id:)
      return if student_profile.blank? || lesson_type_id.blank?

      student_profile.student_lesson_type_prices.find_by(lesson_type_id: lesson_type_id)&.price_cents
    end

    def price_cents_for_lesson_type(student_profile:, lesson_type:)
      return if student_profile.blank? || lesson_type.blank?

      by_id = price_cents_for(student_profile:, lesson_type_id: lesson_type.id)
      return by_id if by_id.present?

      price_cents_for_names(
        student_profile:,
        subject_name: lesson_type.subject&.name,
        lesson_type_name: lesson_type.name
      )
    end

    def price_cents_for_names(student_profile:, subject_name:, lesson_type_name:)
      subject_key = normalize_label(subject_name)
      type_key = normalize_label(lesson_type_name)
      return if subject_key.blank? || type_key.blank?

      student_profile.student_lesson_type_prices
                   .joins(lesson_type: :subject)
                   .where(
                     'LOWER(TRIM(subjects.name)) = ? AND LOWER(TRIM(lesson_types.name)) = ?',
                     subject_key,
                     type_key
                   )
                   .pick(:price_cents)
    end

    def normalize_label(value)
      value.to_s.strip.downcase.gsub(/\s+/, ' ')
    end

    def sync!(student_profile:, raw:)
      rows = parse(raw)
      type_ids = rows.map { |row| row[:lesson_type_id] }
      allowed_ids = LessonType.joins(:subject)
                              .where(id: type_ids, subjects: { workspace_id: student_profile.workspace_id })
                              .pluck(:id)
                              .to_set

      StudentLessonTypePrice.transaction do
        scope = student_profile.student_lesson_type_prices
        scope.where.not(lesson_type_id: allowed_ids).delete_all

        rows.each do |row|
          next if !allowed_ids.include?(row[:lesson_type_id])

          record = scope.find_or_initialize_by(lesson_type_id: row[:lesson_type_id])
          record.workspace = student_profile.workspace
          record.price_cents = row[:price_cents]
          record.currency = Finance::FinanceHelper::FINANCE_CURRENCY_CODE
          record.save!
        end
      end
    end
  end
end
