# frozen_string_literal: true

class AddCompensationSetupToTeacherProfiles < ActiveRecord::Migration[7.0]
  def change
    return if column_exists?(:teacher_profiles, :compensation_setup)

    add_column :teacher_profiles, :compensation_setup, :jsonb, default: {}, null: false
  end
end
