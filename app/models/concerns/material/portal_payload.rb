# frozen_string_literal: true

module Material::PortalPayload
  extend ActiveSupport::Concern

  def as_portal_item
    {
      id: id.to_s,
      title: title,
      type: portal_type_key,
      mimeType: content_type.to_s,
      size: byte_size.to_i,
      durationSeconds: duration_seconds,
      sharedAt: created_at.iso8601,
      sharedBy: teacher.display_label,
      subject: subject.to_s,
      description: description.to_s,
      sourceKind: portal_source_kind,
      sourceLabel: portal_source_label,
      homeworkId: homework_id&.to_s,
      studentIds: students.pluck(:id).map(&:to_s),
      status: status,
      accessUrl: access_url,
      domain: link_domain
    }.with_indifferent_access
  end

  def portal_source_kind
    return 'homework' if homework_id.present?
    return 'lesson' if lesson_id.present?

    'direct'
  end

  def portal_source_label
    case portal_source_kind
    when 'homework' then homework&.title.presence || title
    when 'lesson'
      lesson&.subject&.name.presence || lesson&.lesson_type&.name.presence || title
    else
      teacher.display_label
    end
  end
end
