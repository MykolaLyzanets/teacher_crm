# frozen_string_literal: true

module Registrations
  class CreateOwner
    def initialize(user:, workspace_type:, workspace_name:, terms:)
      @user = user
      @workspace_type = workspace_type.to_s
      @workspace_name = workspace_name.to_s.strip
      @terms = terms
    end

    attr_reader :user

    def save
      prepare_user
      validate_registration
      return false if user.errors.any?

      persist
      true
    rescue ActiveRecord::RecordInvalid => e
      user.errors.merge!(e.record.errors) if e.record != user
      false
    end

    private

    attr_reader :workspace_type, :workspace_name, :terms

    def prepare_user
      user.role = :owner
      user.skip_workspace_presence = true
    end

    def validate_registration
      unless Workspace.workspace_types.key?(workspace_type)
        user.errors.add(:base, I18n.t('registrations.errors.workspace_type'))
      end

      if workspace_type == 'school' && workspace_name.blank?
        user.errors.add(:base, I18n.t('registrations.errors.workspace_name'))
      end

      return if terms_accepted?

      user.errors.add(:base, I18n.t('registrations.errors.terms'))
    end

    def terms_accepted?
      ActiveModel::Type::Boolean.new.cast(terms)
    end

    def persist
      User.transaction do
        user.save!
        workspace = Workspace.create!(
          name: resolved_workspace_name,
          workspace_type:,
          owner: user
        )
        user.skip_workspace_presence = false
        user.update!(workspace:)
        create_teacher_profile!(workspace) if workspace.individual?
      end
    end

    def resolved_workspace_name
      return workspace_name if workspace_type == 'school'

      user.full_name
    end

    def create_teacher_profile!(workspace)
      first_name, last_name = split_name(user.full_name)
      TeacherProfile.create!(
        user:,
        workspace:,
        first_name:,
        last_name:,
        display_name: user.full_name,
        status: :active,
        preferred_contact_method: :email,
        default_lesson_duration_minutes: 60,
        calendar_color: :olive,
        working_days: %w[Monday Tuesday Wednesday Thursday Friday],
        lesson_formats: %w[online]
      )
    end

    def split_name(full_name)
      parts = full_name.to_s.strip.split(/\s+/, 2)
      [parts[0], parts[1]]
    end
  end
end
