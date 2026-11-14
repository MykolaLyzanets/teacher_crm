# frozen_string_literal: true

class AddSeniorTeacherToTeacherProfiles < ActiveRecord::Migration[7.0]
  def change
    add_column :teacher_profiles, :senior_teacher, :boolean, null: false, default: false
  end
end