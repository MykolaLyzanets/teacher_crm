# frozen_string_literal: true

class ApplicationController < ActionController::Base
  include Localable

  protect_from_forgery with: :exception
  layout :layout_by_resource

  private

  def layout_by_resource
    devise_controller? ? 'auth' : 'application'
  end
end
