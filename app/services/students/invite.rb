# frozen_string_literal: true

module Students
  module Invite
    def invited?
      @invited == true
    end

    def send_invitation?
      ActiveModel::Type::Boolean.new.cast(params[:invite_to_workspace])
    end

    def validate_invitation!
      return unless send_invitation?
      return if user.email.present?

      user.errors.add(:email, :blank)
    end

    def invite_user!
      return unless send_invitation?
      return if user.email.blank?

      # Mail is not configured yet; invitations are a no-op.
    end
  end
end
