import { Controller } from "@hotwired/stimulus"
import { formatMoney, formatPriceInput, parsePriceAmount } from "../lib/money"

const DEFAULT_CURRENCY = "UAH"

function todayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseCatalog(raw) {
  try {
    const data = JSON.parse(raw || "[]")
    if (!Array.isArray(data)) return []
    return data
  } catch {
    return []
  }
}

function teachingOptionsFromCatalog(subjects, labelDelivery) {
  return subjects.flatMap((subject) => {
    const subjectName = String(subject.name || "").trim()
    return (subject.lessonTypes || []).flatMap((type) => {
      const modes = Array.isArray(type.deliveryModes) && type.deliveryModes.length ? type.deliveryModes : []
      if (!modes.length) return []
      const kind = String(type.kind || type.mode || "individual").toLowerCase()
      const supportsMultipleStudents = kind === "group"
      const priceCents = type.priceCents ?? type.price_cents ?? null
      const currency = String(type.currency || DEFAULT_CURRENCY).trim() || DEFAULT_CURRENCY
      return modes.map((delivery) => ({
        key: `${type.id}|${delivery}`,
        label: `${subjectName} · ${type.name} · ${labelDelivery(delivery)}`,
        lessonTypeId: String(type.id),
        format: delivery,
        supportsMultipleStudents,
        priceCents: priceCents == null ? null : Number(priceCents),
        currency
      }))
    })
  })
}

function iconSvg(name, size = 13) {
  const paths = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    trash:
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert:
      '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    cash:
      '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>'
  }
  const body = paths[name] || ""
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

export default class extends Controller {
  static targets = [
    "disabledPanel",
    "formPanel",
    "optionsList",
    "optionsEmpty",
    "summaryHeadline",
    "summaryFooter",
    "previewBody",
    "standardRate",
    "standardPercent",
    "salaryAmount",
    "effectiveFrom",
    "payTypeLesson",
    "payTypeSalary",
    "ruleFixed",
    "rulePercent",
    "standardToggle",
    "standardToggleLabel",
    "standardBody",
    "standardFooter",
    "ruleFixedField",
    "rulePercentField",
    "monthlyBlock",
    "lessonBlocks"
  ]

  static values = {
    i18n: Object,
    locale: { type: String, default: "uk" }
  }

  connect() {
    this.enabled = true
    this.model = "lesson_based"
    this.currencyValue = DEFAULT_CURRENCY
    this.standardEnabled = true
    this.ruleModel = "fixed_per_lesson"
    this.standardRate = ""
    this.standardPercent = ""
    this.salary = ""
    this.effectiveFrom = todayIso()
    this.options = []
    this.specificRules = {}
    this.previewOptionKey = null
    this.previewPrices = {}
    this.onCatalogChange = this.onCatalogChange.bind(this)
    this.handleOptionsClick = this.handleOptionsClick.bind(this)
    this.handleOptionsInput = this.handleOptionsInput.bind(this)
    this.handlePreviewInput = this.handlePreviewInput.bind(this)
    document.addEventListener("lesson-catalog:change", this.onCatalogChange)
    this.catalogInput = document.querySelector('[data-lesson-types-target="draftPayload"]')
    if (this.hasOptionsListTarget) {
      this.optionsListTarget.addEventListener("click", this.handleOptionsClick)
      this.optionsListTarget.addEventListener("input", this.handleOptionsInput)
    }
    if (this.hasPreviewBodyTarget) {
      this.previewBodyTarget.addEventListener("change", this.handlePreviewInput)
      this.previewBodyTarget.addEventListener("input", this.handlePreviewInput)
    }
    this.refreshOptions()
    this.render()
  }

  disconnect() {
    document.removeEventListener("lesson-catalog:change", this.onCatalogChange)
    if (this.hasOptionsListTarget) {
      this.optionsListTarget.removeEventListener("click", this.handleOptionsClick)
      this.optionsListTarget.removeEventListener("input", this.handleOptionsInput)
    }
    if (this.hasPreviewBodyTarget) {
      this.previewBodyTarget.removeEventListener("change", this.handlePreviewInput)
      this.previewBodyTarget.removeEventListener("input", this.handlePreviewInput)
    }
  }

  t(key, fallback) {
    return this.i18nValue?.teachers?.compensation?.[key] || fallback || key
  }

