# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2026_08_15_150009) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "student_profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "workspace_id", null: false
    t.bigint "teacher_id"
    t.bigint "assigned_by"
    t.string "first_name", null: false
    t.string "last_name"
    t.string "preferred_name"
    t.string "photo"
    t.date "date_of_birth"
    t.string "gender"
    t.integer "status", default: 0, null: false
    t.integer "assignment_revision", default: 0, null: false
    t.datetime "assigned_at"
    t.string "phone"
    t.string "address"
    t.string "parent_name"
    t.string "relationship"
    t.string "parent_email"
    t.string "parent_phone"
    t.string "grade"
    t.string "student_code"
    t.date "enrollment_date"
    t.string "academic_year"
    t.string "level"
    t.string "subjects", default: [], null: false, array: true
    t.string "location_preference"
    t.string "preferred_days", default: [], null: false, array: true
    t.string "preferred_time_notes"
    t.string "emergency_name"
    t.string "emergency_relationship"
    t.string "emergency_phone"
    t.text "notes"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["assigned_by"], name: "index_student_profiles_on_assigned_by"
    t.index ["deleted_at"], name: "index_student_profiles_on_deleted_at"
    t.index ["teacher_id"], name: "index_student_profiles_on_teacher_id"
    t.index ["user_id"], name: "index_student_profiles_on_user_id", unique: true
    t.index ["workspace_id"], name: "index_student_profiles_on_workspace_id"
  end

  create_table "teacher_profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "workspace_id", null: false
    t.string "first_name", null: false
    t.string "last_name"
    t.string "display_name"
    t.string "photo"
    t.string "job_title"
    t.integer "status", default: 0, null: false
    t.string "phone"
    t.integer "preferred_contact_method", default: 0
    t.string "timezone"
    t.string "location"
    t.string "subjects", default: [], null: false, array: true
    t.integer "experience_years"
    t.text "bio"
    t.string "languages", default: [], null: false, array: true
    t.string "tags", default: [], null: false, array: true
    t.string "working_days", default: [], null: false, array: true
    t.jsonb "working_hours", default: [], null: false
    t.integer "default_lesson_duration_minutes", default: 60
    t.integer "max_lessons_per_day"
    t.string "lesson_formats", default: [], null: false, array: true
    t.string "default_meeting_link"
    t.integer "calendar_color", default: 0
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_teacher_profiles_on_user_id", unique: true
    t.index ["workspace_id"], name: "index_teacher_profiles_on_workspace_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "full_name", null: false
    t.integer "role", default: 0, null: false
    t.bigint "workspace_id"
    t.string "provider"
    t.string "uid"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true, where: "(uid IS NOT NULL)"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["role"], name: "index_users_on_role"
    t.index ["workspace_id"], name: "index_users_on_workspace_id"
  end

  create_table "workspaces", force: :cascade do |t|
    t.string "name", null: false
    t.integer "workspace_type", default: 0, null: false
    t.bigint "owner_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["owner_id"], name: "index_workspaces_on_owner_id", unique: true
    t.index ["workspace_type"], name: "index_workspaces_on_workspace_type"
  end

  add_foreign_key "student_profiles", "teacher_profiles", column: "teacher_id"
  add_foreign_key "student_profiles", "users"
  add_foreign_key "student_profiles", "users", column: "assigned_by"
  add_foreign_key "student_profiles", "workspaces"
  add_foreign_key "teacher_profiles", "users"
  add_foreign_key "teacher_profiles", "workspaces"
  add_foreign_key "users", "workspaces"
  add_foreign_key "workspaces", "users", column: "owner_id"
end
