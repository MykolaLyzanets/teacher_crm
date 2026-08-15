# frozen_string_literal: true

class AppController < ApplicationController
  layout 'app'

  helper_method :app_page_stylesheet

  private

  def app_page_stylesheet
    {
      'students' => 'students',
      'teachers' => 'teachers',
      'calendar' => 'calendar',
      'dashboard' => 'dashboard',
      'pages' => 'placeholder'
    }[controller_name]
  end
end
