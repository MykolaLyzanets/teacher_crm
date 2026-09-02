import { Controller } from "@hotwired/stimulus"
import {
  createLessonType,
  deleteLessonType,
  formatMoney,
  formatPriceInput,
  getEffectiveLessonTypesForTeacher,
  initLessonTypesStore,
  listLessonTypes,
  parsePriceInput,
  priceSuffix,
  saveTeacherLessonTypeAccess,
  setLessonTypeActive,
  updateLessonType
} from "../lib/lesson_types_store"

const DURATIONS = [30, 45, 60, 90, 120]
const CURRENCIES = ["UAH", "EUR", "USD", "GBP", "PLN"]

const ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/></svg>'
}

export default class extends Controller {
  static targets = [
    "toast",
    "list",
    "empty",
    "accessList",
    "listError",
    "dialog",
    "dialogTitle",
    "formError",
    "name",
    "mode",
    "priceTypeWrap",
    "priceType",
    "duration",
    "price",
    "currency",
    "description",
    "active",
    "nameError",
    "durationError",
    "priceError",
    "deleteDialog",
    "deleteName"
  ]

  static values = {
    seed: Object,
    i18n: Object,
    mode: { type: String, default: "catalog" },
    teacherId: String,
    teacherEmail: String,
    defaultCurrency: { type: String, default: "UAH" },
    requireActive: { type: Boolean, default: false },
    editUrl: String
  }

  connect() {
    initLessonTypesStore(this.seedValue || {})
    this.dialogTargetId = null
    this.pendingDeleteId = null
    this.render()
  }

  t(key, fallback) {
    return this.i18nValue?.lesson_types?.[key] || fallback || key
  }