  tCommon(key, fallback) {
    return this.i18nValue?.common?.[key] || fallback || key
  }

  currencyLabel() {
    return this.t("currency_uah", DEFAULT_CURRENCY)
  }

  onCatalogChange() {
    this.refreshOptions()
    this.render()
  }

  refreshOptions() {
    const raw = this.catalogInput?.value || "[]"
    const subjects = parseCatalog(raw)
    this.options = teachingOptionsFromCatalog(subjects, (delivery) => this.tCommon(delivery, delivery))
    const keys = new Set(this.options.map((item) => item.key))
    Object.keys(this.specificRules).forEach((key) => {
      if (!keys.has(key)) delete this.specificRules[key]
    })
    Object.keys(this.previewPrices).forEach((key) => {
      if (!keys.has(key)) delete this.previewPrices[key]
    })
    if (!this.previewOptionKey || !keys.has(this.previewOptionKey)) {
      this.previewOptionKey = this.options[0]?.key || null
    }
  }

  enableSetup() {
    this.enabled = true
    this.render()
  }

  disableSetup() {
    this.enabled = false
    this.render()
  }

  pickPayType(event) {
    const model = event.currentTarget.dataset.model
    if (!model) return
    this.model = model
    this.render()
  }

  pickRuleModel(event) {
    const model = event.currentTarget.dataset.ruleModel
    if (!model) return
    this.ruleModel = model
    this.render()
  }

  toggleStandard(event) {
    this.standardEnabled = event.currentTarget.checked
    this.render()
  }

  standardRateInput(event) {
    this.standardRate = event.currentTarget.value
    this.renderOptions()
    this.renderSummary()
    this.renderPreview()
    this.renderStandardFooter()
  }

  standardPercentInput(event) {
    this.standardPercent = event.currentTarget.value
    this.renderOptions()
    this.renderSummary()
    this.renderPreview()
    this.renderStandardFooter()
  }

  salaryInput(event) {
    this.salary = event.currentTarget.value
    this.renderSummary()
  }

  effectiveFromInput(event) {
    this.effectiveFrom = event.currentTarget.value
    this.renderSummary()
  }

  render() {
    if (this.hasDisabledPanelTarget) this.disabledPanelTarget.hidden = this.enabled
    if (this.hasFormPanelTarget) this.formPanelTarget.hidden = !this.enabled

    const lessonBased = this.model === "lesson_based"
    if (this.hasMonthlyBlockTarget) this.monthlyBlockTarget.hidden = lessonBased
    if (this.hasLessonBlocksTarget) this.lessonBlocksTarget.hidden = !lessonBased

    if (this.hasPayTypeLessonTarget) {
      this.payTypeLessonTarget.classList.toggle("is-selected", lessonBased)
      this.payTypeLessonTarget.setAttribute("aria-checked", lessonBased ? "true" : "false")
    }
    if (this.hasPayTypeSalaryTarget) {
      this.payTypeSalaryTarget.classList.toggle("is-selected", !lessonBased)
      this.payTypeSalaryTarget.setAttribute("aria-checked", lessonBased ? "false" : "true")
    }

    if (this.hasRuleFixedTarget) this.ruleFixedTarget.classList.toggle("is-active", this.ruleModel === "fixed_per_lesson")
    if (this.hasRulePercentTarget) this.rulePercentTarget.classList.toggle("is-active", this.ruleModel === "percentage")
    if (this.hasRuleFixedFieldTarget) this.ruleFixedFieldTarget.hidden = this.ruleModel !== "fixed_per_lesson"
    if (this.hasRulePercentFieldTarget) this.rulePercentFieldTarget.hidden = this.ruleModel !== "percentage"

    if (this.hasStandardToggleTarget) this.standardToggleTarget.checked = this.standardEnabled
    if (this.hasStandardToggleLabelTarget) {
      this.standardToggleLabelTarget.textContent = this.standardEnabled
        ? this.t("toggle_on", "On")
        : this.t("toggle_off", "Off")
    }
    if (this.hasStandardBodyTarget) this.standardBodyTarget.hidden = !this.standardEnabled
    if (this.hasStandardFooterTarget) {
      const card = this.standardFooterTarget.closest(".tc-rule-card")
      if (card) card.classList.toggle("tc-rule-card--off", !this.standardEnabled)
    }

    if (this.hasStandardRateTarget && this.standardRateTarget.value !== this.standardRate) {
      this.standardRateTarget.value = this.standardRate
    }
    if (this.hasStandardPercentTarget && this.standardPercentTarget.value !== this.standardPercent) {
      this.standardPercentTarget.value = this.standardPercent
    }
    if (this.hasSalaryAmountTarget && this.salaryAmountTarget.value !== this.salary) {
      this.salaryAmountTarget.value = this.salary
    }
    if (this.hasEffectiveFromTarget && this.effectiveFromTarget.value !== this.effectiveFrom) {
      this.effectiveFromTarget.value = this.effectiveFrom
    }
    this.renderOptions()
    this.renderStandardFooter()
    this.renderSummary()
    this.renderPreview()
  }

