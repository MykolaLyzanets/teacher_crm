# frozen_string_literal: true

class CreateLessonsStudents < ActiveRecord::Migration[7.0]
  def change
    create_table :lessons_students, id: false do |t|
      t.bigint :lesson_id, null: false
      t.bigint :student_id, null: false
    end

    add_foreign_key :lessons_students, :lessons
    add_foreign_key :lessons_students, :student_profiles, column: :student_id
    add_index :lessons_students, %i[lesson_id student_id], unique: true, name: 'index_lessons_students_uniqueness'
    add_index :lessons_students, :student_id
  end
end
