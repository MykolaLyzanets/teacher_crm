# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Lessons::OccurrenceDates do
  it 'returns the start date when repeat is none' do
    expect(described_class.call(date: '2026-09-05', repeat: 'none', repeat_end: '2026-10-01'))
      .to eq([Date.new(2026, 9, 5)])
  end

  it 'walks weekly until the end date' do
    expect(described_class.call(date: '2026-09-05', repeat: 'weekly', repeat_end: '2026-09-19'))
      .to eq([Date.new(2026, 9, 5), Date.new(2026, 9, 12), Date.new(2026, 9, 19)])
  end

  it 'walks selected weekdays for a custom range' do
    dates = described_class.call(
      date: '2026-09-07',
      repeat: 'custom',
      repeat_end: '2026-09-11',
      weekdays: %w[Monday Wednesday Friday]
    )

    expect(dates).to eq([Date.new(2026, 9, 7), Date.new(2026, 9, 9), Date.new(2026, 9, 11)])
  end
end
