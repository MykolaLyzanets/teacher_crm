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

    def active_students
      students.reject { |student| student[:deletedAt].present? }
    end

    def find_student(id)
      students.find { |student| student[:id].to_s == id.to_s }
    end

    def find_teacher(id)
      teachers.find { |teacher| teacher[:id].to_s == id.to_s }
    end

    def reload!
      @students = @teachers = @lessons = nil
    end

    def load_json(filename)
      path = Rails.root.join('config/demo', filename)
      JSON.parse(File.read(path)).map(&:with_indifferent_access)
    end
    private_class_method :load_json
  end
end
