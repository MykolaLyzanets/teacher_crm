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

    resources :students, only: %i[index show new create]
    resources :teachers, only: %i[index show new create]
    get 'calendar', to: 'calendar#index'

    %w[lessons homework payments reports messages settings].each do |page|
      get page, to: 'pages#show', defaults: { page: page }, as: page
    end

    match '*path', to: 'home#not_found', via: :all, constraints: lambda { |req|
      req.path.exclude?('uploads')
    }
  end
end
