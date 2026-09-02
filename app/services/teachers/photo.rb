# frozen_string_literal: true

module Teachers
  module Photo
    ACCEPTED_CONTENT_TYPES = %w[image/jpeg image/jpg image/png image/webp].freeze
    MAX_BYTES = 2.megabytes

    def validate_photo!
      file = params[:photo]
      return if file.blank?

      unless ACCEPTED_CONTENT_TYPES.include?(file.content_type.to_s)
        teacher_profile.errors.add(:photo, I18n.t('app.teachers.photo_type_error'))
      end
      return unless file.respond_to?(:size) && file.size.to_i > MAX_BYTES

      teacher_profile.errors.add(:photo, I18n.t('app.teachers.photo_size_error'))
    end

    def persist_photo
      file = params[:photo]
      if file.present?
        teacher_profile.photo = file
      elsif ActiveModel::Type::Boolean.new.cast(params[:remove_photo])
        teacher_profile.remove_photo = true
      end
    end
  end
end
