# frozen_string_literal: true

class User < ApplicationRecord
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :validatable

  validates :admin, inclusion: { in: [true, false] }

  def admin?
    admin == true
  end
end
