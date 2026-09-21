# frozen_string_literal: true

class RestructureHomeworkStudentsAndResponses < ActiveRecord::Migration[7.0]
  def up
    drop_table :homework_submissions, if_exists: true
    drop_table :homework_assignments, if_exists: true

    change_table :homeworks, bulk: true do |t|
      t.string :topic
      t.text :instructions, null: false
      t.datetime :assigned_at, null: false
      t.datetime :resubmission_due_at
      t.text :private_note
      t.boolean :allow_late_submission, null: false, default: false
    end

    remove_column :homeworks, :description if column_exists?(:homeworks, :description)
    change_column_null :homeworks, :due_at, false

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

    return if foreign_key_exists?(:homeworks, :lessons)

    add_foreign_key :homeworks, :lessons
  end

  def down
    remove_foreign_key :homeworks, :lessons if foreign_key_exists?(:homeworks, :lessons)
    drop_table :homework_responses, if_exists: true
    drop_table :homework_students, if_exists: true

    change_table :homeworks, bulk: true do |t|
      t.text :description
      t.remove :topic
      t.remove :instructions
      t.remove :assigned_at
      t.remove :resubmission_due_at
      t.remove :private_note
      t.remove :allow_late_submission
    end

    change_column_null :homeworks, :due_at, true

    create_table :homework_assignments do |t|
      t.references :homework, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: { to_table: :student_profiles }
      t.datetime :assigned_at, null: false
      t.timestamps
    end
    add_index :homework_assignments, %i[homework_id student_id], unique: true, name: 'idx_homework_assignments_unique'

    create_table :homework_submissions do |t|
      t.references :homework_assignment, null: false, foreign_key: true, index: { unique: true }
      t.text :content
      t.datetime :submitted_at
      t.integer :status, null: false, default: 0
      t.text :teacher_comment
      t.timestamps
    end
  end
end
