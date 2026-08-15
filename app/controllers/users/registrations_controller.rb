# frozen_string_literal: true

module Users
  class RegistrationsController < Devise::RegistrationsController
    def create
      build_resource(sign_up_params)
      service = Registrations::CreateOwner.new(
        user: resource,
        workspace_type: params[:workspace_type],
        workspace_name: params[:workspace_name],
        terms: params[:terms]
      )

      if service.save
        set_flash_message! :notice, :signed_up
        sign_up(resource_name, resource)
        respond_with resource, location: after_sign_up_path_for(resource)
      else
        clean_up_passwords resource
        set_minimum_password_length
        render :new, status: :unprocessable_entity
      end
    end

    protected

    def after_sign_up_path_for(_resource)
      dashboard_path
    end

    def sign_up_params
      params.require(:user).permit(:email, :password, :password_confirmation, :full_name)
    end
  end
end
