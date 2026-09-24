# frozen_string_literal: true

class AddMaterialFileAndHomeworkColumns < ActiveRecord::Migration[7.0]
  def change
    change_table :materials, bulk: true do |t|
      t.integer :kind, null: false, default: 0
      t.string :file
      t.string :external_url
      t.bigint :homework_id
      t.integer :byte_size
      t.string :content_type
      t.integer :duration_seconds
    end

    add_index :materials, :homework_id
    add_foreign_key :materials, :homeworks
    add_foreign_key :materials, :lessons, column: :lesson_id
  end
end
