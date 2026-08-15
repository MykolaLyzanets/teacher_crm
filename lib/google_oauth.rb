# frozen_string_literal: true

module GoogleOauth
  class << self
    def client_id
      ENV['GOOGLE_CLIENT_ID'].presence || credential(:GOOGLE_CLIENT_ID, :client_id)
    end

    def client_secret
      ENV['GOOGLE_CLIENT_SECRET'].presence || credential(:GOOGLE_CLIENT_SECRET, :client_secret)
    end

    def configured?
      client_id.present? && client_secret.present?
    end

    private

    def credential(*keys)
      google = Rails.application.credentials.google
      return if google.blank?

      keys.map { |key| google[key] }.find(&:present?)
    end
  end
end
