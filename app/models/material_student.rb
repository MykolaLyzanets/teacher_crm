# frozen_string_literal: true

class MaterialStudent < ApplicationRecord
  belongs_to :material, inverse_of: :material_students
  belongs_to :student, class_name: 'StudentProfile', inverse_of: :material_students

  validates :student_id, uniqueness: { scope: :material_id }
end
