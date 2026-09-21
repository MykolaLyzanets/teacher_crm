# frozen_string_literal: true

class AddUniqueHomeworksLessonId < ActiveRecord::Migration[7.0]
  def change
    add_index :homeworks, :lesson_id,
              unique: true,
              where: 'lesson_id IS NOT NULL',
              name: 'index_homeworks_on_lesson_id_unique'
  end
end
