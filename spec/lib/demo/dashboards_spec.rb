# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Demo::Dashboards do
  it 'builds admin dashboard without demo finance calculations' do
    dashboard = described_class.admin(lessons: [], now: Time.zone.now)

    expect(dashboard[:pendingCount]).to eq(0)
    expect(dashboard[:payoutsRemaining]).to eq({})
    expect(dashboard[:payments][:paymentsReceived]).to eq({})
    finance_kinds = %w[student_debt low_balance pending_payment payout_due]
    kinds = dashboard[:needsAttention].map { |item| item[:kind].to_s }
    expect(kinds & finance_kinds).to eq([])
  end
end
