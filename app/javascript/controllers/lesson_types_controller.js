import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"
import { closeModal, openModal } from "../lib/modal"
import { formatMoney } from "../lib/money"

const DELIVERY_MODES = ["online", "in_person"]

const ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
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
    "name",
    "namePresets",
    "modeRadio",
    "participationHint",
    "duration",
    "description",
    "active",
    "nameError",
    "durationError",
    "deleteDialog",
    "deleteName",
    "subjectDeleteDialog",
    "subjectDeleteName",
    "assignmentList",
    "offeringDialog",
    "offeringTitle",
    "offeringDescription",
    "offeringSubjectField",
    "offeringSubject",
    "offeringTypes",
    "offeringChips",
    "offeringEmpty",
    "offeringNoSubjects",
    "offeringError",
    "offeringSubmit",
    "offeringAddBtn"
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
    editUrl: String,
    workspaceCatalogUrl: String,
    canManage: { type: Boolean, default: true }
  }

  connect() {
    this.subjects = []
    this.workspaceCatalog = []
    this.offeringEditingSubject = null
    this.offeringModesByType = {}
    this.renamingSubjectId = null
    this.dialogTargetId = null
    this.dialogSubjectId = ""
    this.dialogSubjectName = ""
    this.pendingDeleteId = null
    this.pendingDeleteSubjectId = null
    this.pendingSeq = 0
    this["addSubject"] = this.addSubject.bind(this)
    this["stopBubble"] = this.stopBubble.bind(this)
    if (this.teacherAssign()) {
      this.loadWorkspaceCatalogAndDraft()
      return
    }
    this.loadCatalog()
  }

  disconnect() {
    if (this.hasDialogTarget) closeModal(this.dialogTarget)
    if (this.hasDeleteDialogTarget) closeModal(this.deleteDialogTarget)
    if (this.hasSubjectDeleteDialogTarget) closeModal(this.subjectDeleteDialogTarget)
    if (this.hasOfferingDialogTarget) closeModal(this.offeringDialogTarget)
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
            deliveryModes: normalizeDeliveryModes(type.deliveryModes || type.delivery_modes),
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
        deliveryModes: normalizeDeliveryModes(type.deliveryModes),
        isActive: type.isActive !== false
      }))
    })))
    this.draftPayloadTarget.dispatchEvent(new CustomEvent("lesson-catalog:change", { bubbles: true }))
  }

  t(key, fallback) {
    return this.i18nValue?.lesson_types?.[key] || fallback || key
  }

  tTeachers(key, fallback) {
    return this.i18nValue?.teachers?.[key] || fallback || key
  }

  tCommon(key, fallback) {
    return this.i18nValue?.common?.[key] || fallback || key
  }

  teacherAssign() {
    return this.modeValue === "teacher_assign"
  }

  async loadWorkspaceCatalogAndDraft() {
    if (this.drafting()) {
      this.subjects = this.readDraft()
    } else {
      this.subjects = []
    }
    if (!this.hasWorkspaceCatalogUrlValue) {
      this.render()
      return
    }
    try {
      this.workspaceCatalog = await this.fetchJson(this.workspaceCatalogSubjectsUrl())
      if (!Array.isArray(this.workspaceCatalog)) this.workspaceCatalog = []
    } catch (error) {
      console.error("lesson-types workspace catalog", error)
      this.workspaceCatalog = []
      this.showToast(this.t("save_failed", "Could not save changes."))
    }
    this.render()
    this.syncOfferingAddButton()
  }

  workspaceCatalogSubjectsUrl() {
    const url = new URL(this.workspaceCatalogUrlValue, window.location.origin)
    url.searchParams.set("include_inactive", "0")
    return `${url.pathname}${url.search}`
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

  focusAddSubject() {
    if (!this.hasNewSubjectTarget) return
    const wrap = this.newSubjectTarget.closest(".lt-add-lesson")
    if (wrap) wrap.hidden = false
    this.newSubjectTarget.focus()
  }

  async loadCatalog() {
    if (this.drafting()) {
      this.subjects = this.readDraft()
      this.render()
      return
    }
    if (!this.teacherIdValue && !this.isWorkspaceCatalogMode()) {
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

  isWorkspaceCatalogMode() {
    return this.modeValue === "workspace_catalog"
  }

  canEditWorkspaceCatalog() {
    if (!this.isWorkspaceCatalogMode()) return true
    return this.canManageValue
  }

  subjectsIndexUrl() {
    const path = this.isWorkspaceCatalogMode()
      ? this.subjectsUrlValue
      : this.expandUrl(this.subjectsUrlValue, this.teacherIdValue)
    const url = new URL(path, window.location.origin)
    if (this.modeValue !== "readonly") url.searchParams.set("include_inactive", "1")
    return `${url.pathname}${url.search}`
  }

  render() {
    if (this.teacherAssign()) {
      this.renderAssignments()
      return
    }
    if (this.modeValue === "readonly") {
      this.renderReadonly()
      return
    }
    this.renderCatalog()
  }

  renderAssignments() {
    if (!this.hasAssignmentListTarget) return
    const subjects = this.subjects
    if (this.hasEmptyTarget) this.emptyTarget.hidden = subjects.length > 0
    this.assignmentListTarget.hidden = subjects.length === 0
    if (!subjects.length) {
      this.assignmentListTarget.innerHTML = ""
      this.syncOfferingAddButton()
      return
    }
    this.assignmentListTarget.innerHTML = subjects.map((subject) => this.assignmentCard(subject)).join("")
    this.syncOfferingAddButton()
  }

  assignmentCard(subject) {
    const types = (subject.lessonTypes || []).flatMap((item) => {
      const modes = normalizeDeliveryModes(item.deliveryModes)
      if (!modes.length) return []
      const mode = this.t(item.mode, item.mode)
      const name = String(item.name || "").trim()
      const showMode = mode && mode.trim().toLowerCase() !== name.toLowerCase()
      const typeLabel = showMode ? `${esc(name)} · ${esc(mode)}` : esc(name)
      return modes.map((delivery) => {
        const deliveryLabel = this.tCommon(delivery, delivery)
        return `<li class="lt-teaching-option">${typeLabel} · ${esc(deliveryLabel)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}</li>`
      })
    }).join("")
    return `<article class="lt-teaching-assigned">
      <div class="lt-teaching-assigned__head">
        <p class="lt-teaching-assigned__name">${esc(subject.name)}</p>
        <div class="lt-row__actions">
          <button type="button" class="lt-icon-btn" title="${esc(this.tTeachers("offering_edit", "Edit"))}" data-action="lesson-types#openOfferingDialog" data-subject-name="${esc(subject.name)}">${ICONS.pencil}</button>
          <button type="button" class="lt-icon-btn lt-icon-btn--danger" title="${esc(this.tTeachers("offering_remove", "Remove"))}" data-action="lesson-types#removeAssignment" data-subject-name="${esc(subject.name)}">${ICONS.trash}</button>
        </div>
      </div>
      <ul class="lt-teaching-assigned__types">${types}</ul>
    </article>`
  }

  syncOfferingAddButton() {
    if (!this.hasOfferingAddBtnTarget) return
    this.offeringAddBtnTarget.disabled = false
  }

  availableCatalogSubjects({ excludeSubjectName = null, forAdding = false } = {}) {
    const catalog = this.workspaceCatalog || []
    if (!forAdding) return catalog
    const skipName = (excludeSubjectName || "").trim().toLowerCase()
    const assignedNames = new Set(
      this.subjects.map((item) => item.name.trim().toLowerCase()).filter((name) => name && name !== skipName)
    )
    const assignedIds = new Set(
      this.subjects
        .map((item) => String(item.catalogSubjectId || item.id || ""))
        .filter((id) => id && !id.startsWith("pending-"))
    )
    return catalog.filter((item) => {
      if (assignedIds.has(String(item.id))) return false
      return !assignedNames.has(item.name.trim().toLowerCase())
    })
  }

  catalogSubjectByName(name) {
    const needle = (name || "").trim().toLowerCase()
    return (this.workspaceCatalog || []).find((item) => item.name.trim().toLowerCase() === needle)
  }

  async openOfferingDialog(event) {
    const subjectName = event?.currentTarget?.dataset?.subjectName || null
    this.offeringEditingSubject = subjectName
    if (!this.hasOfferingDialogTarget) return
    if (this.hasWorkspaceCatalogUrlValue) {
      try {
        this.workspaceCatalog = await this.fetchJson(this.workspaceCatalogSubjectsUrl())
        if (!Array.isArray(this.workspaceCatalog)) this.workspaceCatalog = []
      } catch (error) {
        console.error("lesson-types workspace catalog", error)
      }
    }
    this.syncOfferingAddButton()
    this.clearOfferingError()
    const adding = !subjectName
    if (this.hasOfferingTitleTarget) {
      this.offeringTitleTarget.textContent = adding
        ? this.tTeachers("offering_add_title", "Add subject")
        : subjectName
    }
    if (this.hasOfferingDescriptionTarget) {
      this.offeringDescriptionTarget.textContent = this.tTeachers(
        "offering_add_description",
        "Tick each lesson type and delivery mode this teacher offers."
      )
    }
    const catalog = this.workspaceCatalog || []
    const unassigned = this.availableCatalogSubjects({ forAdding: true })
    let options
    if (adding) {
      options = unassigned.length > 0 ? unassigned : catalog
    } else {
      options = catalog.filter((item) => item.name.toLowerCase() === subjectName.toLowerCase())
    }
    const emptyCatalog = catalog.length === 0
    if (this.hasOfferingNoSubjectsTarget) this.offeringNoSubjectsTarget.hidden = !emptyCatalog
    if (this.hasOfferingSubjectFieldTarget) this.offeringSubjectFieldTarget.hidden = !adding || emptyCatalog
    if (this.hasOfferingSubjectTarget) {
      this.offeringSubjectTarget.innerHTML = options.map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join("")
      if (options[0] && (adding || !this.offeringSubjectTarget.value)) this.offeringSubjectTarget.value = options[0].name
    }
    if (this.hasOfferingSubmitTarget) this.offeringSubmitTarget.disabled = emptyCatalog
    this.offeringSubjectChanged()
    this.offeringDialogTarget.hidden = false
    openModal(this.offeringDialogTarget, {
      onClose: () => this.closeOfferingDialog(),
      focus: this.hasOfferingSubjectTarget && !this.offeringSubjectFieldTarget.hidden ? this.offeringSubjectTarget : null
    })
  }

  offeringSubjectChanged() {
    const subjectName = this.hasOfferingSubjectTarget
      ? this.offeringSubjectTarget.value
      : (this.offeringEditingSubject || "")
    const catalogSubject = this.catalogSubjectByName(subjectName)
    const assigned = this.subjects.find((item) => item.name.toLowerCase() === subjectName.toLowerCase())
    if (!catalogSubject || !(catalogSubject.lessonTypes || []).length) {
      if (this.hasOfferingTypesTarget) this.offeringTypesTarget.hidden = true
      if (this.hasOfferingChipsTarget) {
        this.offeringChipsTarget.hidden = true
        this.offeringChipsTarget.innerHTML = ""
      }
      if (this.hasOfferingEmptyTarget) this.offeringEmptyTarget.hidden = !subjectName
      return
    }
    if (this.hasOfferingEmptyTarget) this.offeringEmptyTarget.hidden = true
    this.offeringModesByType = {}
    const activeTypes = (catalogSubject.lessonTypes || []).filter((item) => item.isActive !== false)
    activeTypes.forEach((type) => {
      const existing = (assigned?.lessonTypes || []).find((item) => String(item.id) === String(type.id))
      this.offeringModesByType[String(type.id)] = normalizeDeliveryModes(existing?.deliveryModes)
    })
    if (this.hasOfferingTypesTarget) {
      this.offeringTypesTarget.hidden = false
      this.renderOfferingGrid(subjectName, activeTypes)
    }
    this.updateOfferingSubmitLabel()
    this.updateOfferingChips(subjectName, activeTypes)
  }

  renderOfferingGrid(subjectName, types) {
    if (!this.hasOfferingTypesTarget) return
    const typeCol = this.tTeachers("offering_col_lesson_type", "Lesson type")
    const header = DELIVERY_MODES.map((mode) => {
      const label = this.tCommon(mode, mode)
      return `<span class="lt-offering-grid__col-delivery">${esc(label)}</span>`
    }).join("")
    const rows = types.map((type) => {
      const mode = this.t(type.mode, type.mode)
      const name = String(type.name || "").trim()
      const showMode = mode && mode.trim().toLowerCase() !== name.toLowerCase()
      const meta = showMode ? `${esc(mode)} · ${type.defaultDurationMinutes} ${esc(this.t("min", "min"))}` : `${type.defaultDurationMinutes} ${esc(this.t("min", "min"))}`
      const cells = DELIVERY_MODES.map((delivery) => {
        const modes = this.offeringModesByType[String(type.id)] || []
        const checked = modes.includes(delivery) ? "checked" : ""
        return `<label class="lt-offering-grid__check"><input type="checkbox" data-type-id="${esc(type.id)}" data-delivery-mode="${esc(delivery)}" ${checked} data-action="change->lesson-types#offeringDeliveryToggle" aria-label="${esc(name)} ${esc(this.tCommon(delivery, delivery))}"></label>`
      }).join("")
      return `<div class="lt-offering-grid__row" role="row">
        <div class="lt-offering-grid__cell-name" role="cell">
          <p class="lt-offering-grid__type-name">${esc(name)}</p>
          <p class="lt-offering-grid__type-meta">${meta}</p>
        </div>
        ${cells}
      </div>`
    }).join("")
    this.offeringTypesTarget.innerHTML = `<div class="lt-offering-grid" role="table" aria-label="${esc(subjectName)}">
      <div class="lt-offering-grid__head" role="row">
        <span class="lt-offering-grid__col-type" role="columnheader">${esc(typeCol)}</span>
        ${header}
      </div>
      ${rows}
    </div>`
  }

  offeringDeliveryToggle(event) {
    const input = event.currentTarget
    const typeId = input.dataset.typeId
    const delivery = input.dataset.deliveryMode
    if (!typeId || !delivery) return
    const current = this.offeringModesByType[typeId] || []
    const next = current.includes(delivery)
      ? current.filter((item) => item !== delivery)
      : DELIVERY_MODES.filter((item) => item === delivery || current.includes(item))
    this.offeringModesByType[typeId] = next
    if (!this.hasOfferingTypesTarget) return
    DELIVERY_MODES.forEach((mode) => {
      const box = this.offeringTypesTarget.querySelector(`input[data-type-id="${typeId}"][data-delivery-mode="${mode}"]`)
      if (box && box !== input) box.checked = next.includes(mode)
    })
    input.checked = next.includes(delivery)
    this.updateOfferingSubmitLabel()
    const subjectName = this.hasOfferingSubjectTarget ? this.offeringSubjectTarget.value : this.offeringEditingSubject
    const catalogSubject = this.catalogSubjectByName(subjectName)
    const activeTypes = (catalogSubject?.lessonTypes || []).filter((item) => item.isActive !== false)
    this.updateOfferingChips(subjectName, activeTypes)
  }

  updateOfferingChips(subjectName, types) {
    if (!this.hasOfferingChipsTarget) return
    const catalogSubject = this.catalogSubjectByName(subjectName)
    const list = types || (catalogSubject?.lessonTypes || []).filter((item) => item.isActive !== false)
    const chips = list.flatMap((type) => {
      const modes = this.offeringModesByType[String(type.id)] || []
      return modes.map((delivery) => {
        const deliveryLabel = this.tCommon(delivery, delivery)
        return `<li class="lt-offering-chip">${esc(type.name)} · ${esc(deliveryLabel)}</li>`
      })
    })
    this.offeringChipsTarget.innerHTML = chips.join("")
    this.offeringChipsTarget.hidden = chips.length === 0
  }

  selectedOfferingCount() {
    return Object.values(this.offeringModesByType || {}).reduce((sum, modes) => sum + (modes?.length || 0), 0)
  }

  updateOfferingSubmitLabel() {
    if (!this.hasOfferingSubmitTarget) return
    const count = this.selectedOfferingCount()
    const base = this.tTeachers("offering_save", "Save")
    this.offeringSubmitTarget.textContent = count > 0 ? `${base} (${count})` : base
  }

  clearOfferingError() {
    if (this.hasOfferingErrorTarget) {
      this.offeringErrorTarget.hidden = true
      this.offeringErrorTarget.textContent = ""
    }
  }

  closeOfferingDialog() {
    if (!this.hasOfferingDialogTarget) return
    closeModal(this.offeringDialogTarget)
    this.offeringDialogTarget.hidden = true
    this.offeringEditingSubject = null
    this.offeringModesByType = {}
    if (this.hasOfferingNoSubjectsTarget) this.offeringNoSubjectsTarget.hidden = true
    if (this.hasOfferingChipsTarget) {
      this.offeringChipsTarget.hidden = true
      this.offeringChipsTarget.innerHTML = ""
    }
    if (this.hasOfferingSubmitTarget) this.offeringSubmitTarget.disabled = false
    this.clearOfferingError()
  }

  confirmOffering() {
    this.clearOfferingError()
    const subjectName = this.hasOfferingSubjectTarget ? this.offeringSubjectTarget.value : this.offeringEditingSubject
    const catalogSubject = this.catalogSubjectByName(subjectName)
    if (!catalogSubject) {
      this.showOfferingError(this.tTeachers("offering_pick_subject", "Choose a subject."))
      return
    }
    const types = (catalogSubject.lessonTypes || [])
      .filter((item) => item.isActive !== false)
      .map((item) => ({
        type: item,
        deliveryModes: normalizeDeliveryModes(this.offeringModesByType[String(item.id)])
      }))
      .filter((row) => row.deliveryModes.length > 0)
      .map((row) => ({
        id: row.type.id,
        name: row.type.name,
        kind: row.type.kind,
        mode: row.type.mode,
        defaultDurationMinutes: row.type.defaultDurationMinutes,
        deliveryModes: row.deliveryModes,
        isActive: row.type.isActive !== false
      }))
    if (!types.length) {
      this.showOfferingError(this.tTeachers("offering_pick_type", "Tick at least one teaching option."))
      return
    }
    const next = {
      id: catalogSubject.id,
      catalogSubjectId: catalogSubject.id,
      name: catalogSubject.name,
      isActive: true,
      lessonTypes: types
    }
    const without = this.subjects.filter((item) => item.name.toLowerCase() !== catalogSubject.name.toLowerCase())
    this.subjects = [...without, next].sort((a, b) => a.name.localeCompare(b.name))
    this.syncDraft()
    this.render()
    this.closeOfferingDialog()
    this.showToast(this.tTeachers("offering_saved", "Teaching options updated."))
  }

  removeAssignment(event) {
    const name = event.currentTarget.dataset.subjectName
    if (!name) return
    this.subjects = this.subjects.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
    this.syncDraft()
    this.render()
    this.showToast(this.tTeachers("offering_removed", "Subject removed."))
  }

  showOfferingError(message) {
    if (!this.hasOfferingErrorTarget) return
    this.offeringErrorTarget.textContent = message
    this.offeringErrorTarget.hidden = false
  }

  renderCatalog() {
    if (!this.hasListTarget) return
    if (!this.teacherIdValue && !this.drafting() && !this.isWorkspaceCatalogMode()) {
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
    const addType = this.canEditWorkspaceCatalog()
      ? `<button type="button" class="lt-add-type" data-action="lesson-types#openNewForSubject" data-subject-id="${esc(subject.id)}" data-subject="${esc(subject.name)}">
        ${ICONS.plus}
        ${esc(this.t("add_lesson_type", "Add lesson type"))}
      </button>`
      : ""
    return `<article class="lt-subject">
      ${this.subjectHeader(subject, types.length)}
      ${body ? `<div class="lt-subject__types">${body}</div>` : ""}
      ${addType}
    </article>`
  }

  subjectHeader(subject, typeCount) {
    if (!this.canEditWorkspaceCatalog()) {
      const inactive = subject.isActive === false
      return `<div class="lt-subject__head">
        <p class="lt-subject__name">${esc(subject.name)}${inactive ? ` · ${esc(this.t("inactive", "Inactive"))}` : ""}</p>
      </div>`
    }
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
    if (!this.canEditWorkspaceCatalog()) {
      return `<article class="lt-row ${item.isActive ? "" : "is-inactive"}">
      <div>
        <div class="lt-row__title">
          <p>${esc(item.name)}</p>
          <span class="status-badge status-badge--${statusClass}">${esc(status)}</span>
        </div>
        <p class="lt-row__meta">${esc(mode)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}${this.typePriceMeta(item)}</p>
      </div>
    </article>`
    }
    const deleteBtn = item.isActive
      ? `<button type="button" class="lt-icon-btn lt-icon-btn--danger" data-action="lesson-types#askDelete" data-id="${esc(item.id)}" aria-label="${esc(this.t("delete", "Delete"))}">${ICONS.trash}</button>`
      : `<button type="button" class="lt-text-btn" data-action="lesson-types#reactivate" data-id="${esc(item.id)}">${esc(this.t("reactivate", "Reactivate"))}</button>`
    return `<article class="lt-row ${item.isActive ? "" : "is-inactive"}">
      <div>
        <div class="lt-row__title">
          <p>${esc(item.name)}</p>
          <span class="status-badge status-badge--${statusClass}">${esc(status)}</span>
        </div>
        <p class="lt-row__meta">${esc(mode)} · ${item.defaultDurationMinutes} ${esc(this.t("min", "min"))}${this.typePriceMeta(item)}</p>
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

  typePriceMeta(item) {
    const cents = item?.priceCents ?? item?.price_cents
    if (cents == null || cents === "") return ""
    const label = Number(cents) === 0 ? this.t("free_lesson", "Free") : formatMoney(cents, item.currency || "UAH")
    return ` · ${label}`
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
    if (!this.teacherIdValue && !this.isWorkspaceCatalogMode()) {
      this.showAddError(this.t("select_teacher", "Select a teacher to manage their lessons."))
      return
    }
    try {
      const createUrl = this.isWorkspaceCatalogMode()
        ? this.subjectsUrlValue
        : this.expandUrl(this.subjectsUrlValue, this.teacherIdValue)
      const subject = await this.sendJson("POST", createUrl, { name })
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
    this.dialogOriginalMode = item?.mode || "individual"
    if (this.hasNameTarget) this.nameTarget.value = item?.name || ""
    this.setMode(item?.mode || "individual")
    if (this.hasDurationTarget) this.durationTarget.value = item?.defaultDurationMinutes || 60
    if (this.hasDescriptionTarget) this.descriptionTarget.value = ""
    if (this.hasActiveTarget) this.activeTarget.checked = item ? item.isActive !== false : true
    if (this.hasNamePresetsTarget) this.namePresetsTarget.hidden = Boolean(item)
    this.clearDialogErrors()
    this.syncParticipationUI()
    this.syncPresetButtons()
  }

  applyPreset(event) {
    const button = event.currentTarget
    if (!this.hasNameTarget) return
    this.nameTarget.value = button.dataset.name || ""
    if (button.dataset.duration && this.hasDurationTarget) {
      this.durationTarget.value = button.dataset.duration
    }
    if (button.dataset.mode) this.setMode(button.dataset.mode)
    this.syncPresetButtons()
    this.syncParticipationUI()
  }

  onModeChange() {
    this.syncParticipationUI()
    this.syncPresetButtons()
  }

  selectedMode() {
    const checked = this.modeRadioTargets.find((radio) => radio.checked)
    return checked?.value || "individual"
  }

  setMode(mode) {
    this.modeRadioTargets.forEach((radio) => { radio.checked = radio.value === mode })
  }

  syncParticipationUI() {
    const mode = this.selectedMode()
    this.modeRadioTargets.forEach((radio) => {
      const card = radio.closest(".lt-participation__card")
      if (card) card.classList.toggle("is-selected", radio.checked)
    })
    const editing = this.dialogTargetId && this.dialogTargetId !== "new"
    if (this.hasParticipationHintTarget) {
      this.participationHintTarget.hidden = !editing || mode === this.dialogOriginalMode
    }
  }

  syncPresetButtons() {
    if (!this.hasNamePresetsTarget || !this.hasNameTarget) return
    const needle = this.nameTarget.value.trim().toLowerCase()
    this.namePresetsTarget.querySelectorAll(".lt-preset").forEach((button) => {
      const active = (button.dataset.name || "").trim().toLowerCase() === needle
      button.classList.toggle("is-active", active)
      button.setAttribute("aria-pressed", active ? "true" : "false")
    })
  }

  inferKind(name, mode) {
    const needle = name.trim().toLowerCase()
    const individual = this.t("preset_individual", "Individual").toLowerCase()
    const group = this.t("preset_group", "Group").toLowerCase()
    const trial = this.t("preset_trial", "Trial").toLowerCase()
    if (needle === individual && mode === "individual") return "individual"
    if (needle === group && mode === "group") return "group"
    if (needle === trial && mode === "individual") return "trial"
    return "custom"
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
    ;["nameError", "durationError"].forEach((name) => {
      if (this[`has${capitalize(name)}Target`]) {
        this[`${name}Target`].hidden = true
        this[`${name}Target`].textContent = ""
      }
    })
  }

  async submitDialog(event) {
    event.preventDefault()
    this.clearDialogErrors()
    const name = this.nameTarget.value.trim()
    const mode = this.selectedMode()
    const kind = this.inferKind(name, mode)
    const duration = Number(this.durationTarget.value)
    let invalid = false
    if (!name) {
      this.showFieldError("nameError", this.t("name_blank", "Enter a lesson type name."))
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
      mode,
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

function normalizeDeliveryModes(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => String(item)).filter((item) => DELIVERY_MODES.includes(item))
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
