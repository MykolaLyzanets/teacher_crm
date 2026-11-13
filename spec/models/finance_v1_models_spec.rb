# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Finance v1 models', type: :model do
  it 'loads models and enum mappings' do
    expect(Currency).to be < ApplicationRecord
    expect(StudentTransaction.transaction_types.keys).to contain_exactly(
      *%w[payment lesson_charge cancellation_charge adjustment refund opening_balance charge_reversal debt_allocation]
    )
    expect(StudentTransaction.statuses.keys).to contain_exactly('pending', 'confirmed', 'rejected')
    expect(StudentTransaction.defined_enums['method'].keys).to contain_exactly(
      *%w[cash bank_transfer card online other]
    )
    expect(TeacherEarning.kinds.keys).to contain_exactly('lesson_completed', 'cancellation_charged')
    expect(TeacherPayout.defined_enums['method'].keys).to contain_exactly(
      *%w[cash bank_transfer card online other]
    )
  end

  describe Currency do
    def seed_uah
      Currency.where(default: true).where.not(code: 'UAH').update_all(default: false)
      Currency.find_or_initialize_by(code: 'UAH').tap do |currency|
        currency.name = 'Ukrainian hryvnia'
        currency.symbol = '₴'
        currency.subunit_to_unit = 100
        currency.active = true
        currency[:default] = true
        currency.save!
      end
    end

    it 'seeds UAH idempotently' do
      2.times { seed_uah }

      expect(Currency.where(code: 'UAH').count).to eq(1)
      uah = Currency.find_by!(code: 'UAH')
      expect(uah.default?).to be(true)
      expect(uah.subunit_to_unit).to eq(100)
    end
  end
end
