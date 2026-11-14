# frozen_string_literal: true

class AddAbsenceSubstitutionToLessons < ActiveRecord::Migration[7.0]
  def change
    add_reference :lessons, :teacher_absence, foreign_key: true, null: true
    add_reference :lessons, :original_teacher, foreign_key: { to_table: :teacher_profiles }, null: true
    add_column :lessons, :substitution_status, :integer
    add_index :lessons, :substitution_status
  end
end
