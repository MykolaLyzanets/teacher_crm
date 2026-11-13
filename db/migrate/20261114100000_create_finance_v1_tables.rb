# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength, Metrics/AbcSize
class CreateFinanceV1Tables < ActiveRecord::Migration[7.0]
  def up
    drop_legacy_finance_tables

    create_table :currencies do |t|
      t.string :code, null: false
      t.string :name, null: false
      t.string :symbol, null: false
      t.integer :subunit_to_unit, null: false, default: 100
      t.boolean :active, null: false, default: true
      t.boolean :default, null: false, default: false

      t.timestamps
    end

    add_index :currencies, :code, unique: true
    add_index :currencies, :default,
              unique: true,
              where: '"default" = true',
              name: 'index_currencies_single_default'

    add_check_constraint :currencies, 'subunit_to_unit > 0', name: 'currencies_subunit_positive'

    create_table :student_transactions do |t|
      t.references :workspace, null: false, foreign_key: { on_delete: :restrict }
      t.references :student_profile, null: false, foreign_key: { to_table: :student_profiles, on_delete: :restrict }
      t.references :lesson, foreign_key: { on_delete: :restrict }
      t.references :currency, null: false, foreign_key: { on_delete: :restrict }
      t.integer :transaction_type, null: false
      t.bigint :amount_cents, null: false
      t.integer :status, null: false
      t.integer :method
      t.string :reference
      t.text :internal_note
      t.jsonb :meta, null: false, default: {}
      t.references :related_transaction,
                   foreign_key: { to_table: :student_transactions, on_delete: :restrict }
      t.references :created_by, null: false, foreign_key: { to_table: :users, on_delete: :restrict }
      t.references :confirmed_by, foreign_key: { to_table: :users, on_delete: :restrict }
      t.datetime :confirmed_at

      t.timestamps
    end

    add_index :student_transactions, :transaction_type
    add_index :student_transactions, :status
    add_index :student_transactions, %i[workspace_id student_profile_id],
              name: 'index_student_transactions_on_workspace_and_student'

    add_check_constraint :student_transactions,
                         'transaction_type >= 0 AND transaction_type <= 7',
                         name: 'student_transactions_type_valid'
    add_check_constraint :student_transactions,
                         'status >= 0 AND status <= 2',
                         name: 'student_transactions_status_valid'
    add_check_constraint :student_transactions,
                         'method IS NULL OR (method >= 0 AND method <= 4)',
                         name: 'student_transactions_method_valid'
    add_check_constraint :student_transactions,
                         'amount_cents <> 0',
                         name: 'student_transactions_amount_non_zero'

    create_table :teacher_earnings do |t|
      t.references :workspace, null: false, foreign_key: { on_delete: :restrict }
      t.references :teacher_profile, null: false, foreign_key: { to_table: :teacher_profiles, on_delete: :restrict }
      t.references :student_profile, null: false, foreign_key: { to_table: :student_profiles, on_delete: :restrict }
      t.references :lesson, foreign_key: { on_delete: :restrict }
      t.references :currency, null: false, foreign_key: { on_delete: :restrict }
      t.integer :kind, null: false
      t.bigint :lesson_price_cents, null: false
      t.bigint :earning_cents, null: false
      t.decimal :compensation_percent, precision: 5, scale: 2
      t.datetime :reversed_at
      t.jsonb :meta, null: false, default: {}

      t.timestamps
    end

    add_index :teacher_earnings, :kind
    add_index :teacher_earnings, %i[workspace_id teacher_profile_id],
              name: 'index_teacher_earnings_on_workspace_and_teacher'

    add_check_constraint :teacher_earnings, 'kind IN (0, 1)', name: 'teacher_earnings_kind_valid'
    add_check_constraint :teacher_earnings, 'lesson_price_cents > 0', name: 'teacher_earnings_lesson_price_positive'
    add_check_constraint :teacher_earnings, 'earning_cents >= 0', name: 'teacher_earnings_earning_non_negative'
    add_check_constraint :teacher_earnings,
                         'compensation_percent IS NULL OR (compensation_percent >= 0 AND compensation_percent <= 100)',
                         name: 'teacher_earnings_compensation_range'

    create_table :teacher_payouts do |t|
      t.references :workspace, null: false, foreign_key: { on_delete: :restrict }
      t.references :teacher_profile, null: false, foreign_key: { to_table: :teacher_profiles, on_delete: :restrict }
      t.references :currency, null: false, foreign_key: { on_delete: :restrict }
      t.bigint :amount_cents, null: false
      t.integer :method, null: false
      t.datetime :paid_at, null: false
      t.string :reference
      t.text :note
      t.references :created_by, null: false, foreign_key: { to_table: :users, on_delete: :restrict }

      t.timestamps
    end

    add_index :teacher_payouts, %i[workspace_id teacher_profile_id],
              name: 'index_teacher_payouts_on_workspace_and_teacher'

    add_check_constraint :teacher_payouts, 'amount_cents > 0', name: 'teacher_payouts_amount_positive'
    add_check_constraint :teacher_payouts, 'method >= 0 AND method <= 4', name: 'teacher_payouts_method_valid'

    create_table :teacher_payout_allocations do |t|
      t.references :teacher_payout, null: false, foreign_key: { on_delete: :restrict }
      t.references :teacher_earning, null: false, foreign_key: { on_delete: :restrict }
      t.bigint :amount_cents, null: false

      t.timestamps
    end

    add_index :teacher_payout_allocations,
              %i[teacher_payout_id teacher_earning_id],
              unique: true,
              name: 'index_teacher_payout_allocations_on_payout_and_earning'

    add_check_constraint :teacher_payout_allocations,
                         'amount_cents > 0',
                         name: 'teacher_payout_allocations_amount_positive'
  end

  def down
    drop_table :teacher_payout_allocations, if_exists: true
    drop_table :teacher_payouts, if_exists: true
    drop_table :teacher_earnings, if_exists: true
    drop_table :student_transactions, if_exists: true
    drop_table :currencies, if_exists: true
  end

  private

  def drop_legacy_finance_tables
    drop_table :teacher_payout_allocations, if_exists: true
    drop_table :teacher_payments, if_exists: true
    drop_table :teacher_payouts, if_exists: true
    drop_table :student_transactions, if_exists: true
    drop_table :currencies, if_exists: true
  end
end
# rubocop:enable Metrics/ClassLength, Metrics/AbcSize
