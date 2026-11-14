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

ActiveRecord::Schema[7.0].define(version: 2026_11_14_140500) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "currencies", force: :cascade do |t|
    t.string "code", null: false
    t.string "name", null: false
    t.string "symbol", null: false
    t.integer "subunit_to_unit", default: 100, null: false
    t.boolean "active", default: true, null: false
    t.boolean "default", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_currencies_on_code", unique: true
    t.index ["default"], name: "index_currencies_single_default", unique: true, where: "(\"default\" = true)"
    t.check_constraint "subunit_to_unit > 0", name: "currencies_subunit_positive"
  end

  create_table "homework_responses", force: :cascade do |t|
    t.bigint "homework_student_id", null: false
    t.integer "status", default: 0, null: false
    t.text "written_response"
    t.datetime "submitted_at"
    t.text "feedback"
    t.string "score"
    t.datetime "reviewed_at"
    t.bigint "reviewed_by_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["homework_student_id"], name: "index_homework_responses_on_homework_student_id", unique: true
    t.index ["reviewed_by_id"], name: "index_homework_responses_on_reviewed_by_id"
    t.check_constraint "status >= 0 AND status <= 3", name: "homework_responses_status_valid"
  end

  create_table "homework_students", force: :cascade do |t|
    t.bigint "homework_id", null: false
    t.bigint "student_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["homework_id", "student_id"], name: "idx_homework_students_unique", unique: true
    t.index ["homework_id"], name: "index_homework_students_on_homework_id"
    t.index ["student_id"], name: "index_homework_students_on_student_id"
  end

  create_table "homeworks", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "teacher_id", null: false
    t.bigint "lesson_id"
    t.string "title", null: false
    t.string "subject"
    t.string "topic"
    t.text "instructions", null: false
    t.datetime "assigned_at", null: false
    t.datetime "due_at", null: false
    t.datetime "resubmission_due_at"
    t.text "private_note"
    t.boolean "allow_late_submission", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["lesson_id"], name: "index_homeworks_on_lesson_id"
    t.index ["lesson_id"], name: "index_homeworks_on_lesson_id_unique", unique: true, where: "(lesson_id IS NOT NULL)"
    t.index ["teacher_id"], name: "index_homeworks_on_teacher_id"
    t.index ["workspace_id"], name: "index_homeworks_on_workspace_id"
  end

  create_table "lesson_schedule_students", force: :cascade do |t|
    t.bigint "lesson_schedule_id", null: false
    t.bigint "student_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["lesson_schedule_id", "student_id"], name: "idx_schedule_students_unique", unique: true
    t.index ["lesson_schedule_id"], name: "index_lesson_schedule_students_on_lesson_schedule_id"
    t.index ["student_id"], name: "index_lesson_schedule_students_on_student_id"
  end

  create_table "lesson_schedules", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "teacher_id", null: false
    t.string "subject", null: false
    t.integer "lesson_type", default: 0, null: false
    t.integer "location", default: 0, null: false
    t.string "meeting_link"
    t.string "location_text"
    t.text "notes"
    t.integer "price_cents", default: 0, null: false
    t.string "currency", default: "UAH", null: false
    t.integer "recurrence", default: 0, null: false
    t.string "weekdays", default: [], null: false, array: true
    t.time "start_time", null: false
    t.time "end_time", null: false
    t.date "starts_on", null: false
    t.date "ends_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["teacher_id"], name: "index_lesson_schedules_on_teacher_id"
    t.index ["workspace_id"], name: "index_lesson_schedules_on_workspace_id"
  end

  create_table "lesson_students", force: :cascade do |t|
    t.bigint "lesson_id", null: false
    t.bigint "student_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["lesson_id", "student_id"], name: "index_lesson_students_on_lesson_id_and_student_id", unique: true
    t.index ["lesson_id"], name: "index_lesson_students_on_lesson_id"
    t.index ["student_id"], name: "index_lesson_students_on_student_id"
  end

  create_table "lesson_types", force: :cascade do |t|
    t.bigint "subject_id", null: false
    t.string "name", null: false
    t.integer "kind", null: false
    t.integer "mode", null: false
    t.integer "default_duration_minutes", default: 60, null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "price_cents"
    t.string "currency"
    t.index "subject_id, lower((name)::text)", name: "index_lesson_types_on_subject_id_lower_name", unique: true
    t.index ["subject_id"], name: "index_lesson_types_on_subject_id"
    t.check_constraint "default_duration_minutes > 0", name: "lesson_types_duration_positive"
    t.check_constraint "kind = ANY (ARRAY[0, 1, 2, 3])", name: "lesson_types_kind_valid"
    t.check_constraint "mode = ANY (ARRAY[0, 1])", name: "lesson_types_mode_valid"
  end

  create_table "lessons", force: :cascade do |t|
    t.bigint "teacher_id", null: false
    t.bigint "subject_id", null: false
    t.bigint "lesson_type_id", null: false
    t.timestamptz "starts_at", null: false
    t.timestamptz "ends_at", null: false
    t.integer "status", default: 0, null: false
    t.integer "location", default: 0, null: false
    t.string "meeting_link"
    t.string "location_text"
    t.text "notes"
    t.integer "price_cents"
    t.string "currency"
    t.integer "attendance", default: 0, null: false
    t.integer "actual_duration_minutes"
    t.text "teacher_note"
    t.text "student_progress_note"
    t.uuid "series_id"
    t.boolean "allow_overlap", default: false, null: false
    t.text "override_reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "cancellation_reason_code"
    t.text "cancellation_other_text"
    t.text "cancellation_note"
    t.bigint "cancelled_by_id"
    t.integer "charge_decision", default: 0, null: false
    t.integer "charged_cents", default: 0, null: false
    t.bigint "teacher_absence_id"
    t.bigint "original_teacher_id"
    t.integer "substitution_status"
    t.jsonb "rescheduled_from"
    t.index ["cancelled_by_id"], name: "index_lessons_on_cancelled_by_id"
    t.index ["lesson_type_id"], name: "index_lessons_on_lesson_type_id"
    t.index ["original_teacher_id"], name: "index_lessons_on_original_teacher_id"
    t.index ["series_id"], name: "index_lessons_on_series_id"
    t.index ["subject_id"], name: "index_lessons_on_subject_id"
    t.index ["substitution_status"], name: "index_lessons_on_substitution_status"
    t.index ["teacher_absence_id"], name: "index_lessons_on_teacher_absence_id"
    t.index ["teacher_id", "starts_at"], name: "index_lessons_on_teacher_id_and_starts_at"
    t.index ["teacher_id"], name: "index_lessons_on_teacher_id"
    t.check_constraint "actual_duration_minutes IS NULL OR actual_duration_minutes > 0", name: "lessons_actual_duration_positive"
    t.check_constraint "attendance = ANY (ARRAY[0, 1, 2, 3, 4])", name: "lessons_attendance_valid"
    t.check_constraint "charge_decision = ANY (ARRAY[0, 1])", name: "lessons_charge_decision_valid"
    t.check_constraint "charged_cents >= 0", name: "lessons_charged_cents_non_negative"
    t.check_constraint "location = ANY (ARRAY[0, 1])", name: "lessons_location_valid"
    t.check_constraint "starts_at < ends_at", name: "lessons_starts_before_ends"
    t.check_constraint "status = ANY (ARRAY[0, 1, 2])", name: "lessons_status_valid"
  end

  create_table "lessons_students", id: false, force: :cascade do |t|
    t.bigint "lesson_id", null: false
    t.bigint "student_id", null: false
    t.index ["lesson_id", "student_id"], name: "index_lessons_students_uniqueness", unique: true
    t.index ["student_id"], name: "index_lessons_students_on_student_id"
  end

  create_table "material_students", force: :cascade do |t|
    t.bigint "material_id", null: false
    t.bigint "student_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["material_id", "student_id"], name: "idx_material_students_unique", unique: true
    t.index ["material_id"], name: "index_material_students_on_material_id"
    t.index ["student_id"], name: "index_material_students_on_student_id"
  end

  create_table "materials", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "teacher_id", null: false
    t.bigint "lesson_id"
    t.string "title", null: false
    t.text "description"
    t.string "subject"
    t.integer "status", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "kind", default: 0, null: false
    t.string "file"
    t.string "external_url"
    t.bigint "homework_id"
    t.integer "byte_size"
    t.string "content_type"
    t.integer "duration_seconds"
    t.integer "attachment_role", default: 0, null: false
    t.bigint "homework_response_id"
    t.index ["homework_id"], name: "index_materials_on_homework_id"
    t.index ["homework_response_id"], name: "index_materials_on_homework_response_id"
    t.index ["lesson_id"], name: "index_materials_on_lesson_id"
    t.index ["teacher_id"], name: "index_materials_on_teacher_id"
    t.index ["workspace_id"], name: "index_materials_on_workspace_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "workspace_id", null: false
    t.integer "event_type", null: false
    t.string "title", null: false
    t.text "message"
    t.datetime "read_at"
    t.string "notifiable_type"
    t.bigint "notifiable_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_notifications_on_created_at"
    t.index ["event_type"], name: "index_notifications_on_event_type"
    t.index ["notifiable_type", "notifiable_id"], name: "index_notifications_on_notifiable"
    t.index ["read_at"], name: "index_notifications_on_read_at"
    t.index ["user_id", "event_type", "notifiable_type", "notifiable_id"], name: "idx_notifications_unique_event", unique: true
    t.index ["user_id", "workspace_id", "read_at", "created_at"], name: "idx_notifications_user_workspace_read"
    t.index ["user_id"], name: "index_notifications_on_user_id"
    t.index ["workspace_id"], name: "index_notifications_on_workspace_id"
  end

  create_table "student_lesson_type_prices", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "student_id", null: false
    t.bigint "lesson_type_id", null: false
    t.integer "price_cents", null: false
    t.string "currency", default: "UAH", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["lesson_type_id"], name: "index_student_lesson_type_prices_on_lesson_type_id"
    t.index ["student_id", "lesson_type_id"], name: "index_student_lesson_type_prices_uniqueness", unique: true
    t.index ["student_id"], name: "index_student_lesson_type_prices_on_student_id"
    t.index ["workspace_id"], name: "index_student_lesson_type_prices_on_workspace_id"
    t.check_constraint "currency::text = 'UAH'::text", name: "student_lesson_type_prices_currency_uah"
    t.check_constraint "price_cents >= 0", name: "student_lesson_type_prices_price_non_negative"
  end

  create_table "student_notes", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.bigint "author_id", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_student_notes_on_author_id"
    t.index ["student_id", "created_at"], name: "idx_student_notes_student_created"
    t.index ["student_id"], name: "index_student_notes_on_student_id"
  end

  create_table "student_prices", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "student_id", null: false
    t.integer "price_cents", null: false
    t.string "currency", default: "UAH", null: false
    t.date "effective_from", null: false
    t.date "effective_to"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["student_id", "effective_from"], name: "index_student_prices_on_student_id_and_effective_from"
    t.index ["student_id"], name: "index_student_prices_on_student_id"
    t.index ["workspace_id"], name: "index_student_prices_on_workspace_id"
  end

  create_table "student_profiles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "workspace_id", null: false
    t.bigint "teacher_id"
    t.bigint "assigned_by"
    t.string "first_name", null: false
    t.string "last_name"
    t.string "preferred_name"
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
    t.string "photo"
    t.index ["assigned_by"], name: "index_student_profiles_on_assigned_by"
    t.index ["deleted_at"], name: "index_student_profiles_on_deleted_at"
    t.index ["teacher_id"], name: "index_student_profiles_on_teacher_id"
    t.index ["user_id"], name: "index_student_profiles_on_user_id", unique: true
    t.index ["workspace_id"], name: "index_student_profiles_on_workspace_id"
  end

  create_table "student_progress_milestones", force: :cascade do |t|
    t.bigint "student_progress_id", null: false
    t.string "title", null: false
    t.date "occurred_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["student_progress_id", "occurred_on"], name: "idx_student_progress_milestones_occurred"
    t.index ["student_progress_id"], name: "index_student_progress_milestones_on_student_progress_id"
  end

  create_table "student_progress_skills", force: :cascade do |t|
    t.bigint "student_progress_id", null: false
    t.string "name", null: false
    t.integer "percent", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["student_progress_id", "name"], name: "idx_student_progress_skills_name", unique: true
    t.index ["student_progress_id"], name: "index_student_progress_skills_on_student_progress_id"
    t.check_constraint "percent >= 0 AND percent <= 100", name: "student_progress_skills_percent_range"
  end

  create_table "student_progresses", force: :cascade do |t|
    t.bigint "student_id", null: false
    t.string "focus"
    t.string "goal"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["student_id"], name: "index_student_progresses_on_student_id", unique: true
  end

  create_table "student_transactions", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "student_profile_id", null: false
    t.bigint "lesson_id"
    t.bigint "currency_id", null: false
    t.integer "transaction_type", null: false
    t.bigint "amount_cents", null: false
    t.integer "status", null: false
    t.integer "method"
    t.string "reference"
    t.text "internal_note"
    t.jsonb "meta", default: {}, null: false
    t.bigint "related_transaction_id"
    t.bigint "created_by_id", null: false
    t.bigint "confirmed_by_id"
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["confirmed_by_id"], name: "index_student_transactions_on_confirmed_by_id"
    t.index ["created_by_id"], name: "index_student_transactions_on_created_by_id"
    t.index ["currency_id"], name: "index_student_transactions_on_currency_id"
    t.index ["lesson_id", "student_profile_id", "transaction_type"], name: "index_student_transactions_unique_confirmed_lesson_charge", unique: true, where: "((lesson_id IS NOT NULL) AND (transaction_type = ANY (ARRAY[1, 2])) AND (status = 1))"
    t.index ["lesson_id"], name: "index_student_transactions_on_lesson_id"
    t.index ["related_transaction_id"], name: "index_student_transactions_on_related_transaction_id"
    t.index ["status"], name: "index_student_transactions_on_status"
    t.index ["student_profile_id"], name: "index_student_transactions_on_student_profile_id"
    t.index ["transaction_type"], name: "index_student_transactions_on_transaction_type"
    t.index ["workspace_id", "student_profile_id"], name: "index_student_transactions_on_workspace_and_student"
    t.index ["workspace_id"], name: "index_student_transactions_on_workspace_id"
    t.check_constraint "amount_cents <> 0", name: "student_transactions_amount_non_zero"
    t.check_constraint "method IS NULL OR method >= 0 AND method <= 4", name: "student_transactions_method_valid"
    t.check_constraint "status >= 0 AND status <= 2", name: "student_transactions_status_valid"
    t.check_constraint "transaction_type >= 0 AND transaction_type <= 7", name: "student_transactions_type_valid"
  end

  create_table "subjects", force: :cascade do |t|
    t.bigint "teacher_id"
    t.string "name", null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "workspace_id", null: false
    t.index "teacher_id, lower((name)::text)", name: "index_subjects_on_teacher_id_lower_name", unique: true, where: "(teacher_id IS NOT NULL)"
    t.index "workspace_id, lower((name)::text)", name: "index_subjects_on_workspace_id_lower_name_catalog", unique: true, where: "(teacher_id IS NULL)"
    t.index ["teacher_id"], name: "index_subjects_on_teacher_id"
    t.index ["workspace_id"], name: "index_subjects_on_workspace_id"
  end

  create_table "teacher_absences", force: :cascade do |t|
    t.bigint "teacher_id", null: false
    t.integer "absence_type", null: false
    t.date "starts_on", null: false
    t.date "ends_on", null: false
    t.text "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "reason_detail"
    t.index ["teacher_id", "starts_on", "ends_on"], name: "idx_teacher_absences_teacher_dates"
    t.index ["teacher_id"], name: "index_teacher_absences_on_teacher_id"
    t.check_constraint "ends_on >= starts_on", name: "teacher_absences_date_range"
  end

  create_table "teacher_earnings", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "teacher_profile_id", null: false
    t.bigint "student_profile_id", null: false
    t.bigint "lesson_id"
    t.bigint "currency_id", null: false
    t.integer "kind", null: false
    t.bigint "lesson_price_cents", null: false
    t.bigint "earning_cents", null: false
    t.decimal "compensation_percent", precision: 5, scale: 2
    t.datetime "reversed_at"
    t.jsonb "meta", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["currency_id"], name: "index_teacher_earnings_on_currency_id"
    t.index ["kind"], name: "index_teacher_earnings_on_kind"
    t.index ["lesson_id", "student_profile_id", "kind"], name: "index_teacher_earnings_unique_active_lesson", unique: true, where: "((lesson_id IS NOT NULL) AND (reversed_at IS NULL))"
    t.index ["lesson_id"], name: "index_teacher_earnings_on_lesson_id"
    t.index ["student_profile_id"], name: "index_teacher_earnings_on_student_profile_id"
    t.index ["teacher_profile_id"], name: "index_teacher_earnings_on_teacher_profile_id"
    t.index ["workspace_id", "teacher_profile_id"], name: "index_teacher_earnings_on_workspace_and_teacher"
    t.index ["workspace_id"], name: "index_teacher_earnings_on_workspace_id"
    t.check_constraint "compensation_percent IS NULL OR compensation_percent >= 0::numeric AND compensation_percent <= 100::numeric", name: "teacher_earnings_compensation_range"
    t.check_constraint "earning_cents >= 0", name: "teacher_earnings_earning_non_negative"
    t.check_constraint "kind = ANY (ARRAY[0, 1])", name: "teacher_earnings_kind_valid"
    t.check_constraint "lesson_price_cents > 0", name: "teacher_earnings_lesson_price_positive"
  end

  create_table "teacher_payout_allocations", force: :cascade do |t|
    t.bigint "teacher_payout_id", null: false
    t.bigint "teacher_earning_id", null: false
    t.bigint "amount_cents", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["teacher_earning_id"], name: "index_teacher_payout_allocations_on_teacher_earning_id"
    t.index ["teacher_payout_id", "teacher_earning_id"], name: "index_teacher_payout_allocations_on_payout_and_earning", unique: true
    t.index ["teacher_payout_id"], name: "index_teacher_payout_allocations_on_teacher_payout_id"
    t.check_constraint "amount_cents > 0", name: "teacher_payout_allocations_amount_positive"
  end

  create_table "teacher_payouts", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "teacher_profile_id", null: false
    t.bigint "currency_id", null: false
    t.bigint "amount_cents", null: false
    t.integer "method", null: false
    t.datetime "paid_at", null: false
    t.string "reference"
    t.text "note"
    t.bigint "created_by_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_teacher_payouts_on_created_by_id"
    t.index ["currency_id"], name: "index_teacher_payouts_on_currency_id"
    t.index ["teacher_profile_id"], name: "index_teacher_payouts_on_teacher_profile_id"
    t.index ["workspace_id", "teacher_profile_id"], name: "index_teacher_payouts_on_workspace_and_teacher"
    t.index ["workspace_id"], name: "index_teacher_payouts_on_workspace_id"
    t.check_constraint "amount_cents > 0", name: "teacher_payouts_amount_positive"
    t.check_constraint "method >= 0 AND method <= 4", name: "teacher_payouts_method_valid"
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
    t.integer "compensation_percent", default: 60, null: false
    t.jsonb "compensation_setup", default: {}, null: false
    t.jsonb "availability_slots", default: [], null: false
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
    t.jsonb "appearance", default: {}, null: false
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

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "homework_responses", "homework_students"
  add_foreign_key "homework_responses", "users", column: "reviewed_by_id"
  add_foreign_key "homework_students", "homeworks"
  add_foreign_key "homework_students", "student_profiles", column: "student_id"
  add_foreign_key "homeworks", "lessons"
  add_foreign_key "homeworks", "teacher_profiles", column: "teacher_id"
  add_foreign_key "homeworks", "workspaces"
  add_foreign_key "lesson_schedule_students", "lesson_schedules"
  add_foreign_key "lesson_schedule_students", "student_profiles", column: "student_id"
  add_foreign_key "lesson_schedules", "teacher_profiles", column: "teacher_id"
  add_foreign_key "lesson_schedules", "workspaces"
  add_foreign_key "lesson_students", "student_profiles", column: "student_id"
  add_foreign_key "lesson_types", "subjects"
  add_foreign_key "lessons", "lesson_types"
  add_foreign_key "lessons", "subjects"
  add_foreign_key "lessons", "teacher_absences"
  add_foreign_key "lessons", "teacher_profiles", column: "original_teacher_id"
  add_foreign_key "lessons", "teacher_profiles", column: "teacher_id"
  add_foreign_key "lessons", "users", column: "cancelled_by_id"
  add_foreign_key "lessons_students", "lessons"
  add_foreign_key "lessons_students", "student_profiles", column: "student_id"
  add_foreign_key "material_students", "materials"
  add_foreign_key "material_students", "student_profiles", column: "student_id"
  add_foreign_key "materials", "homework_responses"
  add_foreign_key "materials", "homeworks"
  add_foreign_key "materials", "lessons"
  add_foreign_key "materials", "teacher_profiles", column: "teacher_id"
  add_foreign_key "materials", "workspaces"
  add_foreign_key "notifications", "users", on_delete: :cascade
  add_foreign_key "notifications", "workspaces", on_delete: :cascade
  add_foreign_key "student_lesson_type_prices", "lesson_types", on_delete: :restrict
  add_foreign_key "student_lesson_type_prices", "student_profiles", column: "student_id", on_delete: :cascade
  add_foreign_key "student_lesson_type_prices", "workspaces", on_delete: :cascade
  add_foreign_key "student_notes", "student_profiles", column: "student_id"
  add_foreign_key "student_notes", "users", column: "author_id"
  add_foreign_key "student_prices", "student_profiles", column: "student_id"
  add_foreign_key "student_prices", "workspaces"
  add_foreign_key "student_profiles", "teacher_profiles", column: "teacher_id"
  add_foreign_key "student_profiles", "users"
  add_foreign_key "student_profiles", "users", column: "assigned_by"
  add_foreign_key "student_profiles", "workspaces"
  add_foreign_key "student_progress_milestones", "student_progresses"
  add_foreign_key "student_progress_skills", "student_progresses"
  add_foreign_key "student_progresses", "student_profiles", column: "student_id"
  add_foreign_key "student_transactions", "currencies", on_delete: :restrict
  add_foreign_key "student_transactions", "lessons", on_delete: :restrict
  add_foreign_key "student_transactions", "student_profiles", on_delete: :restrict
  add_foreign_key "student_transactions", "student_transactions", column: "related_transaction_id", on_delete: :restrict
  add_foreign_key "student_transactions", "users", column: "confirmed_by_id", on_delete: :restrict
  add_foreign_key "student_transactions", "users", column: "created_by_id", on_delete: :restrict
  add_foreign_key "student_transactions", "workspaces", on_delete: :restrict
  add_foreign_key "subjects", "teacher_profiles", column: "teacher_id"
  add_foreign_key "subjects", "workspaces"
  add_foreign_key "teacher_absences", "teacher_profiles", column: "teacher_id"
  add_foreign_key "teacher_earnings", "currencies", on_delete: :restrict
  add_foreign_key "teacher_earnings", "lessons", on_delete: :restrict
  add_foreign_key "teacher_earnings", "student_profiles", on_delete: :restrict
  add_foreign_key "teacher_earnings", "teacher_profiles", on_delete: :restrict
  add_foreign_key "teacher_earnings", "workspaces", on_delete: :restrict
  add_foreign_key "teacher_payout_allocations", "teacher_earnings", on_delete: :restrict
  add_foreign_key "teacher_payout_allocations", "teacher_payouts", on_delete: :restrict
  add_foreign_key "teacher_payouts", "currencies", on_delete: :restrict
  add_foreign_key "teacher_payouts", "teacher_profiles", on_delete: :restrict
  add_foreign_key "teacher_payouts", "users", column: "created_by_id", on_delete: :restrict
  add_foreign_key "teacher_payouts", "workspaces", on_delete: :restrict
  add_foreign_key "teacher_profiles", "users"
  add_foreign_key "teacher_profiles", "workspaces"
  add_foreign_key "users", "workspaces"
  add_foreign_key "workspaces", "users", column: "owner_id"
end
