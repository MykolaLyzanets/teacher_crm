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

    resources :students, only: %i[index show new create edit update]
    resources :teachers, only: %i[index show new create edit update]
    get 'calendar', to: 'calendar#index'
    get 'lessons', to: 'lessons#index'
    get 'payments', to: 'payments#index'

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

    %w[homework reports messages settings].each do |page|
      get page, to: 'pages#show', defaults: { page: page }, as: page
    end

    match '*path', to: 'home#not_found', via: :all, constraints: lambda { |req|
      req.path.exclude?('uploads')
    }
  end
end
