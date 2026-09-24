# frozen_string_literal: true

class AddMaterialAttachmentRoleAndResponse < ActiveRecord::Migration[7.0]
  def change
    change_table :materials, bulk: true do |t|
      t.integer :attachment_role, null: false, default: 0
      t.bigint :homework_response_id
    end

    add_index :materials, :homework_response_id
    add_foreign_key :materials, :homework_responses, column: :homework_response_id
  end
end
