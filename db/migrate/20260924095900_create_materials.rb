# frozen_string_literal: true

class CreateMaterials < ActiveRecord::Migration[7.0]
  def change
    return if table_exists?(:materials)

    create_table :materials do |t|
      t.bigint :workspace_id, null: false
      t.bigint :teacher_id, null: false
      t.bigint :lesson_id
      t.string :title, null: false
      t.text :description
      t.string :subject
      t.integer :status, default: 0, null: false
      t.timestamps
    end

    add_index :materials, :lesson_id
    add_index :materials, :teacher_id
    add_index :materials, :workspace_id
    add_foreign_key :materials, :teacher_profiles, column: :teacher_id
    add_foreign_key :materials, :workspaces

    create_table :material_students do |t|
      t.bigint :material_id, null: false
      t.bigint :student_id, null: false
      t.timestamps
    end

    add_index :material_students, %i[material_id student_id], unique: true, name: 'idx_material_students_unique'
    add_index :material_students, :material_id
    add_index :material_students, :student_id
    add_foreign_key :material_students, :materials
    add_foreign_key :material_students, :student_profiles, column: :student_id
  end
end
