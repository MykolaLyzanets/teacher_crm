# frozen_string_literal: true

require 'json'

module Demo
  module Catalog
    module_function

    def students
      @students ||= load_json('students.json')
    end

    def teachers
      @teachers ||= load_json('teachers.json')
    end

    LEGACY_LESSON_TYPE_NAMES = {
      'individual' => 'Individual lesson',
      'group' => 'Group lesson',
      'trial' => 'Trial lesson',
      'consultation' => 'Consultation'
    }.freeze

    LEGACY_LESSON_TYPE_IDS = {
      'Individual lesson' => 'lt-individual',
      'Group lesson' => 'lt-group',
      'Trial lesson' => 'lt-trial',
      'Speaking club' => 'lt-speaking-club',
      'Consultation' => 'lt-consultation'
    }.freeze

    def lessons
      @lessons ||= load_json('lessons.json').map { |lesson| annotate_lesson_type(lesson) }
    end

    def lesson_types
      @lesson_types ||= lesson_types_payload[:lessonTypes]
    end

    def teacher_lesson_type_links
      @teacher_lesson_type_links ||= lesson_types_payload[:links]
    end

    def transactions
      @transactions ||= load_json('transactions.json')
    end

    def pricing
      @pricing ||= load_json('pricing.json')
    end

    def notifications
      @notifications ||= load_json('notifications.json')
    end

    def earnings
      @earnings ||= load_json('teacher_earnings.json')
    end

    def payouts
      @payouts ||= load_json('teacher_payouts.json')
    end

    def homework
      @homework ||= load_json('homework.json')
    end

    def materials
      @materials ||= load_json('materials.json')
    end

    def progress
      @progress ||= load_json('progress.json')
    end

    def notes
      @notes ||= load_json('notes.json')
    end

    def active_students
      students.reject { |student| student[:deletedAt].present? }
    end

    def find_student(id)
      students.find { |student| student[:id].to_s == id.to_s }
    end

    def find_teacher(id)
      teachers.find { |teacher| teacher[:id].to_s == id.to_s }
    end

    def match_student(record)
      email = record[:email].to_s
      name = [record[:preferredName].presence || record[:firstName], record[:lastName]].compact_blank.join(' ')
      students.find { |student| student[:email].to_s.casecmp?(email) } ||
        students.find { |student| student_name(student).casecmp?(name) }
    end

    def match_teacher(record)
      email = record[:email].to_s
      name = record[:displayName].presence || [record[:firstName], record[:lastName]].compact_blank.join(' ')
      teachers.find { |teacher| teacher[:email].to_s.casecmp?(email) } ||
        teachers.find { |teacher| teacher_name(teacher).casecmp?(name) }
    end

    def student_name(student)
      [student[:preferredName].presence || student[:firstName], student[:lastName]].compact_blank.join(' ')
    end

    def teacher_name(teacher)
      teacher[:displayName].presence || [teacher[:firstName], teacher[:lastName]].compact_blank.join(' ')
    end

    def reload!
      @students = @teachers = @lessons = @transactions = @pricing = @notifications = @earnings = @payouts = nil
      @homework = @materials = @progress = @notes = @lesson_types_payload = @lesson_types = @teacher_lesson_type_links = nil
    end

    def lesson_types_seed
      {
        lessonTypes: lesson_types,
        links: teacher_lesson_type_links,
        lessons: lessons.map do |lesson|
          {
            lessonTypeId: lesson[:lessonTypeId],
            lessonTypeName: lesson[:lessonTypeName],
            type: lesson[:type]
          }
        end
      }
    end

    def load_json(filename)
      path = Rails.root.join('config/demo', filename)
      JSON.parse(File.read(path), object_class: ActiveSupport::HashWithIndifferentAccess)
    end

    def lesson_types_payload
      @lesson_types_payload ||= load_json('lesson_types.json')
    end

    def annotate_lesson_type(lesson)
      name = lesson[:lessonTypeName].presence || LEGACY_LESSON_TYPE_NAMES[lesson[:type].to_s]
      id = lesson[:lessonTypeId].presence || LEGACY_LESSON_TYPE_IDS[name]
      lesson.merge(lessonTypeName: name, lessonTypeId: id)
    end

    private_class_method :load_json, :lesson_types_payload, :annotate_lesson_type
  end
end
