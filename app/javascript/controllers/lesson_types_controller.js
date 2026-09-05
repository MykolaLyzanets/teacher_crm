import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"
import { closeModal } from "../lib/modal"
import {
  addPendingSubject,
  createLessonType,
  deleteLessonType,
  deleteSubject,
  formatMoney,
  formatPriceInput,
  getEffectiveLessonTypesForTeacher,
  initLessonTypesStore,
  kindDisplayName,
  listActiveLessonTypes,
  listLessonTypes,
  listPendingSubjects,
  parsePriceInput,
  priceSuffix,
  removePendingSubject,
  renameSubject,
  saveTeacherLessonTypeAccess,
  setLessonTypeActive,
  updateLessonType
} from "../lib/lesson_types_store"

const DURATIONS = [30, 45, 60, 90, 120]
const CURRENCIES = ["UAH", "EUR", "USD", "GBP", "PLN"]
const KINDS = ["individual", "group", "trial", "custom"]

const ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/></svg>'
}

export default class extends Controller {
  static targets = [
    "toast",
    "seedJson",
    "list",
    "empty",
    "accessList",
    "listError",
    "newSubject",
    "dialog",
    "dialogTitle",
    "dialogSubject",
    "dialogSubmit",
    "formError",
    "kind",
    "name",
    "customNameWrap",
    "mode",
    "modeWrap",
    "priceTypeWrap",
    "priceType",
    "duration",
    "price",
    "currency",
    "free",
    "freeHint",
    "perStudentHint",
    "description",
    "active",
    "nameError",
    "durationError",
    "priceError",
    "deleteDialog",
    "deleteName",
    "subjectDeleteDialog",
    "subjectDeleteName"
  ]

  static values = {
    i18n: Object,
    mode: { type: String, default: "catalog" },
    teacherId: String,
    teacherEmail: String,
    defaultCurrency: { type: String, default: "UAH" },
    requireActive: { type: Boolean, default: false },
    editUrl: String,
    dialogUrl: String,
    deleteDialogUrl: String,
    subjectDeleteDialogUrl: String
  }

  connect() {
    this.renamingSubject = null
    this.dialogTargetId = null
    this.dialogSubjectName = ""
    this.pendingDeleteId = null
    this.pendingDeleteSubject = null
    try {
      initLessonTypesStore(this.readSeed())
    } catch (error) {
      console.error("lesson-types seed", error)
    }
    try {
      this.render()
    } catch (error) {
      console.error("lesson-types render", error)
    }
  }

  disconnect() {
    if (this.hasDialogTarget) closeModal(this.dialogTarget)
    if (this.hasDeleteDialogTarget) closeModal(this.deleteDialogTarget)
    if (this.hasSubjectDeleteDialogTarget) closeModal(this.subjectDeleteDialogTarget)
  }

