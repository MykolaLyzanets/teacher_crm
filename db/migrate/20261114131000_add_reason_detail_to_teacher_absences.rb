# frozen_string_literal: true

class AddReasonDetailToTeacherAbsences < ActiveRecord::Migration[7.0]
  def change
    return if !table_exists?(:teacher_absences)
    return if column_exists?(:teacher_absences, :reason_detail)

    add_column :teacher_absences, :reason_detail, :text
  end
end
