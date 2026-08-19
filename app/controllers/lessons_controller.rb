# frozen_string_literal: true

class LessonsController < AppController
  def index
    @lessons = Array(Demo::Catalog.lessons).map(&:with_indifferent_access)
    db_teachers = teacher_profiles_scope.order(:first_name, :last_name).map(&:as_catalog)
    @teachers = db_teachers.presence || Demo::Catalog.teachers

    names = @lessons.map { |lesson| lesson[:teacher].to_s }.compact_blank
    names.concat(@teachers.map { |teacher| teacher_display_name(teacher) })
    @teacher_names = names.compact_blank.uniq.sort
  end

  private

  def teacher_display_name(teacher)
    teacher[:displayName].presence ||
      [teacher[:firstName], teacher[:lastName]].compact_blank.join(' ').presence ||
      'Teacher'
  end
end
