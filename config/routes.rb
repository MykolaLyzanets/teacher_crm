# frozen_string_literal: true

require 'sidekiq/web'

Rails.application.routes.draw do
  mount LetterOpenerWeb::Engine, at: '/letter_opener' if Rails.env.development? || Rails.env.test?

  authenticate :user, ->(user) { user.admin? } do
    mount Sidekiq::Web => '/sidekiq'
  end

  get '(*path)', to: redirect { |_params, request|
    request.original_url.sub('www.', '')
  }, constraints: { host: /^www\./ }

  devise_for :users,
             only: :omniauth_callbacks,
             controllers: { omniauth_callbacks: 'users/omniauth_callbacks' }

  scope '(:locale)', locale: /(#{I18n.available_locales.map(&:to_s).join('|')})/ do
    devise_for :users,
               skip: :omniauth_callbacks,
               controllers: { registrations: 'users/registrations' }

    root 'home#index'

    get 'dashboard', to: 'dashboard#index'

    resources :students, only: %i[index show new create edit update destroy] do
      collection do
        get :assign_dialog
        patch :assign
        get :delete_dialog
      end
      member do
        get :unassign_dialog
        delete :unassign
      end
    end
    resources :teachers, only: %i[index show new create edit update destroy] do
      collection do
        get :delete_dialog
        get :assign_dialog
        get :unassign_dialog
      end
    end
    get 'calendar', to: 'calendar#index'
    get 'calendar/new', to: 'calendar#new', as: :new_calendar
    get 'lessons', to: 'lessons#index'
    get 'payments', to: 'payments#index'
    get 'profile', to: 'profiles#show'

    get 'settings', to: 'settings#index'
    get 'settings/lessons', to: 'settings#lessons', as: :settings_lessons
    get 'settings/lessons/lesson-types', to: 'settings#lesson_types', as: :settings_lesson_types
    get 'settings/lessons/lesson-types/dialog', to: 'settings#lesson_type_dialog', as: :settings_lesson_type_dialog
    get 'settings/lessons/lesson-types/delete-dialog', to: 'settings#lesson_type_delete_dialog', as: :settings_lesson_type_delete_dialog
    get 'settings/lessons/lesson-types/subject-delete-dialog', to: 'settings#lesson_subject_delete_dialog', as: :settings_lesson_subject_delete_dialog

    scope :student, as: :student do
      get '/', to: 'student_portal#home', as: :root
      get 'home', to: 'student_portal#home'
      get 'calendar', to: 'student_portal#calendar'
      get 'homework', to: 'student_portal#homework'
      get 'materials', to: 'student_portal#materials'
      get 'payments', to: 'student_portal#payments'
      get 'profile', to: 'student_portal#profile'
      get 'notifications', to: 'student_portal#notifications'
    end

    %w[homework reports messages].each do |page|
      get page, to: 'pages#show', defaults: { page: page }, as: page
    end

    match '*path', to: 'home#not_found', via: :all, constraints: lambda { |req|
      req.path.exclude?('uploads')
    }
  end
end
