# frozen_string_literal: true

class CreateSubjects < ActiveRecord::Migration[7.0]
  def change
    create_table :subjects do |t|
      t.bigint :teacher_id, null: false
      t.string :name, null: false
      t.boolean :is_active, null: false, default: true

      t.timestamps
    end

    add_foreign_key :subjects, :teacher_profiles, column: :teacher_id
    add_index :subjects, :teacher_id

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          CREATE UNIQUE INDEX index_subjects_on_teacher_id_lower_name
          ON subjects (teacher_id, lower(name))
        SQL
      end
      dir.down do
        execute 'DROP INDEX IF EXISTS index_subjects_on_teacher_id_lower_name'
      end
    end
  end
end
