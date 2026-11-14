# frozen_string_literal: true

class AddRescheduledFromToLessons < ActiveRecord::Migration[7.0]
  def change
    add_column :lessons, :rescheduled_from, :jsonb
  end
end