  renderStandardFooter() {
    if (!this.hasStandardFooterTarget) return
    if (!this.standardEnabled) {
      this.standardFooterTarget.textContent = this.t("standard_off_footer", "Off — teaching options without a specific rule need a pay rule.")
      return
    }
    if (this.options.length === 0) {
      this.standardFooterTarget.textContent = this.t("standard_default_footer", "Used by every teaching option once they’re added.")
      return
    }
    const usingDefault = this.options.filter((item) => !this.specificRules[item.key])
    if (usingDefault.length === 0) {
      this.standardFooterTarget.textContent = this.t("standard_all_own_rules", "Not used right now — every teaching option has its own rule.")
      return
    }
    if (this.hasStandardValue()) {
      const labels = usingDefault.map((item) => item.label).join(", ")
      this.standardFooterTarget.textContent = this.t("standard_used_by", "Used by: %{labels}").replace("%{labels}", labels)
      return
    }
    this.standardFooterTarget.textContent = this.t("standard_default_footer", "Used by every teaching option once they’re added.")
  }

  addOptionRule(key) {
    const baseModel = this.ruleModel === "percentage" ? "percentage" : "fixed_per_lesson"
    this.specificRules[key] = { ruleModel: baseModel, rate: "", percent: "" }
    this.render()
  }

  removeOptionRule(key) {
    delete this.specificRules[key]
    this.render()
  }

  handleOptionsClick(event) {
    const addBtn = event.target.closest("[data-tc-add-rule]")
    if (addBtn) {
      event.preventDefault()
      this.addOptionRule(addBtn.dataset.tcAddRule)
      return
    }
    const removeBtn = event.target.closest("[data-tc-remove-rule]")
    if (removeBtn) {
      event.preventDefault()
      this.removeOptionRule(removeBtn.dataset.tcRemoveRule)
      return
    }
    const modelBtn = event.target.closest("[data-tc-option-model]")
    if (!modelBtn) return
    const key = modelBtn.dataset.tcOptionModel
    const model = modelBtn.dataset.ruleModel
    const rule = this.specificRules[key]
    if (!rule || !model) return
    rule.ruleModel = model
    this.render()
  }

  handleOptionsInput(event) {
    const rateInput = event.target.closest("[data-tc-option-rate]")
    if (rateInput) {
      const rule = this.specificRules[rateInput.dataset.tcOptionRate]
      if (rule) {
        rule.rate = rateInput.value
        this.updateOptionRowMeta(rateInput.dataset.tcOptionRate)
        this.renderSummary()
        this.updatePreviewResult()
        this.renderStandardFooter()
      }
      return
    }
    const percentInput = event.target.closest("[data-tc-option-percent]")
    if (percentInput) {
      const rule = this.specificRules[percentInput.dataset.tcOptionPercent]
      if (rule) {
        rule.percent = percentInput.value
        this.updateOptionRowMeta(percentInput.dataset.tcOptionPercent)
        this.renderSummary()
        this.updatePreviewResult()
        this.renderStandardFooter()
      }
    }
  }

  updateOptionRowMeta(optionKey) {
    const option = this.options.find((item) => item.key === optionKey)
    if (!option || !this.hasOptionsListTarget) return
    const row = this.optionsListTarget.querySelector(`[data-tc-option-row="${cssEscape(optionKey)}"]`)
    if (!row) return
    const own = this.specificRules[optionKey]
    const status = this.resolveOptionStatus(option, own)
    const meta = row.querySelector(".tc-option__meta")
    if (meta) {
      meta.textContent = this.optionPayDetail(option, status, own)
      meta.className = `tc-option__meta tc-option__meta--${status}`
    }
    const badge = row.querySelector(".tc-pay-status")
    if (badge) badge.outerHTML = this.payStatusBadgeHtml(status)
  }

