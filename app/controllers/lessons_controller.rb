# frozen_string_literal: true

class LessonsController < AppController
  def index
    @lessons = Array(Demo::Catalog.lessons).map(&:with_indifferent_access)
    @teacher_names = @lessons.map { |lesson| lesson[:teacher].to_s }.compact_blank.uniq.sort
  end
end
