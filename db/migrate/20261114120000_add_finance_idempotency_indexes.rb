# frozen_string_literal: true

class AddFinanceIdempotencyIndexes < ActiveRecord::Migration[7.0]
  def change
    add_index :student_transactions,
              %i[lesson_id student_profile_id transaction_type],
              unique: true,
              where: 'lesson_id IS NOT NULL AND transaction_type IN (1, 2) AND status = 1',
              name: 'index_student_transactions_unique_confirmed_lesson_charge'

    add_index :teacher_earnings,
              %i[lesson_id student_profile_id kind],
              unique: true,
              where: 'lesson_id IS NOT NULL AND reversed_at IS NULL',
              name: 'index_teacher_earnings_unique_active_lesson'
  end
end
