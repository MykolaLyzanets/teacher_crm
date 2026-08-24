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

    def lessons
      @lessons ||= load_json('lessons.json')
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
      @homework = @materials = @progress = @notes = nil
    end

    def load_json(filename)
      path = Rails.root.join('config/demo', filename)
      JSON.parse(File.read(path), object_class: ActiveSupport::HashWithIndifferentAccess)
    end
    private_class_method :load_json
  end
end
