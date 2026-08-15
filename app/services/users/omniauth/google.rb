# frozen_string_literal: true

module Users
  module Omniauth
    class Google
      Result = Struct.new(:user, :error, keyword_init: true) do
        def success?
          user.present? && error.blank?
        end
      end

      def self.call(auth:, params: {})
        new(auth:, params:).call
      end

      def initialize(auth:, params: {})
        @auth = auth
        @params = (params || {}).with_indifferent_access
      end

      def call
        return failure(I18n.t('registrations.errors.google_email')) if email.blank?

        user = find_user
        if user
          link_google!(user)
          return Result.new(user:)
        end

        create_owner
      end

      private

      attr_reader :auth, :params

      def find_user
        User.find_by(provider: 'google_oauth2', uid: auth.uid) || User.find_by(email:)
      end

      def link_google!(user)
        return if user.uid == auth.uid && user.provider == 'google_oauth2'

        user.update!(provider: 'google_oauth2', uid: auth.uid)
      end

      def create_owner
        user = User.new(
          email:,
          full_name:,
          password: User.generate_password,
          provider: 'google_oauth2',
          uid: auth.uid
        )
        service = Registrations::CreateOwner.new(
          user:,
          workspace_type:,
          workspace_name: params[:workspace_name],
          terms: true
        )

        if service.save
          Result.new(user: service.user)
        else
          Result.new(error: owner_error(service))
        end
      end

      def email
        auth.info.email.to_s.downcase.presence
      end

      def full_name
        auth.info.name.presence ||
          [auth.info.first_name, auth.info.last_name].compact_blank.join(' ').presence ||
          email.split('@').first
      end

      def workspace_type
        type = params[:workspace_type].to_s
        Workspace.workspace_types.key?(type) ? type : 'individual'
      end

      def owner_error(service)
        connector = " #{I18n.t('registrations.and')} "
        service.user.errors.full_messages.to_sentence(
          words_connector: ', ',
          two_words_connector: connector,
          last_word_connector: connector
        ).presence || I18n.t('registrations.errors.google_workspace')
      end

      def failure(message)
        Result.new(error: message)
      end
    end
  end
end
