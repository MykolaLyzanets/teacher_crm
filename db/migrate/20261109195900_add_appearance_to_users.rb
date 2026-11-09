# frozen_string_literal: true

class AddAppearanceToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :appearance, :jsonb, default: {}, null: false
  end
end
