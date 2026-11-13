# frozen_string_literal: true

class CreateStudentLessonTypePrices < ActiveRecord::Migration[7.0]
  def change
    create_table :student_lesson_type_prices do |t|
      t.references :workspace, null: false, foreign_key: { on_delete: :cascade }
      t.references :student, null: false, foreign_key: { to_table: :student_profiles, on_delete: :cascade }
      t.references :lesson_type, null: false, foreign_key: { on_delete: :restrict }
      t.integer :price_cents, null: false
      t.string :currency, null: false, default: 'UAH'
      t.timestamps
    end

    add_index :student_lesson_type_prices, %i[student_id lesson_type_id],
              unique: true, name: 'index_student_lesson_type_prices_uniqueness'
    add_check_constraint :student_lesson_type_prices, 'price_cents >= 0',
                         name: 'student_lesson_type_prices_price_non_negative'
    add_check_constraint :student_lesson_type_prices, "currency = 'UAH'",
                         name: 'student_lesson_type_prices_currency_uah'
  end
end
