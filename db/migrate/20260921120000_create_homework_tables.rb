# frozen_string_literal: true

class CreateHomeworkTables < ActiveRecord::Migration[7.0]
  def up
    drop_legacy_homework_tables

    create_table :homeworks do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: { to_table: :teacher_profiles }
      t.references :lesson, foreign_key: true
      t.string :title, null: false
      t.string :subject
      t.string :topic
      t.text :instructions, null: false
      t.datetime :assigned_at, null: false
      t.datetime :due_at, null: false
      t.datetime :resubmission_due_at
      t.text :private_note
      t.boolean :allow_late_submission, null: false, default: false
      t.timestamps
    end

    add_index :homeworks, :lesson_id,
              unique: true,
              where: 'lesson_id IS NOT NULL',
              name: 'index_homeworks_on_lesson_id_unique'

    create_table :homework_students do |t|
      t.references :homework, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: { to_table: :student_profiles }
      t.timestamps
    end

    add_index :homework_students, %i[homework_id student_id], unique: true, name: 'idx_homework_students_unique'

    create_table :homework_responses do |t|
      t.references :homework_student, null: false, foreign_key: true, index: { unique: true }
      t.integer :status, null: false, default: 0
      t.text :written_response
      t.datetime :submitted_at
      t.text :feedback
      t.string :score
      t.datetime :reviewed_at
      t.references :reviewed_by, foreign_key: { to_table: :users }
      t.timestamps
    end

    add_check_constraint :homework_responses, 'status >= 0 AND status <= 3', name: 'homework_responses_status_valid'
  end

  def down
    drop_table :homework_responses, if_exists: true
    drop_table :homework_students, if_exists: true
    drop_table :homeworks, if_exists: true
  end

  private

  def drop_legacy_homework_tables
    drop_table :homework_submissions, if_exists: true
    drop_table :homework_responses, if_exists: true
    drop_table :homework_students, if_exists: true
    drop_table :homework_assignments, if_exists: true
    drop_table :homeworks, if_exists: true
  end
end
