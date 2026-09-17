# frozen_string_literal: true

class AddPricingToLessonTypes < ActiveRecord::Migration[7.0]
  def change
    unless column_exists?(:lesson_types, :price_cents)
      add_column :lesson_types, :price_cents, :integer
    end

    return if column_exists?(:lesson_types, :currency)

    add_column :lesson_types, :currency, :string
  end
end
