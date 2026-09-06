# frozen_string_literal: true

class CreateLessons < ActiveRecord::Migration[7.0]
  def up
    enable_extension 'btree_gist' unless extension_enabled?('btree_gist')

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

      t.timestamps
    end

    add_foreign_key :lessons, :teacher_profiles, column: :teacher_id
    add_foreign_key :lessons, :subjects
    add_foreign_key :lessons, :lesson_types
    add_index :lessons, :teacher_id
    add_index :lessons, :subject_id
    add_index :lessons, :lesson_type_id
    add_index :lessons, %i[teacher_id starts_at]
    add_index :lessons, :series_id
  end

  def add_lesson_constraints
    add_check_constraint :lessons, 'starts_at < ends_at', name: 'lessons_starts_before_ends'
    add_check_constraint :lessons, 'location IN (0, 1)', name: 'lessons_location_valid'
    add_check_constraint :lessons, 'status IN (0, 1, 2)', name: 'lessons_status_valid'
    add_check_constraint :lessons, 'attendance IN (0, 1, 2, 3)', name: 'lessons_attendance_valid'
    add_check_constraint :lessons, 'actual_duration_minutes IS NULL OR actual_duration_minutes > 0',
                         name: 'lessons_actual_duration_positive'
    execute <<~SQL.squish
      ALTER TABLE lessons
      ADD CONSTRAINT lessons_teacher_confirmed_no_overlap
      EXCLUDE USING gist (
        teacher_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      )
      WHERE (status = 0 AND allow_overlap = false)
    SQL
  end
end
