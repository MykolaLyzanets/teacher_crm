# frozen_string_literal: true

class CreateTeacherProfiles < ActiveRecord::Migration[7.0]
  def change
    create_table :teacher_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.references :workspace, null: false, foreign_key: true

      t.string :first_name, null: false
      t.string :last_name
      t.string :display_name
      t.string :photo
      t.string :job_title
      t.integer :status, null: false, default: 0

      t.string :phone
      t.integer :preferred_contact_method, default: 0
      t.string :timezone
      t.string :location

      t.string :subjects, array: true, default: [], null: false
      t.integer :experience_years
      t.text :bio
      t.string :languages, array: true, default: [], null: false
      t.string :tags, array: true, default: [], null: false

      t.string :working_days, array: true, default: [], null: false
      t.jsonb :working_hours, default: [], null: false
      t.integer :default_lesson_duration_minutes, default: 60
      t.integer :max_lessons_per_day
      t.string :lesson_formats, array: true, default: [], null: false
      t.string :default_meeting_link
      t.integer :calendar_color, default: 0

      t.text :notes

      t.timestamps
    end
  end
end