  resolveOptionStatus(option, own = this.specificRules[option.key]) {
    if (own) return "specific"
    if (this.model !== "lesson_based") return "salary"
    if (!this.standardEnabled) return "missing"
    return this.hasStandardValue() ? "default" : "missing"
  }

  standardValueText() {
    if (this.ruleModel === "percentage") {
      const percent = String(this.standardPercent).trim()
      return percent ? `${percent}%` : null
    }
    const rate = String(this.standardRate).trim()
    return rate ? `${this.currencyLabel()} ${rate}` : null
  }

  ruleValueText(rule) {
    if (!rule) return null
    if (rule.ruleModel === "percentage") {
      const percent = String(rule.percent).trim()
      return percent ? `${percent}%` : null
    }
    const rate = String(rule.rate).trim()
    return rate ? `${this.currencyLabel()} ${rate}` : null
  }

  optionPayDetail(option, status, own) {
    if (status === "missing") return this.t("status_missing", "Compensation not configured")
    if (status === "specific") {
      return this.ruleValueText(own) || this.t("amount_needed", "Amount needed")
    }
    if (status === "default") {
      const amount = this.standardValueText() || this.t("amount_needed", "Amount needed")
      return this.t("earns_default", "Teacher earns %{amount} (from the default)").replace("%{amount}", amount)
    }
    return ""
  }

  payStatusBadgeHtml(status) {
    const labels = {
      specific: this.t("pay_status_specific", "Own rule"),
      default: this.t("pay_status_default", "Uses default"),
      missing: this.t("pay_status_missing", "Compensation not configured")
    }
    const icons = { specific: "check", default: "grid", missing: "alert" }
    const label = labels[status] || labels.missing
    const icon = icons[status] || "alert"
    return `<span class="tc-pay-status tc-pay-status--${status}">${iconSvg(icon, 13)}<span>${esc(label)}</span></span>`
  }

  embeddedRuleHtml(option, rule) {
    const fixedActive = rule.ruleModel === "fixed_per_lesson"
    const removeLabel = this.t("remove_own_rule", "Use the default for this option instead")
    const fixedHidden = fixedActive ? "" : " hidden"
    const percentHidden = fixedActive ? " hidden" : ""
    return `<div class="tc-option__rule">
      <div class="tc-option-rule">
        <div class="tc-option-rule__row">
          <div class="tc-segmented tc-segmented--sm" role="group" aria-label="${esc(this.t("calculation_type", "Calculation type"))}">
            <button type="button" class="tc-segmented__btn${fixedActive ? " is-active" : ""}" data-tc-option-model="${esc(option.key)}" data-rule-model="fixed_per_lesson">
              ${iconSvg("cash", 15)}
              <span>${esc(this.t("fixed_amount", "Fixed amount"))}</span>
            </button>
            <button type="button" class="tc-segmented__btn${fixedActive ? "" : " is-active"}" data-tc-option-model="${esc(option.key)}" data-rule-model="percentage">
              <span>%</span>
              <span>${esc(this.t("percentage", "Percentage"))}</span>
            </button>
          </div>
          <button type="button" class="tc-option-rule__remove" data-tc-remove-rule="${esc(option.key)}" aria-label="${esc(removeLabel)}" title="${esc(removeLabel)}">
            ${iconSvg("trash", 17)}
          </button>
        </div>
        <div class="tc-field-width"${fixedHidden}>
          <div class="tc-affix">
            <span class="tc-affix__prefix">${esc(this.currencyLabel())}</span>
            <input class="tc-affix__input" type="text" inputmode="decimal" placeholder="300" data-tc-option-rate="${esc(option.key)}" value="${esc(rule.rate)}">
            <span class="tc-affix__suffix">${esc(this.t("per_lesson_suffix", "teacher earns per lesson"))}</span>
          </div>
        </div>
        <div class="tc-field-width"${percentHidden}>
          <div class="tc-affix">
            <input class="tc-affix__input" type="text" inputmode="decimal" placeholder="40" data-tc-option-percent="${esc(option.key)}" value="${esc(rule.percent)}">
            <span class="tc-affix__suffix">${esc(this.t("percent_suffix", "% of the student lesson price"))}</span>
          </div>
        </div>
      </div>
    </div>`
  }

