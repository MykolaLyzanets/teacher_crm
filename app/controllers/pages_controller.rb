# frozen_string_literal: true

class PagesController < AppController
  PAGE_KEYS = %w[homework payments reports messages settings].freeze

  def show
    key = params[:page].to_s.presence || params[:id].to_s
    @page_key = key

    if PAGE_KEYS.include?(key)
      @page = {
        title: I18n.t("app.pages.#{key}.title"),
        description: I18n.t("app.pages.#{key}.description"),
        icon: {
          'homework' => 'homework',
          'payments' => 'payments',
          'reports' => 'reports',
          'messages' => 'messages',
          'settings' => 'settings'
        }[key]
      }
    else
      @page = {
        title: key.titleize.presence || 'Page',
        description: I18n.t('app.pages.coming_soon_text'),
        icon: 'dashboard'
      }
    end
  end
end
