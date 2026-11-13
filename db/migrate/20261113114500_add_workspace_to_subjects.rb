# frozen_string_literal: true

class AddWorkspaceToSubjects < ActiveRecord::Migration[7.0]
  def up
    add_reference :subjects, :workspace, foreign_key: true

    execute <<~SQL.squish
      UPDATE subjects
      SET workspace_id = teacher_profiles.workspace_id
      FROM teacher_profiles
      WHERE subjects.teacher_id = teacher_profiles.id
    SQL

    change_column_null :subjects, :teacher_id, true
    change_column_null :subjects, :workspace_id, false

    execute 'DROP INDEX IF EXISTS index_subjects_on_teacher_id_lower_name'

    execute <<~SQL.squish
      CREATE UNIQUE INDEX index_subjects_on_teacher_id_lower_name
      ON subjects (teacher_id, lower(name))
      WHERE teacher_id IS NOT NULL
    SQL

    execute <<~SQL.squish
      CREATE UNIQUE INDEX index_subjects_on_workspace_id_lower_name_catalog
      ON subjects (workspace_id, lower(name))
      WHERE teacher_id IS NULL
    SQL
  end

  def down
    execute 'DROP INDEX IF EXISTS index_subjects_on_workspace_id_lower_name_catalog'
    execute 'DROP INDEX IF EXISTS index_subjects_on_teacher_id_lower_name'

    execute <<~SQL.squish
      CREATE UNIQUE INDEX index_subjects_on_teacher_id_lower_name
      ON subjects (teacher_id, lower(name))
    SQL

    change_column_null :subjects, :teacher_id, false
    remove_reference :subjects, :workspace
  end
end