  optionRowHtml(option) {
    const own = this.specificRules[option.key]
    const status = this.resolveOptionStatus(option, own)
    const detail = this.optionPayDetail(option, status, own)
    const groupHint = option.supportsMultipleStudents
      ? `<p class="tc-option__hint">${esc(this.t("group_amount_hint", "Amounts are for the whole lesson, not per student."))}</p>`
      : ""
    const addBtn = own
      ? ""
      : `<button type="button" class="tc-own-rule-btn" data-tc-add-rule="${esc(option.key)}">
          ${iconSvg("plus", 14)}
          <span>${esc(this.t("own_rule_btn", "Own rule"))}</span>
        </button>`
    const embedded = own ? this.embeddedRuleHtml(option, own) : ""
    return `<li class="tc-option" data-tc-option-row="${esc(option.key)}">
      <div class="tc-option__head">
        <div class="tc-option__copy">
          <p class="tc-option__label">${esc(option.label)}</p>
          <p class="tc-option__meta tc-option__meta--${status}">${esc(detail)}</p>
          ${groupHint}
        </div>
        <div class="tc-option__actions">
          ${this.payStatusBadgeHtml(status)}
          ${addBtn}
        </div>
      </div>
      ${embedded}
    </li>`
  }

  renderOptions() {
    if (!this.hasOptionsEmptyTarget || !this.hasOptionsListTarget) return
    const empty = this.options.length === 0
    this.optionsEmptyTarget.hidden = !empty
    this.optionsListTarget.hidden = empty
    if (empty) {
      this.optionsListTarget.innerHTML = ""
      return
    }
    this.optionsListTarget.innerHTML = this.options.map((option) => this.optionRowHtml(option)).join("")
  }

  renderSummary() {
    if (!this.hasSummaryHeadlineTarget) return
    const incomplete = this.summaryIncomplete()
    const summaryCard = this.summaryHeadlineTarget.closest(".tc-summary")
    if (summaryCard) summaryCard.classList.toggle("tc-summary--warn", incomplete)

    if (this.model === "monthly_salary") {
      const ok = String(this.salary).trim().length > 0
      this.summaryHeadlineTarget.textContent = ok
        ? `${this.currencyLabel()} ${this.salary} ${this.t("per_month_short", "per month")}`
        : this.t("salary_needed", "Monthly salary — amount needed")
    } else if (this.options.length === 0) {
      const hasDefault = this.standardEnabled && String(this.standardRate).trim().length > 0 && this.ruleModel === "fixed_per_lesson"
      const hasPct = this.standardEnabled && String(this.standardPercent).trim().length > 0 && this.ruleModel === "percentage"
      if (hasDefault) {
        this.summaryHeadlineTarget.textContent = `${this.t("default_rule", "Default rule")}: ${this.currencyLabel()} ${this.standardRate}`
      } else if (hasPct) {
        this.summaryHeadlineTarget.textContent = `${this.t("default_rule", "Default rule")}: ${this.standardPercent}%`
      } else if (this.standardEnabled) {
        this.summaryHeadlineTarget.textContent = this.t("default_amount_needed", "Default rule — amount needed")
      } else {
        this.summaryHeadlineTarget.textContent = this.t("no_rules", "No rules yet")
      }
    } else {
      const missing = this.options.filter((item) => !this.optionConfigured(item)).length
      if (missing > 0) {
        this.summaryHeadlineTarget.textContent = this.t("options_incomplete", "%{count} of %{total} teaching options not configured yet")
          .replace("%{count}", String(missing))
          .replace("%{total}", String(this.options.length))
      } else {
        this.summaryHeadlineTarget.textContent = this.t("options_complete", "All %{count} teaching options are paid")
          .replace("%{count}", String(this.options.length))
      }
    }

    if (this.hasSummaryFooterTarget) {
      const from = this.formatEffectiveFrom(this.effectiveFrom)
      const suffix = this.model === "monthly_salary"
        ? this.t("summary_salary_suffix", " · Lessons add no per-lesson pay")
        : ""
      this.summaryFooterTarget.textContent = `${this.t("from", "From")} ${from}${suffix}`
    }
  }

