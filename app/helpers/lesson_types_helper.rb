# frozen_string_literal: true

module LessonTypesHelper
  def lesson_types_stimulus_data(mode:, teacher_id: nil, controller: 'lesson-types', **extra)
    workspace_catalog = mode.to_s == 'workspace_catalog'
    teacher_assign = mode.to_s == 'teacher_assign'
    subjects_url = if workspace_catalog
                     catalog_subjects_path
                   else
                     teacher_subjects_path(teacher_id: '__ID__')
                   end
    data = {
      controller:,
      lesson_types_mode_value: mode,
      lesson_types_i18n_value: app_i18n_json('app.lesson_types', 'app.teachers', 'app.common'),
      lesson_types_teacher_id_value: workspace_catalog || teacher_assign ? '' : teacher_id.to_s,
      lesson_types_subjects_url_value: subjects_url,
      lesson_types_lesson_types_url_value: subject_lesson_types_path(subject_id: '__ID__'),
      lesson_types_subject_url_value: subject_path(id: '__ID__'),
      lesson_types_type_url_value: lesson_type_path(id: '__ID__'),
      lesson_types_dialog_url_value: settings_lesson_type_dialog_path,
      lesson_types_delete_dialog_url_value: settings_lesson_type_delete_dialog_path,
      lesson_types_subject_delete_dialog_url_value: settings_lesson_subject_delete_dialog_path
    }
    data[:lesson_types_workspace_catalog_url_value] = catalog_subjects_path if teacher_assign || workspace_catalog
    data[:lesson_types_can_manage_value] = can_manage_workspace_catalog? if workspace_catalog
    data.merge(extra)
  end
end
