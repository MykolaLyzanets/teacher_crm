# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MaterialUploader do
  let(:material) { build(:material, kind: :document) }
  let(:uploader) { described_class.new(material, :file) }

  describe '#size_range' do
    it 'allows 500MB when kind is video' do
      material.kind = :video
      expect(uploader.size_range).to eq(1..500.megabytes)
    end

    it 'allows 500MB for video content type before kind is inferred' do
      allow(uploader).to receive(:file).and_return(instance_double(CarrierWave::SanitizedFile, content_type: 'video/mp4'))
      expect(uploader.size_range).to eq(1..500.megabytes)
    end

    it 'limits non-video files to 25MB' do
      allow(uploader).to receive(:file).and_return(instance_double(CarrierWave::SanitizedFile, content_type: 'application/pdf'))
      expect(uploader.size_range).to eq(1..25.megabytes)
    end
  end
end
