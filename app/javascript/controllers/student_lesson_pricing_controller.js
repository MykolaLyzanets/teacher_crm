import { Controller } from "@hotwired/stimulus"
import { formatMoney, formatPriceInput, parsePriceAmount } from "../lib/money"

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function catalogTypes(subjects) {
  const rows = []
  subjects.forEach((subject) => {
    const subjectName = String(subject.name || "").trim()
    ;(subject.lessonTypes || []).forEach((type) => {
      if (type.isActive === false) return
      const id = String(type.id)
      if (!id) return
      rows.push({
        lessonTypeId: id,
        subjectId: String(type.subjectId || subject.id || ""),
        subjectName,
        lessonTypeName: String(type.name || "").trim(),
        catalogPriceCents: type.priceCents ?? type.price_cents ?? null,
        currency: String(type.currency || "UAH").trim() || "UAH",
        defaultDurationMinutes: Number(type.defaultDurationMinutes || type.default_duration_minutes || 60)
      })
    })
  })
  return rows.sort((a, b) =>
    `${a.subjectName} ${a.lessonTypeName}`.localeCompare(`${b.subjectName} ${b.lessonTypeName}`)
  )
}

export default class extends Controller {
  static targets = ["list", "empty", "payload", "typeSelect", "priceInput", "addError"]

  static values = {
    initial: Array,
    catalogUrl: String,
    currency: { type: String, default: "UAH" },
    i18n: Object
  }

  connect() {
    this.catalog = []
    this.rows = Array.isArray(this.initialValue) ? this.initialValue.map((row) => ({ ...row })) : []
    this.draftPrice = ""
    this.boundClick = this.onClick.bind(this)
    this.boundInput = this.onInput.bind(this)
    this.element.addEventListener("click", this.boundClick)
    this.element.addEventListener("input", this.boundInput)
    this.loadCatalog()
  }

  disconnect() {
    this.element.removeEventListener("click", this.boundClick)
    this.element.removeEventListener("input", this.boundInput)
  }

  t(key, fallback) {
    return this.i18nValue?.lesson_prices_form?.[key] || fallback || key
  }

