# frozen_string_literal: true

class AddLessonCancellationAndChargeColumns < ActiveRecord::Migration[7.0]
  def up
    add_cancellation_columns
    add_charged_cents_column
    add_cancelled_by_references
  end

  def down
    remove_foreign_key :lessons, column: :cancelled_by_id if foreign_key_exists?(:lessons, column: :cancelled_by_id)
    remove_index :lessons, :cancelled_by_id if index_exists?(:lessons, :cancelled_by_id)

    %i[cancellation_reason_code cancellation_other_text cancellation_note cancelled_by_id charged_cents].each do |column|
      remove_column :lessons, column if column_exists?(:lessons, column)
    end
  end

  private

  def add_cancellation_columns
    add_column :lessons, :cancellation_reason_code, :string unless column_exists?(:lessons, :cancellation_reason_code)
    add_column :lessons, :cancellation_other_text, :text unless column_exists?(:lessons, :cancellation_other_text)
    add_column :lessons, :cancellation_note, :text unless column_exists?(:lessons, :cancellation_note)
  end

  def add_charged_cents_column
    return if column_exists?(:lessons, :charged_cents)

    add_column :lessons, :charged_cents, :integer, null: false, default: 0
    add_check_constraint :lessons, 'charged_cents >= 0', name: 'lessons_charged_cents_non_negative'
  end

  def add_cancelled_by_references
    return if column_exists?(:lessons, :cancelled_by_id)

    add_reference :lessons, :cancelled_by, foreign_key: { to_table: :users }, index: true
  end
end
