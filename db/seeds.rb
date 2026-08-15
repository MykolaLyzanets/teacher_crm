# frozen_string_literal: true

admin_email = ENV.fetch('ADMIN_EMAIL', 'admin@gmail.com')
admin_password = ENV.fetch('ADMIN_PASSWORD', 'admin@gmail.com')

User.find_or_create_by!(email: admin_email) do |user|
  user.password = admin_password
  user.password_confirmation = admin_password
  user.full_name = 'Admin'
  user.role = :admin
end

Demo::Seeder.call

puts "Admin user ready: #{admin_email}"
puts 'Demo workspace ready: ava.thompson@example.com / DemoPass123'
