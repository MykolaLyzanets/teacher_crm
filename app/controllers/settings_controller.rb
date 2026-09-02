# frozen_string_literal: true

class SettingsController < AppController
  def index; end

  def lessons; end

  def lesson_types
    @solo = current_workspace&.individual?
  end
end
