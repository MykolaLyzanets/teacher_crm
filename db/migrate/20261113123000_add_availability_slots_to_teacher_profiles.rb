# frozen_string_literal: true

class AddAvailabilitySlotsToTeacherProfiles < ActiveRecord::Migration[7.0]
  def change
    add_column :teacher_profiles, :availability_slots, :jsonb, default: [], null: false
  end
end
