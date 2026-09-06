import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"
import { closeModal } from "../lib/modal"

const KIND_NAMES = {
  individual: "Individual",
  group: "Group",
  trial: "Trial"
}

const ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
}

export default class extends Controller {
  static targets = [
    "toast",
    "list",
    "empty",
    "accessList",
    "teacherSelect",
    "newSubject",
    "addError",
    "draftPayload",
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
    subjectsUrl: String,
    lessonTypesUrl: String,
    subjectUrl: String,
    typeUrl: String,
    dialogUrl: String,
    deleteDialogUrl: String,
    subjectDeleteDialogUrl: String,
    editUrl: String
  }

  connect() {
    this.subjects = []
    this.renamingSubjectId = null
    this.dialogTargetId = null
    this.dialogSubjectId = ""
    this.dialogSubjectName = ""
    this.pendingDeleteId = null
    this.pendingDeleteSubjectId = null
    this.pendingSeq = 0
    this["addSubject"] = this.addSubject.bind(this)
    this["stopBubble"] = this.stopBubble.bind(this)
    this.loadCatalog()
  }

  disconnect() {
    if (this.hasDialogTarget) closeModal(this.dialogTarget)
    if (this.hasDeleteDialogTarget) closeModal(this.deleteDialogTarget)
    if (this.hasSubjectDeleteDialogTarget) closeModal(this.subjectDeleteDialogTarget)
  }

  drafting() {
    return !this.teacherIdValue && this.hasDraftPayloadTarget
  }

  isDraftRecord(id) {
    return String(id || "").startsWith("pending-")
  }

  nextDraftId(prefix = "pending") {
    this.pendingSeq += 1
    return `${prefix}-${this.pendingSeq}`
  }

  readDraft() {
    if (!this.hasDraftPayloadTarget) return []
    try {
      const parsed = JSON.parse(this.draftPayloadTarget.value || "[]")
      if (!Array.isArray(parsed)) return []
      return parsed.map((subject, index) => {
        const id = subject.id || `pending-${index + 1}`
        return {
          id,
          name: subject.name,
          isActive: subject.isActive !== false,
          lessonTypes: (subject.lessonTypes || subject.lesson_types || []).map((type, typeIndex) => ({
            id: type.id || `pending-type-${index + 1}-${typeIndex + 1}`,
            subjectId: id,
            name: type.name,
            kind: type.kind || "individual",
            mode: type.mode || "individual",
            defaultDurationMinutes: Number(type.defaultDurationMinutes || type.default_duration_minutes || 60),
            isActive: type.isActive !== false
          }))
        }
      })
    } catch {
      return []
    }
  }