  optionConfigured(option) {
    const own = this.specificRules[option.key]
    const status = this.resolveOptionStatus(option, own)
    if (status === "missing") return false
    if (status === "specific") return Boolean(this.ruleValueText(own))
    if (status === "default") return this.hasStandardValue()
    return true
  }

  summaryIncomplete() {
    if (this.model === "monthly_salary") return String(this.salary).trim().length === 0
    if (this.options.length === 0) {
      return this.standardEnabled && !this.hasStandardValue()
    }
    return this.options.some((item) => !this.optionConfigured(item))
  }

  hasStandardValue() {
    if (this.ruleModel === "percentage") return String(this.standardPercent).trim().length > 0
    return String(this.standardRate).trim().length > 0
  }

  handlePreviewInput(event) {
    const select = event.target.closest("[data-tc-preview-option]")
    if (select) {
      this.previewOptionKey = select.value
      this.renderPreview()
      return
    }
    const priceInput = event.target.closest("[data-tc-preview-price]")
    if (priceInput) {
      this.previewPrices[priceInput.dataset.tcPreviewPrice] = priceInput.value
      this.updatePreviewResult()
    }
  }

  activeRuleForOption(option) {
    const own = this.specificRules[option.key]
    if (own) {
      return { ruleModel: own.ruleModel, rate: own.rate, percent: own.percent }
    }
    if (!this.standardEnabled || !this.hasStandardValue()) return null
    return {
      ruleModel: this.ruleModel,
      rate: this.standardRate,
      percent: this.standardPercent
    }
  }

  ruleDraftComplete(rule) {
    if (!rule) return false
    if (rule.ruleModel === "percentage") {
      const raw = String(rule.percent).trim().replace(",", ".")
      if (!raw) return false
      const value = Number(raw)
      return Number.isFinite(value) && value > 0
    }
    const cents = parsePriceAmount(rule.rate)
    return cents != null && cents > 0
  }

  previewOption() {
    return this.options.find((item) => item.key === this.previewOptionKey) || this.options[0] || null
  }

  defaultPreviewPrice(option) {
    const stored = this.previewPrices[option.key]
    if (stored != null && String(stored).trim() !== "") return stored
    const fromCatalog = formatPriceInput(option.priceCents)
    if (fromCatalog) return fromCatalog
    return "500"
  }

  previewPriceCents(option) {
    const raw = this.defaultPreviewPrice(option)
    const cents = parsePriceAmount(raw)
    if (cents == null || cents < 0) return 0
    return cents
  }

  calculatePreview(option, rule) {
    const status = this.resolveOptionStatus(option, this.specificRules[option.key])
    if (status === "missing") {
      return { matched: false, flag: this.t("preview_flag_missing", "Compensation not configured for this option. Give it its own rule or turn on the default.") }
    }
    if (!this.ruleDraftComplete(rule)) {
      const which = status === "specific"
        ? this.t("preview_rule_specific", "specific")
        : this.t("preview_rule_default", "default")
      return {
        matched: false,
        flag: this.t("preview_flag_incomplete", "Enter the amount for the %{which} rule to preview this option.")
          .replace("%{which}", which)
      }
    }
    const line = `${option.label} → ${this.t("teacher_earns", "teacher earns")}`
    if (rule.ruleModel === "percentage") {
      const percent = Number(String(rule.percent).trim().replace(",", "."))
      const priceCents = this.previewPriceCents(option)
      const earningCents = Math.max(0, Math.round((priceCents * percent) / 100))
      const currency = option.currency || DEFAULT_CURRENCY
      return {
        matched: true,
        line,
        amount: formatMoney(earningCents, DEFAULT_CURRENCY),
        explanation: this.t("preview_percent_explanation", "%{label} · %{percent}% of %{price} lesson price · Earns %{earn}")
          .replace("%{label}", option.label)
          .replace("%{percent}", String(percent))
          .replace("%{price}", formatMoney(priceCents, currency))
          .replace("%{earn}", formatMoney(earningCents, DEFAULT_CURRENCY))
      }
    }
    const earningCents = parsePriceAmount(rule.rate)
    return {
      matched: true,
      line,
      amount: formatMoney(earningCents, DEFAULT_CURRENCY),
      explanation: `${option.label} · ${this.t("preview_rate", "Rate")}: ${formatMoney(earningCents, DEFAULT_CURRENCY)}`
    }
  }

