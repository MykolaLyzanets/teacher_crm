# frozen_string_literal: true

# OmniAuth stores only query-string params in omniauth.params. Copy signup
# fields from the Google POST so the callback can create the workspace.
previous = OmniAuth.config.before_request_phase

OmniAuth.config.before_request_phase = lambda do |env|
  previous&.call(env)

  request = Rack::Request.new(env)
  session = env['rack.session']
  next unless session
  next unless request.path == '/users/auth/google_oauth2'

  session['google_signup'] = {
    'workspace_type' => request.params['workspace_type'].to_s,
    'workspace_name' => request.params['workspace_name'].to_s,
    'terms' => request.params['terms'].to_s
  }
end
