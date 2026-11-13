# frozen_string_literal: true

FactoryBot.define do
  factory :currency do
    code { 'UAH' }
    name { 'Ukrainian hryvnia' }
    symbol { '₴' }
    subunit_to_unit { 100 }
    active { true }
    default { true }
  end
end
