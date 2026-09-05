# frozen_string_literal: true

module CalendarHelper
  def calendar_json(value)
    ERB::Util.json_escape(value.to_json)
  end

  def calendar_create_turbo_data(sync: false)
    data = { turbo: true, turbo_frame: 'create_lesson' }
    data[:calendar_target] = 'createLink' if sync
    data
  end

  def calendar_new_dialog_path(**params)
    new_calendar_path(params.compact)
  end
end
