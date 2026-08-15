# frozen_string_literal: true

class CreateWorkspacesAndUpdateUsers < ActiveRecord::Migration[7.0]
  def up
    create_table :workspaces do |t|
      t.string :name, null: false
      t.integer :workspace_type, null: false, default: 0
      t.bigint :owner_id, null: false
      t.timestamps
    end

    add_index :workspaces, :owner_id, unique: true
    add_index :workspaces, :workspace_type

    add_column :users, :full_name, :string, null: false
    add_column :users, :role, :integer, null: false, default: 0
    add_reference :users, :workspace, foreign_key: true
    add_index :users, :role

    remove_column :users, :admin

    add_foreign_key :workspaces, :users, column: :owner_id
  end

  def down
    remove_foreign_key :workspaces, column: :owner_id
    remove_reference :users, :workspace, foreign_key: true
    remove_column :users, :role
    remove_column :users, :full_name
    drop_table :workspaces

    add_column :users, :admin, :boolean, null: false, default: false
  end
end
