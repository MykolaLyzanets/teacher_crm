# frozen_string_literal: true

module Teachers
  module CompensationSetup
    module_function

    def parse(raw)
      return {} if raw.blank?

      data = raw.is_a?(String) ? JSON.parse(raw) : raw
      data.is_a?(Hash) ? data.with_indifferent_access : {}
    rescue JSON::ParserError, TypeError
      {}
    end

    def apply!(profile, raw)
      setup = parse(raw)
      if profile.has_attribute?(:compensation_setup)
        profile.compensation_setup = setup.presence || {}
      end
      return if !profile.has_attribute?(:compensation_percent)

      percent = extract_percent(setup)
      profile.compensation_percent = percent if percent
    end

    def extract_percent(setup)
      return if setup.blank?
      return if setup[:model].to_s == 'monthly_salary'

      rule_model = setup[:ruleModel].to_s
      return if rule_model != 'percentage'

      raw = setup[:standardPercent].to_s.strip.tr(',', '.')
      return if raw.blank?

      value = raw.to_i
      return if value <= 0 || value > 100

      value
    end

    def validation_errors(raw)
      setup = parse(raw)
      return [] if setup.blank?
      return [] if setup[:enabled] == false

      if setup[:model].to_s == 'monthly_salary' && !positive_amount?(setup[:salary])
        return [I18n.t('app.teachers.compensation.salary_invalid')]
      end

      []
    end

    def positive_amount?(raw)
      text = raw.to_s.strip.tr(',', '.')
      return false if text.blank?
      return false unless text.match?(/\A\d+(\.\d{1,2})?\z/)

      value = text.to_f
      value.finite? && value.positive?
    end
  end
end