  syncDraft() {
    if (!this.hasDraftPayloadTarget) return
    this.draftPayloadTarget.value = JSON.stringify(this.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      isActive: subject.isActive !== false,
      lessonTypes: (subject.lessonTypes || []).map((type) => ({
        id: type.id,
        name: type.name,
        kind: type.kind,
        mode: type.mode,
        defaultDurationMinutes: type.defaultDurationMinutes,
        isActive: type.isActive !== false
      }))
    })))
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

  changeTeacher() {
    if (!this.hasTeacherSelectTarget) return
    this.teacherIdValue = this.teacherSelectTarget.value
    this.loadCatalog()
  }

  async loadCatalog() {
    if (this.drafting()) {
      this.subjects = this.readDraft()
      this.render()
      return
    }
    if (!this.teacherIdValue) {
      this.subjects = []
      this.render()
      return
    }
    try {
      this.subjects = await this.fetchJson(this.subjectsIndexUrl())
      if (!Array.isArray(this.subjects)) this.subjects = []
    } catch (error) {
      console.error("lesson-types load", error)
      this.subjects = []
      this.showToast(this.t("save_failed", "Could not save changes."))
    }
    this.render()
  }

  subjectsIndexUrl() {
    const url = new URL(this.expandUrl(this.subjectsUrlValue, this.teacherIdValue), window.location.origin)
    if (this.modeValue !== "readonly") url.searchParams.set("include_inactive", "1")
    return `${url.pathname}${url.search}`
  }

  render() {
    if (this.modeValue === "readonly") {
      this.renderReadonly()
      return
    }
    this.renderCatalog()
  }

  renderCatalog() {
    if (!this.hasListTarget) return
    if (!this.teacherIdValue && !this.drafting()) {
      if (this.hasEmptyTarget) this.emptyTarget.hidden = true
      this.listTarget.hidden = false
      const message = this.hasTeacherSelectTarget
        ? this.t("select_teacher", "Select a teacher to manage their lessons.")
        : this.t("save_teacher_first", "Save the teacher first to add lessons.")
      this.listTarget.innerHTML = `<p class="lt-empty-inline">${esc(message)}</p>`
      return
    }
    const subjects = this.subjects
    if (this.hasEmptyTarget) this.emptyTarget.hidden = subjects.length > 0
    this.listTarget.hidden = subjects.length === 0
    this.listTarget.innerHTML = subjects.map((subject) => this.subjectCard(subject)).join("")
  }

  renderReadonly() {
    if (!this.hasAccessListTarget) return
    const types = this.subjects.flatMap((subject) =>
      (subject.lessonTypes || []).filter((item) => item.isActive !== false).map((item) => ({
        ...item,
        subjectName: subject.name
      }))
    )
    if (!types.length) {
      this.accessListTarget.innerHTML = "—"
      return
    }
    const chips = types.map((item) => {
      const label = item.subjectName ? `${item.subjectName} · ${item.name}` : item.name
      return `<li class="lt-chip">${esc(label)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}</li>`
    }).join("")
    const manage = this.editUrlValue
      ? `<a class="lt-manage-link" href="${esc(this.editUrlValue)}">${esc(this.t("manage", "Manage lesson types"))}</a>`
      : ""
    this.accessListTarget.innerHTML = `<ul class="lt-chips">${chips}</ul>${manage}`
  }

  subjectCard(subject) {
    const types = subject.lessonTypes || []
    const body = types.map((item) => this.catalogRow(item, subject)).join("")
    return `<article class="lt-subject">
      ${this.subjectHeader(subject, types.length)}
      ${body ? `<div class="lt-subject__types">${body}</div>` : ""}
      <button type="button" class="lt-add-type" data-action="lesson-types#openNewForSubject" data-subject-id="${esc(subject.id)}" data-subject="${esc(subject.name)}">
        ${ICONS.plus}
        ${esc(this.t("add_lesson_type", "Add lesson type"))}
      </button>
    </article>`
  }

  subjectHeader(subject, typeCount) {
    if (this.renamingSubjectId && String(this.renamingSubjectId) === String(subject.id)) {
      return `<div class="lt-subject__rename">
        <input type="text" value="${esc(subject.name)}" aria-label="${esc(this.t("lesson_name", "Lesson name"))}" data-role="rename-input" data-action="keydown.enter->lesson-types#confirmRename">
        <button type="button" class="lt-rename-save" data-action="lesson-types#confirmRename">${esc(this.t("save_rename", "Save"))}</button>
        <button type="button" class="lt-icon-btn" data-action="lesson-types#cancelRename" aria-label="${esc(this.t("cancel_rename", "Cancel rename"))}">${ICONS.x}</button>
      </div>`
    }
    const inactive = subject.isActive === false
    const deleteBtn = inactive
      ? `<button type="button" class="lt-text-btn" data-action="lesson-types#reactivateSubject" data-id="${esc(subject.id)}">${esc(this.t("reactivate", "Reactivate"))}</button>`
      : `<button type="button" class="lt-icon-btn lt-icon-btn--danger" title="${esc(this.t("delete_lesson", "Delete lesson"))}" aria-label="${esc(this.t("delete_lesson", "Delete lesson"))}: ${esc(subject.name)}" data-action="lesson-types#askDeleteSubject" data-id="${esc(subject.id)}" data-subject="${esc(subject.name)}" data-count="${typeCount}">${ICONS.trash}</button>`
    return `<div class="lt-subject__head">
      <p class="lt-subject__name">${esc(subject.name)}${inactive ? ` · ${esc(this.t("inactive", "Inactive"))}` : ""}</p>
      <div class="lt-row__actions">
        <button type="button" class="lt-icon-btn" title="${esc(this.t("rename_lesson", "Rename lesson"))}" aria-label="${esc(this.t("rename_lesson", "Rename lesson"))}: ${esc(subject.name)}" data-action="lesson-types#startRename" data-id="${esc(subject.id)}">${ICONS.pencil}</button>
        ${deleteBtn}
      </div>
    </div>`
  }

  catalogRow(item) {
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
        <p class="lt-row__meta">${esc(mode)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}</p>
      </div>
      <div class="lt-row__actions">
        <button type="button" class="lt-icon-btn" data-action="lesson-types#openEdit" data-id="${esc(item.id)}" aria-label="${esc(this.t("edit", "Edit"))}">${ICONS.pencil}</button>
        ${deleteBtn}
      </div>
    </article>`
  }

  findType(id) {
    for (const subject of this.subjects) {
      const match = (subject.lessonTypes || []).find((item) => String(item.id) === String(id))
      if (match) return { type: match, subject }
    }
    return {}
  }

  findSubject(id) {
    return this.subjects.find((item) => String(item.id) === String(id))
  }

  showAddError(message) {
    if (this.hasAddErrorTarget) {
      this.addErrorTarget.textContent = message
      this.addErrorTarget.hidden = !message
    }
    if (message) this.showToast(message)
  }

  stopBubble() {}

  async addSubject(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    this.showAddError("")
    const input = this.hasNewSubjectTarget ? this.newSubjectTarget : null
    const name = (input?.value || "").trim().replace(/\s+/g, " ")
    if (!name) {
      input?.focus()
      this.showAddError(this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    if (this.subjects.some((subject) => subject.name.toLowerCase() === name.toLowerCase())) {
      this.showAddError(this.t("duplicate_lesson", "A lesson with this name already exists."))
      return
    }
    if (this.drafting()) {
      const subject = { id: this.nextDraftId(), name, isActive: true, lessonTypes: [] }
      this.subjects = [...this.subjects, subject].sort((a, b) => a.name.localeCompare(b.name))
      if (input) input.value = ""
      this.syncDraft()
      this.render()
      this.showToast(this.t("lesson_added", "Lesson added."))
      input?.focus()
      return
    }
    if (!this.teacherIdValue) {
      this.showAddError(this.t("select_teacher", "Select a teacher to manage their lessons."))
      return
    }
    try {
      const subject = await this.sendJson("POST", this.expandUrl(this.subjectsUrlValue, this.teacherIdValue), { name })
      if (input) input.value = ""
      subject.lessonTypes = subject.lessonTypes || []
      this.subjects = [...this.subjects, subject].sort((a, b) => a.name.localeCompare(b.name))
      this.render()
      this.showToast(this.t("lesson_added", "Lesson added."))
      input?.focus()
    } catch (error) {
      this.showAddError(error.message || this.t("duplicate_lesson", "A lesson with this name already exists."))
    }
  }

  startRename(event) {
    this.renamingSubjectId = event.currentTarget.dataset.id
    this.render()
    const input = this.element.querySelector("[data-role='rename-input']")
    input?.focus()
    input?.select()
  }

  cancelRename() {
    this.renamingSubjectId = null
    this.render()
  }

  async confirmRename(event) {
    event?.preventDefault?.()
    if (!this.renamingSubjectId) return
    const input = this.element.querySelector("[data-role='rename-input']")
    const nextName = (input?.value || "").trim().replace(/\s+/g, " ")
    if (!nextName) {
      this.showToast(this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    if (this.drafting() || this.isDraftRecord(this.renamingSubjectId)) {
      if (this.subjects.some((subject) => String(subject.id) !== String(this.renamingSubjectId) && subject.name.toLowerCase() === nextName.toLowerCase())) {
        this.showToast(this.t("duplicate_lesson", "A lesson with this name already exists."))
        return
      }
      this.subjects = this.subjects.map((subject) => (
        String(subject.id) === String(this.renamingSubjectId) ? { ...subject, name: nextName } : subject
      ))
      this.renamingSubjectId = null
      this.syncDraft()
      this.render()
      this.showToast(this.t("lesson_renamed", "Lesson renamed."))
      return
    }
    try {
      const updated = await this.sendJson("PATCH", this.expandUrl(this.subjectUrlValue, this.renamingSubjectId), { name: nextName })
      this.patchSubject(updated)
      this.renamingSubjectId = null
      this.render()
      this.showToast(this.t("lesson_renamed", "Lesson renamed."))
    } catch (error) {
      this.showToast(error.message || this.t("duplicate_lesson", "A lesson with this name already exists."))
    }
  }

  askDeleteSubject(event) {
    const id = event.currentTarget.dataset.id
    const subject = this.findSubject(id)
    if (!subject) return
    this.pendingDeleteSubjectId = id
    this.loadFrame(this.subjectDeleteDialogUrlValue, { subject_id: id, subject: subject.name }, "lesson_subject_delete_dialog")
  }

  closeSubjectDelete() {
    this.pendingDeleteSubjectId = null
    this.dismissFrame(this.subjectDeleteDialogUrlValue, "lesson_subject_delete_dialog")
  }

  async confirmDeleteSubject() {
    if (!this.pendingDeleteSubjectId) return
    if (this.drafting() || this.isDraftRecord(this.pendingDeleteSubjectId)) {
      this.subjects = this.subjects.filter((subject) => String(subject.id) !== String(this.pendingDeleteSubjectId))
      this.closeSubjectDelete()
      this.syncDraft()
      this.render()
      this.showToast(this.t("lesson_deleted", "Lesson deleted."))
      return
    }
    try {
      const updated = await this.sendJson("PATCH", this.expandUrl(this.subjectUrlValue, this.pendingDeleteSubjectId), { isActive: false })
      this.patchSubject(updated)
      this.closeSubjectDelete()
      this.render()
      this.showToast(this.t("lesson_deleted", "Lesson deleted."))
    } catch (error) {
      this.showToast(error.message || this.t("save_failed", "Could not save changes."))
    }
  }

  async reactivateSubject(event) {
    try {
      const updated = await this.sendJson("PATCH", this.expandUrl(this.subjectUrlValue, event.currentTarget.dataset.id), { isActive: true })
      this.patchSubject(updated)
      this.render()
      this.showToast(this.t("reactivated", "Lesson type reactivated."))
    } catch (error) {
      this.showToast(error.message || this.t("save_failed", "Could not save changes."))
    }
  }

  openNewForSubject(event) {
    event?.preventDefault?.()
    this.dialogTargetId = "new"
    this.dialogSubjectId = event.currentTarget.dataset.subjectId || ""
    this.dialogSubjectName = event.currentTarget.dataset.subject || ""
    if (!this.dialogSubjectId) {
      this.showToast(this.t("lesson_name_blank", "Enter a lesson name."))
      return
    }
    this.loadFrame(this.dialogUrlValue, { subject_id: this.dialogSubjectId, subject: this.dialogSubjectName }, "lesson_type_dialog")
  }

  openEdit(event) {
    const found = this.findType(event.currentTarget.dataset.id)
    if (!found.type) return
    this.dialogTargetId = found.type.id
    this.dialogSubjectId = found.subject.id
    this.dialogSubjectName = found.subject.name
    this.loadFrame(this.dialogUrlValue, {
      subject_id: found.subject.id,
      subject: found.subject.name,
      id: found.type.id
    }, "lesson_type_dialog")
  }

  dialogTargetConnected() {
    this.dialogSubjectName = this.dialogTarget.dataset.subject || this.dialogSubjectName
    this.dialogSubjectId = this.dialogTarget.dataset.subjectId || this.dialogSubjectId
    this.dialogTargetId = this.dialogTarget.dataset.id || this.dialogTargetId || "new"
    const found = this.dialogTargetId !== "new" ? this.findType(this.dialogTargetId) : {}
    this.fillDialog(found.type)
  }

  dialogTargetDisconnected() {
    this.dialogTargetId = null
    this.dialogSubjectId = ""
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
    if (this.hasPriceTypeTarget) this.priceTypeTarget.value = "per_lesson"
    if (this.hasDurationTarget) this.durationTarget.value = item?.defaultDurationMinutes || 60
    if (this.hasPriceTarget) this.priceTarget.value = ""
    if (this.hasCurrencyTarget) this.currencyTarget.value = "UAH"
    if (this.hasDescriptionTarget) this.descriptionTarget.value = ""
    if (this.hasActiveTarget) this.activeTarget.checked = item ? item.isActive !== false : true
    if (this.hasFreeTarget) this.freeTarget.checked = false
    this.clearDialogErrors()
    this.syncKindFields()
  }

  onKindChange() {
    const kind = this.kindTarget.value
    if (kind === "group") this.modeTarget.value = "group"
    if (kind === "individual" || kind === "trial") this.modeTarget.value = "individual"
    if (kind === "trial" && (!this.dialogTargetId || this.dialogTargetId === "new")) {
      this.durationTarget.value = 30
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
    if (!this.hasKindTarget || !this.hasModeTarget) return
    const kind = this.kindTarget.value
    const custom = kind === "custom"
    if (kind === "group") this.modeTarget.value = "group"
    if (kind === "individual" || kind === "trial") this.modeTarget.value = "individual"
    if (this.hasCustomNameWrapTarget) this.customNameWrapTarget.hidden = !custom
    if (this.hasModeWrapTarget) this.modeWrapTarget.hidden = !custom
    if (this.hasPriceTypeWrapTarget) this.priceTypeWrapTarget.hidden = this.modeTarget.value !== "group"
    const isFree = this.hasFreeTarget && this.freeTarget.checked
    if (this.hasPriceTarget) this.priceTarget.disabled = isFree
    if (this.hasCurrencyTarget) this.currencyTarget.disabled = isFree
    if (isFree && this.hasPriceTarget) this.priceTarget.value = ""
    if (this.hasFreeHintTarget) this.freeHintTarget.hidden = !isFree
    if (this.hasPerStudentHintTarget) {
      this.perStudentHintTarget.hidden = isFree || (this.hasPriceTypeTarget && this.priceTypeTarget.value !== "per_student")
    }
  }

  closeDialog() {
    this.dialogTargetId = null
    this.dialogSubjectId = ""
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

  async submitDialog(event) {
    event.preventDefault()
    this.clearDialogErrors()
    const kind = this.kindTarget.value
    const customName = this.nameTarget.value.trim()
    const name = kind === "custom" ? customName : (this.t(kind, KIND_NAMES[kind] || kind))
    const duration = Number(this.durationTarget.value)
    let invalid = false
    if (kind === "custom" && !customName) {
      this.showFieldError("nameError", this.t("custom_name_blank", "Enter a name for this custom lesson type."))
      invalid = true
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      this.showFieldError("durationError", this.t("duration_invalid", "Enter a duration greater than zero."))
      invalid = true
    }
    if (!this.dialogSubjectId) {
      if (this.hasFormErrorTarget) {
        this.formErrorTarget.textContent = this.t("lesson_name_blank", "Enter a lesson name.")
        this.formErrorTarget.hidden = false
      }
      invalid = true
    }
    if (invalid) return

    const payload = {
      name,
      kind,
      mode: this.hasModeTarget ? this.modeTarget.value : "individual",
      defaultDurationMinutes: duration,
      isActive: this.hasActiveTarget ? this.activeTarget.checked : true
    }

    if (this.drafting() || this.isDraftRecord(this.dialogSubjectId)) {
      const creating = !this.dialogTargetId || this.dialogTargetId === "new"
      const saved = {
        ...payload,
        id: creating ? this.nextDraftId("pending-type") : this.dialogTargetId,
        subjectId: this.dialogSubjectId
      }
      this.upsertType(saved)
      this.closeDialog()
      this.syncDraft()
      this.render()
      this.showToast(creating
        ? this.t("added", "Lesson type added.")
        : this.t("updated", "Lesson type updated."))
      return
    }

    try {
      const creating = !this.dialogTargetId || this.dialogTargetId === "new"
      const saved = creating
        ? await this.sendJson("POST", this.expandUrl(this.lessonTypesUrlValue, this.dialogSubjectId), payload)
        : await this.sendJson("PATCH", this.expandUrl(this.typeUrlValue, this.dialogTargetId), payload)
      this.upsertType(saved)
      this.closeDialog()
      this.render()
      this.showToast(creating
        ? this.t("added", "Lesson type added.")
        : this.t("updated", "Lesson type updated."))
    } catch (error) {
      if (this.hasFormErrorTarget) {
        this.formErrorTarget.textContent = error.message || this.t("duplicate", "This lesson already has a type with this name.")
        this.formErrorTarget.hidden = false
      }
    }
  }

  showFieldError(target, message) {
    if (!this[`has${capitalize(target)}Target`]) return
    this[`${target}Target`].textContent = message
    this[`${target}Target`].hidden = false
  }

  askDelete(event) {
    const found = this.findType(event.currentTarget.dataset.id)
    if (!found.type) return
    this.pendingDeleteId = found.type.id
    this.loadFrame(this.deleteDialogUrlValue, { id: found.type.id, name: found.type.name }, "lesson_type_delete_dialog")
  }

  closeDelete() {
    this.pendingDeleteId = null
    this.dismissFrame(this.deleteDialogUrlValue, "lesson_type_delete_dialog")
  }

  deleteDialogTargetConnected() {
    this.pendingDeleteId = this.deleteDialogTarget.dataset.id || this.pendingDeleteId
  }

  subjectDeleteDialogTargetConnected() {
    this.pendingDeleteSubjectId = this.subjectDeleteDialogTarget.dataset.subjectId || this.pendingDeleteSubjectId
  }

  async confirmDelete() {
    if (!this.pendingDeleteId) return
    if (this.drafting() || this.isDraftRecord(this.pendingDeleteId)) {
      this.subjects = this.subjects.map((subject) => ({
        ...subject,
        lessonTypes: (subject.lessonTypes || []).filter((item) => String(item.id) !== String(this.pendingDeleteId))
      }))
      this.closeDelete()
      this.syncDraft()
      this.render()
      this.showToast(this.t("deactivated", "This lesson type has been deactivated."))
      return
    }
    try {
      const updated = await this.sendJson("PATCH", this.expandUrl(this.typeUrlValue, this.pendingDeleteId), { isActive: false })
      this.upsertType(updated)
      this.closeDelete()
      this.render()
      this.showToast(this.t("deactivated", "This lesson type has been deactivated."))
    } catch (error) {
      this.showToast(error.message || this.t("save_failed", "Could not save changes."))
    }
  }

  async reactivate(event) {
    try {
      const updated = await this.sendJson("PATCH", this.expandUrl(this.typeUrlValue, event.currentTarget.dataset.id), { isActive: true })
      this.upsertType(updated)
      this.render()
      this.showToast(this.t("reactivated", "Lesson type reactivated."))
    } catch (error) {
      this.showToast(error.message || this.t("save_failed", "Could not save changes."))
    }
  }

  patchSubject(updated) {
    this.subjects = this.subjects.map((subject) => {
      if (String(subject.id) !== String(updated.id)) return subject
      return { ...subject, ...updated, lessonTypes: subject.lessonTypes }
    })
  }

  upsertType(type) {
    this.subjects = this.subjects.map((subject) => {
      if (String(subject.id) !== String(type.subjectId)) return subject
      const types = [...(subject.lessonTypes || [])]
      const index = types.findIndex((item) => String(item.id) === String(type.id))
      if (index >= 0) types.splice(index, 1, type)
      else types.push(type)
      types.sort((a, b) => a.name.localeCompare(b.name))
      return { ...subject, lessonTypes: types }
    })
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

  expandUrl(template, id) {
    return String(template || "").replace("__ID__", encodeURIComponent(id))
  }

  apiHeaders(jsonBody = false) {
    const headers = { Accept: "application/json" }
    if (jsonBody) headers["Content-Type"] = "application/json"
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (token) headers["X-CSRF-Token"] = token
    return headers
  }

  async fetchJson(url) {
    const response = await fetch(url, { credentials: "same-origin", headers: this.apiHeaders() })
    const data = await response.json().catch(() => ([]))
    if (!response.ok) throw new Error(Array.isArray(data.errors) ? data.errors.join(" ") : (data.error || this.t("save_failed", "Could not save changes.")))
    return data
  }

  async sendJson(method, url, body) {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: this.apiHeaders(true),
      body: JSON.stringify(body)
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(Array.isArray(data.errors) ? data.errors.join(" ") : (data.error || this.t("save_failed", "Could not save changes.")))
    }
    return data
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
