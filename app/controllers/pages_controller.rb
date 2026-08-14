# frozen_string_literal: true

class PagesController < AppController
  PAGES = {
    'lessons' => { title: 'Lessons', description: 'Track lesson history, attendance and outcomes.', icon: 'book' },
    'homework' => { title: 'Homework', description: 'Assign and review student homework in one place.', icon: 'homework' },
    'payments' => { title: 'Payments', description: 'Manage invoices, balances and payment status.', icon: 'payments' },
    'reports' => { title: 'Reports', description: 'See teaching and business insights at a glance.', icon: 'reports' },
    'messages' => { title: 'Messages', description: 'Stay in touch with students and parents.', icon: 'messages' },
    'settings' => { title: 'Settings', description: 'Configure your workspace preferences.', icon: 'settings' }
  }.freeze

  def show
    key = params[:page].to_s.presence || params[:id].to_s
    @page = PAGES[key] || {
      title: key.titleize.presence || 'Page',
      description: 'This section is coming soon.',
      icon: 'dashboard'
    }
    @page_key = key
  end
end
