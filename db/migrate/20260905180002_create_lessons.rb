# frozen_string_literal: true

class CreateLessons < ActiveRecord::Migration[7.0]
  def up
    create_lessons_table
    add_lesson_constraints
  end

  def down
    drop_table :lessons, if_exists: true, force: :cascade
  end

  private

  def create_lessons_table
    create_table :lessons do |t|
      t.bigint :teacher_id, null: false
      t.bigint :subject_id, null: false
      t.bigint :lesson_type_id, null: false
      t.timestamptz :starts_at, null: false
      t.timestamptz :ends_at, null: false
      t.integer :status, null: false, default: 0
      t.integer :location, null: false, default: 0
      t.string :meeting_link
      t.string :location_text
      t.text :notes
      t.integer :price_cents
      t.string :currency
      t.integer :attendance, null: false, default: 0
      t.integer :actual_duration_minutes
      t.text :teacher_note
      t.text :student_progress_note
      t.uuid :series_id
      t.boolean :allow_overlap, null: false, default: false
      t.text :override_reason
      t.string :cancellation_reason_code
      t.text :cancellation_other_text
      t.text :cancellation_note
      t.bigint :cancelled_by_id
      t.integer :charge_decision, null: false, default: 0
      t.integer :charged_cents, null: false, default: 0

      t.timestamps
    end

    add_foreign_key :lessons, :teacher_profiles, column: :teacher_id
    add_foreign_key :lessons, :subjects
    add_foreign_key :lessons, :lesson_types
    add_foreign_key :lessons, :users, column: :cancelled_by_id
    add_index :lessons, :teacher_id
    add_index :lessons, :subject_id
    add_index :lessons, :lesson_type_id
    add_index :lessons, %i[teacher_id starts_at]
    add_index :lessons, :series_id
    add_index :lessons, :cancelled_by_id
  end

  def add_lesson_constraints
    add_check_constraint :lessons, 'starts_at < ends_at', name: 'lessons_starts_before_ends'
    add_check_constraint :lessons, 'location IN (0, 1)', name: 'lessons_location_valid'
    add_check_constraint :lessons, 'status IN (0, 1, 2)', name: 'lessons_status_valid'
    add_check_constraint :lessons, 'attendance IN (0, 1, 2, 3, 4)', name: 'lessons_attendance_valid'
    add_check_constraint :lessons, 'actual_duration_minutes IS NULL OR actual_duration_minutes > 0',
                         name: 'lessons_actual_duration_positive'
    add_check_constraint :lessons, 'charge_decision IN (0, 1)', name: 'lessons_charge_decision_valid'
    add_check_constraint :lessons, 'charged_cents >= 0', name: 'lessons_charged_cents_non_negative'
  end
end
