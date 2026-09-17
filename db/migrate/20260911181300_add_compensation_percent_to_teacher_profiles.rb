# frozen_string_literal: true

class AddCompensationPercentToTeacherProfiles < ActiveRecord::Migration[7.0]
  def up
    return if column_exists?(:teacher_profiles, :compensation_percent)

    add_column :teacher_profiles, :compensation_percent, :integer, default: 60, null: false
  end

  def down
    return unless column_exists?(:teacher_profiles, :compensation_percent)

    remove_column :teacher_profiles, :compensation_percent
  end
end
