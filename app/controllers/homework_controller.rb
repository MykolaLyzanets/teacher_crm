# frozen_string_literal: true

class HomeworkController < AppController
  helper LessonsHelper

  def index
    @homework_items = Demo::TeacherHomework.items_for(
      viewer_name: helpers.current_user_display_name,
      teacher: current_user.teacher?
    ).sort_by { |item| item[:dueDate].to_s }.reverse
    @homework_summary = Demo::TeacherHomework.summary(@homework_items)
    @default_tab = @homework_summary[:toReview].positive? ? 'to_review' : 'active'
    @student_options = homework_student_filter_options(@homework_items)
    @subject_options = @homework_items.map { |item| item[:subject].to_s }.compact_blank.uniq.sort
    @eligible_lessons = eligible_lessons_for_homework
    @materials_by_id = Demo::Catalog.materials.index_by { |item| item[:id].to_s }
  end

  private

  def homework_student_filter_options(items)
    seen = {}
    items.each do |item|
      Demo::TeacherHomework.student_ids(item).each do |id|
        next if seen[id]

        student = Demo::Catalog.find_student(id)
        seen[id] = student ? Demo::Catalog.student_name(student) : id
      end
    end
    seen.sort_by { |_id, name| name }
  end

  def eligible_lessons_for_homework
    assigned_ids = @homework_items.filter_map { |item| item[:lessonId].to_s.presence }.to_set
    catalog_lessons.select do |lesson|
      %w[completed no_show].include?(lesson[:status].to_s) && assigned_ids.exclude?(lesson[:id].to_s)
    end.sort_by { |lesson| lesson[:date].to_s }.reverse
  end
end
