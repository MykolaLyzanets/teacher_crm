# frozen_string_literal: true

class CreateLessonTypes < ActiveRecord::Migration[7.0]
  def change
    create_table :lesson_types do |t|
      t.references :subject, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :kind, null: false
      t.integer :mode, null: false
      t.integer :default_duration_minutes, null: false, default: 60
      t.boolean :is_active, null: false, default: true

      t.timestamps
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          CREATE UNIQUE INDEX index_lesson_types_on_subject_id_lower_name
          ON lesson_types (subject_id, lower(name))
        SQL
      end
      dir.down do
        execute 'DROP INDEX IF EXISTS index_lesson_types_on_subject_id_lower_name'
      end
    end

    add_check_constraint :lesson_types, 'kind IN (0, 1, 2, 3)', name: 'lesson_types_kind_valid'
    add_check_constraint :lesson_types, 'mode IN (0, 1)', name: 'lesson_types_mode_valid'
    add_check_constraint :lesson_types, 'default_duration_minutes > 0', name: 'lesson_types_duration_positive'
  end
end
