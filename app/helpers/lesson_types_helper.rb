# frozen_string_literal: true

module LessonTypesHelper
  def lesson_types_stimulus_data(mode:, teacher_id: nil, controller: 'lesson-types', **extra)
    {
      controller:,
      lesson_types_mode_value: mode,
      lesson_types_i18n_value: app_i18n_json('app.lesson_types'),
      lesson_types_teacher_id_value: teacher_id.to_s,
      lesson_types_subjects_url_value: teacher_subjects_path(teacher_id: '__ID__'),
      lesson_types_lesson_types_url_value: subject_lesson_types_path(subject_id: '__ID__'),
      lesson_types_subject_url_value: subject_path(id: '__ID__'),
      lesson_types_type_url_value: lesson_type_path(id: '__ID__'),
      lesson_types_dialog_url_value: settings_lesson_type_dialog_path,
      lesson_types_delete_dialog_url_value: settings_lesson_type_delete_dialog_path,
      lesson_types_subject_delete_dialog_url_value: settings_lesson_subject_delete_dialog_path
    }.merge(extra)
  end
end
