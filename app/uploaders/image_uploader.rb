# frozen_string_literal: true

class ImageUploader < CarrierWave::Uploader::Base
  def extension_allowlist
    %w[jpg jpeg png webp]
  end

  def content_type_allowlist
    %w[image/jpeg image/png image/webp]
  end

  def size_range
    1..(2.megabytes)
  end

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end
end
