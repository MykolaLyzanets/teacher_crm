# frozen_string_literal: true

class CreateTeacherAbsences < ActiveRecord::Migration[7.0]
  def up
    return if table_exists?(:teacher_absences)

    create_table :teacher_absences do |t|
      t.bigint :teacher_id, null: false
      t.integer :absence_type, null: false
      t.date :starts_on, null: false
      t.date :ends_on, null: false
      t.text :note
      t.text :reason_detail
      t.timestamps
    end

    add_index :teacher_absences, :teacher_id, name: 'index_teacher_absences_on_teacher_id'
    add_index :teacher_absences, %i[teacher_id starts_on ends_on], name: 'idx_teacher_absences_teacher_dates'
    add_check_constraint :teacher_absences, 'ends_on >= starts_on', name: 'teacher_absences_date_range'
    add_foreign_key :teacher_absences, :teacher_profiles, column: :teacher_id
  end

  def down
    drop_table :teacher_absences if table_exists?(:teacher_absences)
  end
end