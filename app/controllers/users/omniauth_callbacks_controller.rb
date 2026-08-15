# frozen_string_literal: true

module Users
  class OmniauthCallbacksController < Devise::OmniauthCallbacksController
    skip_before_action :verify_authenticity_token, only: %i[google_oauth2 failure]

    def google_oauth2
      result = Users::Omniauth::Google.call(auth: request.env['omniauth.auth'], params: oauth_params)

      if result.success?
        sign_in_and_redirect result.user, event: :authentication
        set_flash_message(:notice, :success, kind: 'Google') if is_navigational_format?
      else
        redirect_to new_user_registration_path, alert: result.error
      end
    end

    def failure
      redirect_to new_user_session_path, alert: I18n.t('registrations.errors.google_failed')
    end

    private

    def oauth_params
      request.env['omniauth.params'] || {}
    end
  end
end
