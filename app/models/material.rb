# frozen_string_literal: true

class Material < ApplicationRecord
  include Material::PortalPayload
  include Material::Creatable

  KINDS = { document: 0, video: 1, audio: 2, image: 3, link: 4 }.freeze
  STATUSES = { processing: 0, ready: 1, failed: 2 }.freeze
  ATTACHMENT_ROLES = { assignment: 0, submission: 1, review: 2 }.freeze

  enum kind: KINDS, _prefix: true
  enum status: STATUSES
  enum attachment_role: ATTACHMENT_ROLES, _prefix: :role

  mount_uploader :file, MaterialUploader

  belongs_to :workspace, inverse_of: :materials
  belongs_to :teacher, class_name: 'TeacherProfile', inverse_of: :materials
  belongs_to :lesson, optional: true
  belongs_to :homework, optional: true, inverse_of: :materials
  belongs_to :homework_response, optional: true, inverse_of: :materials
  has_many :material_students, dependent: :destroy, inverse_of: :material
  has_many :students, through: :material_students, source: :student, class_name: 'StudentProfile'

  validates :title, presence: true
  validates :external_url, presence: true, if: :kind_link?
  validate :file_or_link_present
  validate :homework_belongs_to_workspace
  validate :lesson_belongs_to_workspace

  before_validation :infer_kind_from_file, if: -> { file.present? && (file_changed? || kind_document?) }
  before_validation :mark_link_ready
  before_save :sync_file_metadata, if: :file_changed?

  scope :for_student, lambda { |student|
    joins(:material_students)
      .where(workspace_id: student.workspace_id, material_students: { student_id: student.id })
      .order(created_at: :desc)
  }

  scope :library, -> { where(status: :ready) }

  scope :library_standalone, lambda {
    role_assignment.where(homework_id: nil, lesson_id: nil, homework_response_id: nil)
  }

  scope :linkable_to_homework, lambda { |homework|
    role_assignment.where(homework_response_id: nil)
                 .where(homework_id: [nil, homework.id])
  }

  def self.library_index_for(scope)
    scope.library.includes(:teacher).each_with_object({}) do |material, index|
      index[material.id.to_s] = material.as_library_entry
    end
  end

  def self.portal_items_for(student)
    return [] if student.blank?

    for_student(student).includes(:teacher, :homework, :lesson, :students).map(&:as_portal_item)
  end

  def portal_type_key
    kind.to_s
  end

  def access_url
    return external_url if kind_link? && external_url.present?
    return file.url if file.present? && ready?

    nil
  end

  def link_domain
    return if external_url.blank?

    URI.parse(external_url).host
  rescue URI::InvalidURIError
    nil
  end

  def as_library_entry
    {
      id: id.to_s,
      title: title,
      type: portal_type_key,
      domain: link_domain,
      accessUrl: access_url
    }.compact
  end

  def share_with_lesson_students!(lesson)
    lesson.students.find_each do |student|
      material_students.find_or_create_by!(student:)
    end
  end

  def as_homework_attachment_summary
    {
      id: id.to_s,
      title: title,
      type: portal_type_key,
      name: title,
      accessUrl: access_url
    }.compact
  end

  private

  def file_or_link_present
    return if kind_link?
    return if file.present?

    errors.add(:file, :blank)
  end

  def homework_belongs_to_workspace
    return if homework.blank? || workspace.blank?
    return if homework.workspace_id == workspace_id

    errors.add(:homework, :invalid)
  end

  def lesson_belongs_to_workspace
    return if lesson.blank? || workspace.blank?
    return if lesson.teacher_profile.workspace_id == workspace_id

    errors.add(:lesson, :invalid)
  end

  def infer_kind_from_file
    content_type = file.file&.content_type.to_s
    self.kind = if content_type.start_with?('video/')
                  :video
                elsif content_type.start_with?('audio/')
                  :audio
                elsif content_type.start_with?('image/')
                  :image
                else
                  :document
                end
  end

  def mark_link_ready
    self.status = :ready if kind_link? && external_url.present?
  end

  def sync_file_metadata
    return if file.blank?

    self.content_type = file.file.content_type if file.file.respond_to?(:content_type)
    self.byte_size = file.size
    self.status = :ready
  end
end
