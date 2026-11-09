# frozen_string_literal: true

class AppearancesController < ApplicationController
  before_action :authenticate_user!

  def update
    payload = User.sanitize_appearance(appearance_params.to_h)
    current_user.update!(appearance: payload)
    render json: { appearance: payload }
  end

  private

  def appearance_params
    params.require(:appearance).permit(*User::APPEARANCE_KEYS)
  end
end
