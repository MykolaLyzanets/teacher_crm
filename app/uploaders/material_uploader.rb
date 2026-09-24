# frozen_string_literal: true

class MaterialUploader < CarrierWave::Uploader::Base
  def extension_allowlist
    %w[
      pdf doc docx ppt pptx xls xlsx txt jpg jpeg png webp
      mp3 m4a wav webm mp4 mov m4v
    ]
  end

  def size_range
    return 1..500.megabytes if model.kind_video? || video_content_type?

    1..25.megabytes
  end

  def video_content_type?
    file&.content_type.to_s.start_with?('video/')
  end

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end
end
