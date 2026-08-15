# frozen_string_literal: true

class CreateStudentProfiles < ActiveRecord::Migration[7.0]
  def change
    create_table :student_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.references :workspace, null: false, foreign_key: true
      t.bigint :teacher_id
      t.bigint :assigned_by

      t.string :first_name, null: false
      t.string :last_name
      t.string :preferred_name
      t.string :photo
      t.date :date_of_birth
      t.string :gender
      t.integer :status, null: false, default: 0

      t.integer :assignment_revision, null: false, default: 0
      t.datetime :assigned_at

      t.string :phone
      t.string :address

      t.string :parent_name
      t.string :relationship
      t.string :parent_email
      t.string :parent_phone

      t.string :grade
      t.string :student_code
      t.date :enrollment_date
      t.string :academic_year
      t.string :level
      t.string :subjects, array: true, default: [], null: false

      t.string :location_preference
      t.string :preferred_days, array: true, default: [], null: false
      t.string :preferred_time_notes

      t.string :emergency_name
      t.string :emergency_relationship
      t.string :emergency_phone

      t.text :notes
      t.datetime :deleted_at

      t.timestamps
    end

    add_foreign_key :student_profiles, :teacher_profiles, column: :teacher_id
    add_foreign_key :student_profiles, :users, column: :assigned_by
    add_index :student_profiles, :teacher_id
    add_index :student_profiles, :assigned_by
    add_index :student_profiles, :deleted_at
  end
end
