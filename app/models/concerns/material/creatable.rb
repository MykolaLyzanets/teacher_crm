# frozen_string_literal: true

module Material::Creatable
  extend ActiveSupport::Concern

  class_methods do
    def build_from_upload(attrs)
      new(attrs).tap(&:prepare_from_upload!)
    end
  end

  def prepare_from_upload!
    self.attachment_role ||= :assignment
    self.status = :ready if kind_link? && external_url.present?
  end
end