  showToast(message) {
    if (!this.hasToastTarget || !message) return
    this.toastTarget.textContent = message
    this.toastTarget.hidden = false
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => { this.toastTarget.hidden = true }, 3200)
  }

  render() {
    if (this.modeValue === "readonly") {
      this.renderReadonly()
      return
    }
    if (this.modeValue === "teacher") {
      this.renderTeacherAccess()
      return
    }
    this.renderCatalog()
  }

  renderCatalog() {
    if (!this.hasListTarget) return
    const types = listLessonTypes()
    if (this.hasEmptyTarget) this.emptyTarget.hidden = types.length > 0
    this.listTarget.hidden = types.length === 0
    this.listTarget.innerHTML = types.map((item) => this.catalogRow(item)).join("")
  }

  catalogRow(item) {
    const price = `${formatMoney(item.defaultPriceCents, item.currency)}${priceSuffix(item.priceType)}`
    const mode = this.t(item.mode, item.mode)
    const status = item.isActive ? this.t("active", "Active") : this.t("inactive", "Inactive")
    const statusClass = item.isActive ? "olive" : "neutral"
    const deleteBtn = item.isActive
      ? `<button type="button" class="lt-icon-btn" data-action="lesson-types#askDelete" data-id="${esc(item.id)}" aria-label="${esc(this.t("delete", "Delete"))}">${ICONS.trash}</button>`
      : `<button type="button" class="lt-text-btn" data-action="lesson-types#reactivate" data-id="${esc(item.id)}">${esc(this.t("reactivate", "Reactivate"))}</button>`
    return `<article class="lt-row ${item.isActive ? "" : "is-inactive"}">
      <div>
        <div class="lt-row__title">
          <p>${esc(item.name)}</p>
          <span class="status-badge status-badge--${statusClass}">${esc(status)}</span>
        </div>
        <p class="lt-row__meta">${esc(mode)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))} · ${esc(price)}</p>
        ${item.description ? `<p class="lt-row__desc">${esc(item.description)}</p>` : ""}
      </div>
      <div class="lt-row__actions">
        <button type="button" class="lt-icon-btn" data-action="lesson-types#openEdit" data-id="${esc(item.id)}" aria-label="${esc(this.t("edit", "Edit"))}">${ICONS.pencil}</button>
        ${deleteBtn}
      </div>
    </article>`
  }

  renderTeacherAccess() {
    if (!this.hasAccessListTarget) return
    const rows = getEffectiveLessonTypesForTeacher(this.teacherIdValue, this.teacherEmailValue)
    if (!rows.length) {
      this.accessListTarget.innerHTML = `<p class="lt-empty-inline">${esc(this.t("none_yet", "No lesson types yet — add the first one below."))}</p>`
      return
    }
    this.accessListTarget.innerHTML = rows.map((row) => this.accessRow(row)).join("")
  }

  accessRow(row) {
    const item = row.lessonType
    const priceLabel = `${formatPriceInput(item.defaultPriceCents)} ${item.currency}${priceSuffix(item.priceType)}`
    const override = row.priceOverrideCents != null ? formatPriceInput(row.priceOverrideCents) : ""
    const enabledClass = row.enabled ? "is-on" : ""
    const enabledLabel = row.enabled ? this.t("enabled", "Enabled") : this.t("disabled", "Disabled")
    return `<article class="lt-access" data-lesson-type-id="${esc(item.id)}">
      <div class="lt-access__head">
        <div>
          <div class="lt-row__title">
            <p>${esc(item.name)}</p>
            <span class="status-badge status-badge--neutral">${esc(this.t(item.mode, item.mode))}</span>
          </div>
          <p class="lt-row__meta">${item.defaultDurationMinutes} ${esc(this.t("min", "min"))} · ${esc(priceLabel)}</p>
        </div>
        <div class="lt-row__actions">
          <button type="button" class="lt-toggle ${enabledClass}" data-action="lesson-types#toggleEnabled" data-id="${esc(item.id)}" aria-pressed="${row.enabled}">${esc(enabledLabel)}</button>
          <button type="button" class="lt-icon-btn" data-action="lesson-types#openEdit" data-id="${esc(item.id)}" aria-label="${esc(this.t("edit", "Edit"))}">${ICONS.pencil}</button>
          <button type="button" class="lt-icon-btn" data-action="lesson-types#askDelete" data-id="${esc(item.id)}" aria-label="${esc(this.t("delete", "Delete"))}">${ICONS.trash}</button>
        </div>
      </div>
      ${row.enabled ? `<label class="lt-override">
        <span>${esc(this.t("price_override", "Teacher price override"))}</span>
        <span class="lt-override__row">
          <input type="text" inputmode="decimal" value="${esc(override)}" placeholder="${esc(formatPriceInput(item.defaultPriceCents))}" data-action="input->lesson-types#changeOverride" data-id="${esc(item.id)}">
          <span>${esc(item.currency)}</span>
        </span>
        <small>${esc(this.t("price_override_hint", "Leave blank to use the default price"))} (${esc(priceLabel)}).</small>
      </label>` : ""}
    </article>`
  }

  renderReadonly() {
    if (!this.hasAccessListTarget) return
    const rows = getEffectiveLessonTypesForTeacher(this.teacherIdValue, this.teacherEmailValue)
    if (!rows.length) {
      this.accessListTarget.innerHTML = "—"
      return
    }
    const chips = rows.map((row) => {
      const item = row.lessonType
      const extra = row.enabled
        ? ` · ${formatMoney(row.effectivePriceCents, row.effectiveCurrency)}${priceSuffix(item.priceType)}`
        : ` · ${this.t("disabled", "Disabled")}`
      return `<li class="lt-chip ${row.enabled ? "" : "is-off"}">${esc(item.name)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}${esc(extra)}</li>`
    }).join("")
    const manage = this.editUrlValue
      ? `<a class="lt-manage-link" href="${esc(this.editUrlValue)}">${esc(this.t("manage", "Manage lesson types"))}</a>`
      : ""
    this.accessListTarget.innerHTML = `<ul class="lt-chips">${chips}</ul>${manage}`
  }

  openNew() {
    this.dialogTargetId = "new"
    this.fillDialog(null)
    this.showDialog()
  }

  openEdit(event) {
    const id = event.currentTarget.dataset.id
    const item = listLessonTypes().find((row) => row.id === id)
    if (!item) return
    this.dialogTargetId = id
    this.fillDialog(item)
    this.showDialog()
  }

  fillDialog(item) {
    if (this.hasDialogTitleTarget) {
      this.dialogTitleTarget.textContent = item
        ? this.t("edit_title", "Edit lesson type")
        : this.t("add_title", "Add lesson type")
    }
    this.nameTarget.value = item?.name || ""
    this.modeTarget.value = item?.mode || "individual"
    this.priceTypeTarget.value = item?.priceType || "per_lesson"
    this.durationTarget.value = item?.defaultDurationMinutes || 60
    this.priceTarget.value = item ? formatPriceInput(item.defaultPriceCents) : ""
    this.currencyTarget.value = item?.currency || this.defaultCurrencyValue || "UAH"
    if (this.hasDescriptionTarget) this.descriptionTarget.value = item?.description || ""
    if (this.hasActiveTarget) this.activeTarget.checked = item ? item.isActive !== false : true
    this.clearDialogErrors()
    this.syncPriceType()
  }

  onModeChange() {
    this.syncPriceType()
  }

  syncPriceType() {
    const individual = this.modeTarget.value !== "group"
    if (individual) this.priceTypeTarget.value = "per_lesson"
    if (this.hasPriceTypeWrapTarget) this.priceTypeWrapTarget.hidden = individual
  }

  showDialog() {
    this.dialogTarget.hidden = false
    this.nameTarget.focus()
  }

  closeDialog() {
    this.dialogTarget.hidden = true
    this.dialogTargetId = null
  }

  clearDialogErrors() {
    if (this.hasFormErrorTarget) {
      this.formErrorTarget.hidden = true
      this.formErrorTarget.textContent = ""
    }
    ;["nameError", "durationError", "priceError"].forEach((name) => {
      if (this[`has${capitalize(name)}Target`]) {
        this[`${name}Target`].hidden = true
        this[`${name}Target`].textContent = ""
      }
    })
  }

  submitDialog(event) {
    event.preventDefault()
    this.clearDialogErrors()
    const name = this.nameTarget.value.trim()
    const duration = Number(this.durationTarget.value)
    const priceCents = parsePriceInput(this.priceTarget.value)
    let invalid = false
    if (!name) {
      this.showFieldError("nameError", this.t("name_blank", "Enter a lesson type name."))
      invalid = true
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      this.showFieldError("durationError", this.t("duration_invalid", "Enter a duration greater than zero."))
      invalid = true
    }
    if (priceCents == null || Number.isNaN(priceCents)) {
      this.showFieldError("priceError", this.t("price_invalid", "Enter zero or a positive price."))
      invalid = true
    }
    if (invalid) return

    const input = {
      name,
      mode: this.modeTarget.value,
      defaultDurationMinutes: duration,
      defaultPriceCents: priceCents,
      currency: this.currencyTarget.value,
      priceType: this.priceTypeTarget.value,
      isActive: this.hasActiveTarget ? this.activeTarget.checked : true,
      description: this.hasDescriptionTarget ? this.descriptionTarget.value.trim() : ""
    }

    const creating = !this.dialogTargetId || this.dialogTargetId === "new"
    const result = creating
      ? createLessonType(input)
      : updateLessonType(this.dialogTargetId, input)

    if (!result.ok) {
      const message = result.message === "duplicate"
        ? this.t("duplicate", "A lesson type with this name already exists.")
        : this.t("invalid", "Check the highlighted fields.")
      if (this.hasFormErrorTarget) {
        this.formErrorTarget.textContent = message
        this.formErrorTarget.hidden = false
      }
      return
    }

    this.closeDialog()
    this.render()
    if (this.modeValue === "teacher") this.persistAccess()
    this.showToast(creating
      ? this.t("added", "Lesson type added.")
      : this.t("updated", "Lesson type updated."))
  }

  showFieldError(target, message) {
    if (!this[`has${capitalize(target)}Target`]) return
    this[`${target}Target`].textContent = message
    this[`${target}Target`].hidden = false
  }

  askDelete(event) {
    const id = event.currentTarget.dataset.id
    const item = listLessonTypes().find((row) => row.id === id)
    if (!item) return
    this.pendingDeleteId = id
    if (this.hasDeleteNameTarget) this.deleteNameTarget.textContent = item.name
    this.deleteDialogTarget.hidden = false
  }

  closeDelete() {
    this.pendingDeleteId = null
    this.deleteDialogTarget.hidden = true
  }

  confirmDelete() {
    if (!this.pendingDeleteId) return
    const result = deleteLessonType(this.pendingDeleteId)
    this.closeDelete()
    this.render()
    this.showToast(result.deactivatedInstead
      ? this.t("deactivated", "This lesson type has been used on lessons, so it was deactivated instead of deleted.")
      : this.t("deleted", "Lesson type deleted."))
  }

  reactivate(event) {
    const result = setLessonTypeActive(event.currentTarget.dataset.id, true)
    if (!result.ok) return
    this.render()
    this.showToast(this.t("reactivated", "Lesson type reactivated."))
  }

  toggleEnabled(event) {
    this.persistAccessFromDom(event.currentTarget.dataset.id, { toggle: true })
    this.render()
  }

  changeOverride(event) {
    this.persistAccessFromDom(event.currentTarget.dataset.id, { override: event.currentTarget.value })
  }

  persistAccessFromDom(changedId, patch = {}) {
    const rows = getEffectiveLessonTypesForTeacher(this.teacherIdValue, this.teacherEmailValue).map((row) => {
      const id = row.lessonType.id
      const article = this.hasAccessListTarget
        ? this.accessListTarget.querySelector(`[data-lesson-type-id="${id}"]`)
        : null
      const input = article?.querySelector("input[data-id]")
      let enabled = row.enabled
      let override = row.priceOverrideCents
      if (id === changedId && patch.toggle) enabled = !enabled
      if (id === changedId && patch.override != null) {
        const cents = parsePriceInput(patch.override)
        override = patch.override.trim() === "" || cents == null || Number.isNaN(cents) ? null : cents
      } else if (input && document.activeElement !== input) {
        const cents = parsePriceInput(input.value)
        override = input.value.trim() === "" || cents == null || Number.isNaN(cents) ? null : cents
      }
      return { lessonTypeId: id, enabled, priceOverrideCents: override }
    })
    saveTeacherLessonTypeAccess(this.teacherIdValue, this.teacherEmailValue, rows)
  }

  persistAccess() {
    if (this.modeValue !== "teacher") return
    this.persistAccessFromDom(null)
  }

  saveProfile(event) {
    event.preventDefault()
    this.showToast(this.t("profile_saved", "Profile saved."))
  }

  onDefaultCurrencyChange(event) {
    this.defaultCurrencyValue = event.currentTarget.value
  }

  validateAccess(event) {
    if (this.modeValue !== "teacher") return
    this.persistAccess()
    if (!this.requireActiveValue) return
    const rows = getEffectiveLessonTypesForTeacher(this.teacherIdValue, this.teacherEmailValue)
    if (rows.length && !rows.some((row) => row.enabled)) {
      event.preventDefault()
      if (this.hasListErrorTarget) {
        this.listErrorTarget.textContent = this.t("need_one", "Enable at least one lesson type for an active teacher.")
        this.listErrorTarget.hidden = false
      }
    }
  }
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export { DURATIONS, CURRENCIES }