  usesStatusLabel(status) {
    if (status === "specific") return this.t("pay_status_specific", "Own rule")
    if (status === "default") return this.t("pay_status_default", "Uses default")
    return this.t("pay_status_missing", "Compensation not configured")
  }

  previewResultHtml(option) {
    const rule = this.activeRuleForOption(option)
    const status = this.resolveOptionStatus(option, this.specificRules[option.key])
    const outcome = this.calculatePreview(option, rule)
    const uses = `${this.t("preview_uses_prefix", "Uses:")} ${this.usesStatusLabel(status)}`
    if (!outcome.matched) {
      return {
        tone: "warn",
        html: `${this.previewFlagHtml(outcome.flag)}<p class="tc-preview__uses">${esc(uses)}</p>`
      }
    }
    return {
      tone: "ok",
      html: `
        <p class="tc-preview__meta">${esc(outcome.line)}</p>
        <p class="tc-preview__amount">${esc(outcome.amount)}</p>
        <p class="tc-preview__hint">${esc(outcome.explanation)}</p>
        <p class="tc-preview__uses">${esc(uses)}</p>`
    }
  }

  previewFlagHtml(message) {
    return `<p class="tc-preview__flag">${iconSvg("alert", 16)}<span>${esc(message)}</span></p>`
  }

  updatePreviewResult() {
    if (!this.hasPreviewBodyTarget) return
    const panel = this.previewBodyTarget.querySelector(".tc-preview__result")
    const option = this.previewOption()
    if (!panel || !option) return
    const result = this.previewResultHtml(option)
    panel.className = `tc-preview__result tc-preview__result--${result.tone}`
    panel.innerHTML = result.html
  }

  renderPreview() {
    if (!this.hasPreviewBodyTarget) return
    if (this.model !== "lesson_based") {
      this.previewBodyTarget.innerHTML = `<p class="tc-preview__hint">${esc(this.t("preview_salary", "Lesson preview applies to per-lesson pay only."))}</p>`
      return
    }
    if (this.options.length === 0) {
      this.previewBodyTarget.innerHTML = `<p class="tc-preview__hint">${esc(this.t("preview_no_options", "Add teaching options to preview what the teacher earns for a lesson."))}</p>`
      return
    }
    const option = this.previewOption()
    if (!option) return
    this.previewOptionKey = option.key
    const rule = this.activeRuleForOption(option)
    const showPrice = rule?.ruleModel === "percentage"
    const priceValue = this.defaultPreviewPrice(option)
    const optionsMarkup = this.options
      .map((item) => `<option value="${esc(item.key)}"${item.key === option.key ? " selected" : ""}>${esc(item.label)}</option>`)
      .join("")
    const priceRow = showPrice
      ? `<label class="tc-preview__price-row">
          <span class="tc-preview__price-label">${esc(this.t("preview_example_price", "Example lesson price"))}</span>
          <span class="tc-preview__price-input">
            <span class="tc-preview__price-currency">${esc(option.currency || DEFAULT_CURRENCY)}</span>
            <input type="text" inputmode="decimal" value="${esc(priceValue)}" data-tc-preview-price="${esc(option.key)}" aria-label="${esc(this.t("preview_example_price", "Example lesson price"))}">
          </span>
        </label>`
      : ""
    const result = this.previewResultHtml(option)
    this.previewBodyTarget.innerHTML = `
      <div class="tc-preview__controls">
        <label class="tc-preview__field">
          <span class="sr-only">${esc(this.t("options_title", "Teaching options"))}</span>
          <select class="tc-preview__select" data-tc-preview-option>${optionsMarkup}</select>
        </label>
        ${priceRow}
      </div>
      <div class="tc-preview__result tc-preview__result--${result.tone}" aria-live="polite">${result.html}</div>`
  }

  formatEffectiveFrom(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "—"
    const date = new Date(`${key}T00:00:00`)
    const locale = String(this.localeValue || "").startsWith("en") ? "en-US" : "uk-UA"
    return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })
  }
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value)
  return String(value).replace(/["\\]/g, "\\$&")
}