  readSeed() {
    if (!this.hasSeedJsonTarget) return {}
    const raw = (this.seedJsonTarget.value || this.seedJsonTarget.textContent || "").trim()
    if (!raw) return {}
    try {
      return JSON.parse(raw)
    } catch (error) {
      console.error("lesson-types seed json", error)
      return {}
    }
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

  catalogForMode() {
    return this.modeValue === "teacher" ? listActiveLessonTypes() : listLessonTypes()
  }

  subjectNames() {
    const names = [...new Set(this.catalogForMode().map((item) => item.subjectName))]
    listPendingSubjects().forEach((pending) => {
      if (!names.some((name) => name.toLowerCase() === pending.toLowerCase())) names.push(pending)
    })
    return names
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
    const subjects = this.subjectNames()
    if (this.hasEmptyTarget) this.emptyTarget.hidden = subjects.length > 0
    this.listTarget.hidden = subjects.length === 0
    this.listTarget.innerHTML = subjects.map((subjectName) => this.subjectCard(subjectName, "catalog")).join("")
  }

  renderTeacherAccess() {
    if (!this.hasAccessListTarget) return
    const subjects = this.subjectNames()
    if (!subjects.length) {
      this.accessListTarget.innerHTML = `<p class="lt-empty-inline">${esc(this.t("none_yet", "No lessons yet — add the first one below."))}</p>`
      return
    }
    this.accessListTarget.innerHTML = subjects.map((subjectName) => this.subjectCard(subjectName, "teacher")).join("")
  }

  subjectCard(subjectName, mode) {
    const types = this.catalogForMode().filter((item) => item.subjectName === subjectName)
    const rows = mode === "teacher"
      ? getEffectiveLessonTypesForTeacher(this.teacherIdValue, this.teacherEmailValue)
      : types.map((lessonType) => ({ lessonType }))
    const body = types.map((lessonType) => {
      if (mode === "teacher") {
        const row = rows.find((item) => item.lessonType.id === lessonType.id)
        return row ? this.accessRow(row) : ""
      }
      return this.catalogRow(lessonType)
    }).join("")

    return `<article class="lt-subject">
      ${this.subjectHeader(subjectName, types.length, mode)}
      ${body ? `<div class="lt-subject__types">${body}</div>` : ""}
      <button type="button" class="lt-add-type" data-action="lesson-types#openNewForSubject" data-subject="${esc(subjectName)}">
        ${ICONS.plus}
        ${esc(this.t("add_lesson_type", "Add lesson type"))}
      </button>
    </article>`
  }

  subjectHeader(subjectName, typeCount, mode) {
    if (mode !== "teacher") {
      return `<p class="lt-subject__name">${esc(subjectName)}</p>`
    }
    if (this.renamingSubject === subjectName) {
      return `<div class="lt-subject__rename">
                    <input type="text" value="${esc(subjectName)}" aria-label="${esc(this.t("lesson_name", "Lesson name"))}" data-role="rename-input" data-action="keydown.enter->lesson-types#confirmRename">
        <button type="button" class="lt-rename-save" data-action="lesson-types#confirmRename">${esc(this.t("save_rename", "Save"))}</button>
        <button type="button" class="lt-icon-btn" data-action="lesson-types#cancelRename" aria-label="${esc(this.t("cancel_rename", "Cancel rename"))}">${ICONS.x}</button>
      </div>`
    }
    return `<div class="lt-subject__head">
      <p class="lt-subject__name">${esc(subjectName)}</p>
      <div class="lt-row__actions">
        <button type="button" class="lt-icon-btn" title="${esc(this.t("rename_lesson", "Rename lesson"))}" aria-label="${esc(this.t("rename_lesson", "Rename lesson"))}: ${esc(subjectName)}" data-action="lesson-types#startRename" data-subject="${esc(subjectName)}">${ICONS.pencil}</button>
        <button type="button" class="lt-icon-btn lt-icon-btn--danger" title="${esc(this.t("delete_lesson", "Delete lesson"))}" aria-label="${esc(this.t("delete_lesson", "Delete lesson"))}: ${esc(subjectName)}" data-action="lesson-types#askDeleteSubject" data-subject="${esc(subjectName)}" data-count="${typeCount}">${ICONS.trash}</button>
      </div>
    </div>`
  }

  catalogRow(item) {
    const price = item.isFree
      ? this.t("free", "Free")
      : `${formatMoney(item.defaultPriceCents, item.currency)}${priceSuffix(item.priceType)}`
    const mode = this.t(item.mode, item.mode)
    const status = item.isActive ? this.t("active", "Active") : this.t("inactive", "Inactive")
    const statusClass = item.isActive ? "olive" : "neutral"
    const deleteBtn = item.isActive
      ? `<button type="button" class="lt-icon-btn lt-icon-btn--danger" data-action="lesson-types#askDelete" data-id="${esc(item.id)}" aria-label="${esc(this.t("delete", "Delete"))}">${ICONS.trash}</button>`
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

  accessRow(row) {
    const item = row.lessonType
    const priceLabel = item.isFree
      ? this.t("free", "Free")
      : `${formatPriceInput(item.defaultPriceCents)} ${item.currency}${priceSuffix(item.priceType)}`
    const override = row.priceOverrideCents != null ? formatPriceInput(row.priceOverrideCents) : ""
    const enabledClass = row.enabled ? "is-on" : ""
    const enabledLabel = row.enabled ? this.t("enabled", "Enabled") : this.t("disabled", "Disabled")
    const overrideBlock = row.enabled && !item.isFree ? `<label class="lt-override">
        <span>${esc(this.t("price_override", "Teacher price override"))}</span>
        <span class="lt-override__row">
          <input type="text" inputmode="decimal" value="${esc(override)}" placeholder="${esc(formatPriceInput(item.defaultPriceCents))}" data-action="input->lesson-types#changeOverride" data-id="${esc(item.id)}">
          <span>${esc(item.currency)}</span>
        </span>
      </label>` : ""
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
          <button type="button" class="lt-icon-btn lt-icon-btn--danger" data-action="lesson-types#askDelete" data-id="${esc(item.id)}" aria-label="${esc(this.t("delete", "Delete"))}">${ICONS.trash}</button>
        </div>
      </div>
      ${overrideBlock}
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
        ? (item.isFree
          ? ` · ${this.t("free", "Free")}`
          : ` · ${formatMoney(row.effectivePriceCents, row.effectiveCurrency)}${priceSuffix(item.priceType)}`)
        : ` · ${this.t("disabled", "Disabled")}`
      const label = item.subjectName ? `${item.subjectName} · ${item.name}` : item.name
      return `<li class="lt-chip ${row.enabled ? "" : "is-off"}">${esc(label)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}${esc(extra)}</li>`
    }).join("")
    const manage = this.editUrlValue
      ? `<a class="lt-manage-link" href="${esc(this.editUrlValue)}">${esc(this.t("manage", "Manage lesson types"))}</a>`
      : ""
    this.accessListTarget.innerHTML = `<ul class="lt-chips">${chips}</ul>${manage}`
  }

