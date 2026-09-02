# frozen_string_literal: true

class ProfilesController < AppController
  def show
    profile = current_user.teacher_profile
    @teacher = profile&.as_catalog || {
      firstName: current_user.full_name.to_s.split(/\s+/, 2)[0],
      lastName: current_user.full_name.to_s.split(/\s+/, 2)[1],
      email: current_user.email,
      phone: '',
      timezone: 'America/New_York',
      defaultLessonCurrency: 'UAH'
    }.with_indifferent_access
    @solo = current_workspace&.individual?
  end
end