  async loadCatalog() {
    if (!this.hasCatalogUrlValue) {
      this.render()
      return
    }
    try {
      const url = new URL(this.catalogUrlValue, window.location.origin)
      url.searchParams.set("include_inactive", "0")
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } })
      if (!response.ok) throw new Error("catalog")
      const data = await response.json()
      this.catalog = Array.isArray(data) ? data : []
    } catch {
      this.catalog = []
    }
    this.render()
  }

  types() {
    return catalogTypes(this.catalog)
  }

  usedIds() {
    return new Set(this.rows.map((row) => String(row.lessonTypeId)))
  }

  onClick(event) {
    const remove = event.target.closest("[data-slp-remove]")
    if (remove) {
      event.preventDefault()
      const id = remove.dataset.slpRemove
      this.rows = this.rows.filter((row) => String(row.lessonTypeId) !== id)
      this.render()
      return
    }
    const add = event.target.closest("[data-slp-add]")
    if (add) {
      event.preventDefault()
      this.addRow()
    }
  }

  onInput(event) {
    if (event.target.matches("[data-slp-price]")) {
      this.draftPrice = event.target.value
    }
    if (event.target.matches("[data-slp-row-price]")) {
      const id = event.target.dataset.slpRowPrice
      const row = this.rows.find((item) => String(item.lessonTypeId) === id)
      if (!row) return
      const cents = parsePriceAmount(event.target.value)
      row.priceCents = cents
      this.syncPayload()
    }
    if (event.target.matches("[data-student-lesson-pricing-target='typeSelect']")) {
      this.prefillDraftPrice()
    }
  }

  prefillDraftPrice() {
    const type = this.selectedType()
    if (!type) {
      this.draftPrice = ""
    } else {
      this.draftPrice = formatPriceInput(type.catalogPriceCents)
    }
    if (this.hasPriceInputTarget) this.priceInputTarget.value = this.draftPrice
  }

  selectedType() {
    if (!this.hasTypeSelectTarget) return null
    const id = this.typeSelectTarget.value
    if (!id) return null
    return this.types().find((item) => item.lessonTypeId === id) || null
  }

  showAddError(message) {
    if (!this.hasAddErrorTarget) return
    this.addErrorTarget.textContent = message
    this.addErrorTarget.hidden = !message
  }

  addRow() {
    this.showAddError("")
    const type = this.selectedType()
    if (!type) {
      this.showAddError(this.t("pick_type", "Choose a lesson type."))
      return
    }
    if (this.usedIds().has(type.lessonTypeId)) {
      this.showAddError(this.t("already_added", "This lesson type is already on the list."))
      return
    }
    const cents = parsePriceAmount(this.hasPriceInputTarget ? this.priceInputTarget.value : this.draftPrice)
    if (cents == null) {
      this.showAddError(this.t("price_invalid", "Enter a price (0 or more)."))
      return
    }
    this.rows = [
      ...this.rows,
      {
        lessonTypeId: type.lessonTypeId,
        subjectId: type.subjectId,
        subjectName: type.subjectName,
        lessonTypeName: type.lessonTypeName,
        priceCents: cents,
        currency: type.currency || this.currencyValue,
        catalogPriceCents: type.catalogPriceCents
      }
    ]
    this.rows.sort((a, b) =>
      `${a.subjectName} ${a.lessonTypeName}`.localeCompare(`${b.subjectName} ${b.lessonTypeName}`)
    )
    if (this.hasTypeSelectTarget) this.typeSelectTarget.value = ""
    this.draftPrice = ""
    if (this.hasPriceInputTarget) this.priceInputTarget.value = ""
    this.render()
  }

  syncPayload() {
    if (!this.hasPayloadTarget) return
    this.payloadTarget.value = JSON.stringify(
      this.rows.map((row) => ({
        lessonTypeId: row.lessonTypeId,
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        lessonTypeName: row.lessonTypeName,
        priceCents: row.priceCents,
        currency: row.currency || this.currencyValue
      }))
    )
  }

  render() {
    const available = this.types().filter((type) => !this.usedIds().has(type.lessonTypeId))
    if (this.hasTypeSelectTarget) {
      const current = this.typeSelectTarget.value
      const groups = new Map()
      available.forEach((type) => {
        const key = type.subjectName || "—"
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(type)
      })
      let options = `<option value="">${esc(this.t("select_type", "Select lesson type"))}</option>`
      ;[...groups.entries()].forEach(([subjectName, types]) => {
        const inner = types
          .map((type) => {
            const catalog =
              type.catalogPriceCents == null
                ? ""
                : ` · ${formatMoney(type.catalogPriceCents, type.currency)}`
            return `<option value="${esc(type.lessonTypeId)}">${esc(type.lessonTypeName)}${esc(catalog)}</option>`
          })
          .join("")
        options += `<optgroup label="${esc(subjectName)}">${inner}</optgroup>`
      })
      this.typeSelectTarget.innerHTML = options
      if (current && available.some((item) => item.lessonTypeId === current)) {
        this.typeSelectTarget.value = current
      }
      this.typeSelectTarget.disabled = available.length === 0
    }

    if (this.hasEmptyTarget) this.emptyTarget.hidden = this.rows.length > 0
    if (this.hasListTarget) {
      this.listTarget.hidden = this.rows.length === 0
      this.listTarget.innerHTML = this.rows.map((row) => this.rowHtml(row)).join("")
    }
    this.syncPayload()
  }

  rowHtml(row) {
    const id = String(row.lessonTypeId)
    const currency = row.currency || this.currencyValue
    const catalog =
      row.catalogPriceCents == null
        ? ""
        : `<span class="sp-pricing__catalog">${esc(this.t("catalog_default", "Catalog"))}: ${esc(formatMoney(row.catalogPriceCents, currency))}</span>`
    return `<li class="sp-pricing__row" data-slp-row="${esc(id)}">
      <div class="sp-pricing__row-main">
        <p class="sp-pricing__row-title">${esc(row.subjectName)} · ${esc(row.lessonTypeName)}</p>
        ${catalog}
      </div>
      <div class="students-page__affix-input">
        <span class="students-page__affix-prefix">${esc(currency)}</span>
        <input type="text" inputmode="decimal" value="${esc(formatPriceInput(row.priceCents))}" data-slp-row-price="${esc(id)}" aria-label="${esc(this.t("price_aria", "Lesson price"))}">
      </div>
      <button type="button" class="sp-pricing__remove" data-slp-remove="${esc(id)}" aria-label="${esc(this.t("remove", "Remove"))}">×</button>
    </li>`
  }
}