  newSubjectInput() {
    if (this.hasNewSubjectTarget) return this.newSubjectTarget
    return this.element.querySelector("[data-role='new-subject']")
  }

  addSubject(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    const input = this.newSubjectInput()
    const name = (input?.value || "").trim().replace(/\s+/g, " ")
    if (!name) {
      input?.focus()
      this.showToast(this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    const result = addPendingSubject(name)
    if (!result.ok) {
      if (input) input.value = ""
      input?.focus()
      this.showToast(this.t("duplicate_lesson", "A lesson with this name already exists."))
      this.safeRender()
      return
    }
    if (input) input.value = ""
    this.safeRender()
    this.showToast(this.t("lesson_added", "Lesson added."))
    this.openNewForSubject({
      preventDefault() {},
      currentTarget: { dataset: { subject: result.name } }
    })
  }

  safeRender() {
    try {
      this.render()
    } catch (error) {
      console.error("lesson-types render", error)
    }
  }

  startRename(event) {
    this.renamingSubject = event.currentTarget.dataset.subject
    this.render()
    const input = this.element.querySelector("[data-role='rename-input']")
    input?.focus()
    input?.select()
  }

  cancelRename() {
    this.renamingSubject = null
    this.render()
  }

  confirmRename(event) {
    event?.preventDefault?.()
    if (!this.renamingSubject) return
    const input = this.element.querySelector("[data-role='rename-input']")
    const nextName = (input?.value || "").trim().replace(/\s+/g, " ")
    if (!nextName) {
      this.showToast(this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    const oldName = this.renamingSubject
    const result = renameSubject(oldName, nextName)
    if (!result.ok) {
      this.showToast(result.message === "duplicate_lesson"
        ? this.t("duplicate_lesson", "A lesson with this name already exists.")
        : this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    this.renamingSubject = null
    this.render()
    this.showToast(this.t("lesson_renamed", "Lesson renamed."))
  }

  askDeleteSubject(event) {
    const subjectName = event.currentTarget.dataset.subject
    const count = Number(event.currentTarget.dataset.count || 0)
    if (count === 0) {
      removePendingSubject(subjectName)
      this.render()
      return
    }
    this.pendingDeleteSubject = subjectName
    this.loadFrame(this.subjectDeleteDialogUrlValue, { subject: subjectName }, "lesson_subject_delete_dialog")
  }

  closeSubjectDelete() {
    this.pendingDeleteSubject = null
    this.dismissFrame(this.subjectDeleteDialogUrlValue, "lesson_subject_delete_dialog")
  }

  confirmDeleteSubject() {
    if (!this.pendingDeleteSubject) return
    deleteSubject(this.pendingDeleteSubject)
    this.closeSubjectDelete()
    this.render()
    if (this.modeValue === "teacher") this.persistAccess()
    this.showToast(this.t("lesson_deleted", "Lesson deleted."))
  }

  openNew() {
    const subjects = this.subjectNames()
    this.openNewForSubject({ currentTarget: { dataset: { subject: subjects[0] || "" } } })
  }

  openNewForSubject(event) {
    event?.preventDefault?.()
    this.dialogTargetId = "new"
    this.dialogSubjectName = event.currentTarget.dataset.subject || ""
    if (!this.dialogSubjectName) {
      this.showToast(this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    this.loadFrame(this.dialogUrlValue, { subject: this.dialogSubjectName }, "lesson_type_dialog")
  }

  openEdit(event) {
    const id = event.currentTarget.dataset.id
    const item = listLessonTypes().find((row) => row.id === id)
    if (!item) return
    this.dialogTargetId = id
    this.dialogSubjectName = item.subjectName
    this.loadFrame(this.dialogUrlValue, { subject: item.subjectName, id }, "lesson_type_dialog")
  }

  dialogTargetConnected() {
    this.dialogSubjectName = this.dialogTarget.dataset.subject || this.dialogSubjectName
    this.dialogTargetId = this.dialogTarget.dataset.id || this.dialogTargetId || "new"
    const item = this.dialogTargetId !== "new"
      ? listLessonTypes().find((row) => row.id === this.dialogTargetId)
      : null
    this.fillDialog(item)
  }

  dialogTargetDisconnected() {
    this.dialogTargetId = null
    this.dialogSubjectName = ""
  }

  fillDialog(item) {
    if (this.hasDialogTitleTarget) {
      this.dialogTitleTarget.textContent = item
        ? this.t("edit_title", "Edit lesson type")
        : this.t("add_title", "Add lesson type")
    }
    if (this.hasDialogSubjectTarget) this.dialogSubjectTarget.textContent = this.dialogSubjectName
    if (this.hasDialogSubmitTarget) {
      this.dialogSubmitTarget.textContent = item
        ? this.t("save_changes", "Save changes")
        : this.t("add_lesson_type", "Add lesson type")
    }
    if (this.hasKindTarget) this.kindTarget.value = item?.kind || "individual"
    if (this.hasNameTarget) this.nameTarget.value = item?.kind === "custom" ? (item.name || "") : ""
    if (this.hasModeTarget) this.modeTarget.value = item?.mode || "individual"
    if (this.hasPriceTypeTarget) this.priceTypeTarget.value = item?.priceType || "per_lesson"
    if (this.hasDurationTarget) this.durationTarget.value = item?.defaultDurationMinutes || 60
    if (this.hasPriceTarget) this.priceTarget.value = item && !item.isFree ? formatPriceInput(item.defaultPriceCents) : ""
    if (this.hasCurrencyTarget) this.currencyTarget.value = item?.currency || this.defaultCurrencyValue || "UAH"
    if (this.hasDescriptionTarget) this.descriptionTarget.value = item?.description || ""
    if (this.hasActiveTarget) this.activeTarget.checked = item ? item.isActive !== false : true
    if (this.hasFreeTarget) this.freeTarget.checked = item ? Boolean(item.isFree) : false
    this.clearDialogErrors()
    this.syncKindFields()
  }

  onKindChange() {
    const kind = this.kindTarget.value
    if (kind === "group") this.modeTarget.value = "group"
    if (kind === "individual" || kind === "trial") this.modeTarget.value = "individual"
    if (kind === "trial" && (!this.dialogTargetId || this.dialogTargetId === "new")) {
      this.durationTarget.value = 30
      if (this.hasFreeTarget) this.freeTarget.checked = true
    }
    this.syncKindFields()
  }

  onModeChange() {
    this.syncKindFields()
  }

  toggleFree() {
    this.syncKindFields()
  }

  syncKindFields() {
    if (!this.hasKindTarget || !this.hasModeTarget || !this.hasPriceTypeTarget || !this.hasPriceTarget || !this.hasCurrencyTarget) return
    const kind = this.kindTarget.value
    const custom = kind === "custom"
    const group = this.modeTarget.value === "group" || kind === "group"
    if (kind === "group") this.modeTarget.value = "group"
    if (kind === "individual" || kind === "trial") this.modeTarget.value = "individual"
    if (!group) this.priceTypeTarget.value = "per_lesson"
    if (this.hasCustomNameWrapTarget) this.customNameWrapTarget.hidden = !custom
    if (this.hasModeWrapTarget) this.modeWrapTarget.hidden = !custom
    if (this.hasPriceTypeWrapTarget) this.priceTypeWrapTarget.hidden = this.modeTarget.value !== "group"
    const isFree = this.hasFreeTarget && this.freeTarget.checked
    this.priceTarget.disabled = isFree
    this.currencyTarget.disabled = isFree
    if (isFree) this.priceTarget.value = ""
    if (this.hasFreeHintTarget) this.freeHintTarget.hidden = !isFree
    if (this.hasPerStudentHintTarget) {
      this.perStudentHintTarget.hidden = isFree || this.priceTypeTarget.value !== "per_student"
    }
  }

  showDialog() {
    this.loadFrame(this.dialogUrlValue, {
      subject: this.dialogSubjectName,
      id: this.dialogTargetId !== "new" ? this.dialogTargetId : ""
    }, "lesson_type_dialog")
  }

  closeDialog() {
    this.dialogTargetId = null
    this.dialogSubjectName = ""
    this.dismissFrame(this.dialogUrlValue, "lesson_type_dialog")
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
    const kind = this.kindTarget.value
    const customName = this.nameTarget.value.trim()
    const name = kind === "custom" ? customName : (this.t(kind, kindDisplayName(kind)))
    const duration = Number(this.durationTarget.value)
    const isFree = this.hasFreeTarget && this.freeTarget.checked
    const priceCents = isFree ? 0 : parsePriceInput(this.priceTarget.value)
    let invalid = false
    if (kind === "custom" && !customName) {
      this.showFieldError("nameError", this.t("custom_name_blank", "Enter a name for this custom lesson type."))
      invalid = true
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      this.showFieldError("durationError", this.t("duration_invalid", "Enter a duration greater than zero."))
      invalid = true
    }
    if (!isFree && (priceCents == null || Number.isNaN(priceCents))) {
      this.showFieldError("priceError", this.t("price_invalid", "Enter zero or a positive price."))
      invalid = true
    }
    if (!this.dialogSubjectName) {
      if (this.hasFormErrorTarget) {
        this.formErrorTarget.textContent = this.t("lesson_name_blank", "Enter a lesson name.")
        this.formErrorTarget.hidden = false
      }
      invalid = true
    }
    if (invalid) return

    const input = {
      subjectName: this.dialogSubjectName,
      kind,
      name,
      mode: this.modeTarget.value,
      defaultDurationMinutes: duration,
      defaultPriceCents: priceCents,
      currency: this.currencyTarget.value,
      priceType: this.priceTypeTarget.value,
      isFree,
      isActive: this.hasActiveTarget ? this.activeTarget.checked : true,
      description: this.hasDescriptionTarget ? this.descriptionTarget.value.trim() : ""
    }

    const creating = !this.dialogTargetId || this.dialogTargetId === "new"
    const result = creating
      ? createLessonType(input)
      : updateLessonType(this.dialogTargetId, input)

    if (!result.ok) {
      const message = result.message === "duplicate"
        ? this.t("duplicate", "This lesson already has a type with this name.")
        : result.message === "name"
          ? this.t("name_blank", "Enter a lesson type name.")
          : this.t("invalid", "Check the highlighted fields.")
      if (this.hasFormErrorTarget) {
        this.formErrorTarget.textContent = message
        this.formErrorTarget.hidden = false
      }
      return
    }

    removePendingSubject(this.dialogSubjectName)
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
    this.loadFrame(this.deleteDialogUrlValue, { id, name: item.name }, "lesson_type_delete_dialog")
  }

  closeDelete() {
    this.pendingDeleteId = null
    this.dismissFrame(this.deleteDialogUrlValue, "lesson_type_delete_dialog")
  }

  deleteDialogTargetConnected() {
    this.pendingDeleteId = this.deleteDialogTarget.dataset.id || this.pendingDeleteId
  }

  subjectDeleteDialogTargetConnected() {
    this.pendingDeleteSubject = this.subjectDeleteDialogTarget.dataset.subject || this.pendingDeleteSubject
  }

  loadFrame(url, params, frameId) {
    if (!url) return
    const next = new URL(url, window.location.origin)
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value == null || value === "") next.searchParams.delete(key)
      else next.searchParams.set(key, value)
    })
    const href = `${next.pathname}${next.search}`
    const frame = document.getElementById(frameId)
    if (frame) {
      frame.src = href
      return
    }
    Turbo.visit(href, { frame: frameId })
  }

  dismissFrame(url, frameId) {
    this.loadFrame(url, { dismiss: 1 }, frameId)
  }

  confirmDelete() {
    if (!this.pendingDeleteId) return
    const result = deleteLessonType(this.pendingDeleteId)
    this.closeDelete()
    this.render()
    if (this.modeValue === "teacher") this.persistAccess()
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

export { DURATIONS, CURRENCIES, KINDS }
