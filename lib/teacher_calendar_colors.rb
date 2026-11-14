# frozen_string_literal: true

module TeacherCalendarColors
  PALETTE = {
    olive: '#66734A',
    slate: '#6d7f93',
    amber: '#b08a3d',
    plum: '#7a6b8a',
    terra: '#8a5550',
    teal: '#5a7a72'
  }.freeze

  KEYS = PALETTE.keys.freeze

  def self.enum_definition
    @enum_definition ||= KEYS.each_with_index.to_h.freeze
  end

  def self.normalize_key(key)
    return :olive if key.blank?

    sym = key.to_sym
    return sym if PALETTE.key?(sym)

    if key.is_a?(Integer) || key.to_s.match?(/\A\d+\z/)
      idx = key.to_i
      return KEYS[idx] if idx >= 0 && idx < KEYS.size
    end

    :olive
  end

  def self.hex_for(key)
    PALETTE[normalize_key(key)]
  end

  def self.stringify_keys
    PALETTE.transform_keys(&:to_s)
  end
end
