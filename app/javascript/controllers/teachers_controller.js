import { Controller } from "@hotwired/stimulus"
import { validateSlots } from "../lib/teacher_availability"
import { closeModal, openModal } from "../lib/modal"

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default class extends Controller {
  static targets = [
    "search",
    "status",
    "assignment",
    "newChip",
    "empty",
    "emptyTitle",
    "emptyText",
    "clearBtn",
    "addBtn",
    "table",
    "row",
    "stat",
    "firstName",
    "lastName",
    "displayName",
    "initialsPreview",
    "formStatus",
    "email",
    "submitBtn",
    "formAlert",
    "inviteToggle",
    "inviteFields",
    "notes",
    "notesCount",
    "photoInput",
    "photoImage",
    "photoPick",
    "photoRemove",
    "photoError",
    "removePhotoInput",
    "workingDay",
    "hoursRow",
    "hoursWrap",
    "copyMonday",
    "hoursError",
    "customDuration",
    "customMinutes",
    "durationPreset",
    "durationValue",
    "subjectList",
    "subjectDraft",
    "subjectPopover",
    "subjectError",
    "calendarColor",
    "assignedSearch",
    "assignedRow",
    "assignedList",
    "assignedEmpty",
    "assignedCount",
    "assignSearch",
    "assignOption",
    "assignEmpty",
    "toast",
    "absenceDialog",
    "absenceFrame",
    "affectedLessonsDialog",
    "affectedLessonsFrame",
    "archiveLessonsDialog",
    "archiveLessonsFrame"
  ]

  static values = {
    i18n: Object,
    name: String,
    editing: Boolean,
    absenceDialogUrl: String,
    teacherId: String,
    manageAbsence: String,
    affectedLessonsUrl: String,
    archiveLessonsDialogUrl: String,
    manageArchive: String,
  }

  connect() {
    this.statsFilter = "all"
    this.removeId = null
    this.photoUrl = ""
    this.dirty = false
    this.touched = new Set()
    this["markDirty"] = this.markDirty.bind(this)
    this["confirmLeave"] = this.confirmLeave.bind(this)
    this["validateSubmit"] = this.validateSubmit.bind(this)
    if (this.hasNotesTarget) this.updateNotesCount()
    if (this.hasInitialsPreviewTarget) this.updateInitials()
    this.syncHoursUi()
    this.syncCustomDuration()
    this.boundPointer = this.closeSubjectOnOutside.bind(this)
    document.addEventListener("mousedown", this.boundPointer)
    if (this.hasAssignedRowTarget) this.filterAssigned()
    if (this.hasRowTarget) this.filter()
    this.resetPageScroll()
    if (this.hasManageAbsenceValue && this.manageAbsenceValue) {
      this.openAffectedLessonsById(this.manageAbsenceValue)
      this.stripManageAbsenceParam()
    }
    if (this.hasManageArchiveValue && this.manageArchiveValue) {
      this.openArchiveLessons()
      this.stripManageArchiveParam()
    }
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    this.resetPageScroll()
  }

  t(group, key, vars = {}) {
    const source = this.i18nValue?.[group] || {}
    let text = source[key] || key
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`%{${name}}`, value)
    })
    return text
  }

  filter() {
    if (!this.hasRowTarget) {
      if (this.hasEmptyTarget) this.emptyTarget.classList.remove("teachers-page__empty--hidden")
      if (this.hasTableTarget) this.tableTarget.hidden = true
      if (this.hasEmptyTitleTarget) this.emptyTitleTarget.textContent = this.t("teachers", "empty_title")
      if (this.hasEmptyTextTarget) this.emptyTextTarget.textContent = this.t("teachers", "empty_text")
      if (this.hasAddBtnTarget) this.addBtnTarget.classList.remove("teachers-page__empty-add--hidden")
      if (this.hasClearBtnTarget) this.clearBtnTarget.hidden = true
      return
    }

    const query = this.hasSearchTarget ? this.searchTarget.value.trim().toLowerCase() : ""
    const status = this.hasStatusTarget ? this.statusTarget.value : ""
    const assignment = this.hasAssignmentTarget ? this.assignmentTarget.value : "all"
    let visible = 0

    this.rowTargets.forEach((row) => {
      const matchesQuery =
        !query ||
        row.dataset.name?.includes(query) ||
        row.dataset.email?.includes(query)
      const matchesStatus = !status || row.dataset.status === status
      const matchesAssignment = assignment !== "assigned" || row.dataset.assigned === "1"

      let matchesStats = true
      if (this.statsFilter === "active") matchesStats = row.dataset.status === "active"
      if (this.statsFilter === "withStudents") matchesStats = row.dataset.assigned === "1"
      if (this.statsFilter === "newThisMonth") {
        const created = row.dataset.created ? new Date(row.dataset.created) : null
        const now = new Date()
        matchesStats =
          !!created &&
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth()
      }

      const show = matchesQuery && matchesStatus && matchesAssignment && matchesStats
      row.classList.toggle("teachers-page__row--hidden", !show)
      if (show) visible += 1
    })

    const hasFilters =
      !!query ||
      !!status ||
      assignment !== "all" ||
      this.statsFilter !== "all"

    if (this.hasEmptyTarget) {
      this.emptyTarget.classList.toggle("teachers-page__empty--hidden", visible > 0)
    }
    if (this.hasTableTarget) {
      this.tableTarget.hidden = visible === 0
      this.tableTarget.classList.toggle("teachers-page__table--hidden", visible === 0)
    }
    if (this.hasEmptyTitleTarget) {
      this.emptyTitleTarget.textContent = hasFilters
        ? this.t("teachers", "empty_filtered_title")
        : this.t("teachers", "empty_title")
    }
    if (this.hasEmptyTextTarget) {
      this.emptyTextTarget.textContent = hasFilters
        ? this.t("teachers", "empty_filtered_text")
        : this.t("teachers", "empty_text")
    }
    if (this.hasAddBtnTarget) {
      this.addBtnTarget.classList.toggle("teachers-page__empty-add--hidden", hasFilters)
    }
    if (this.hasClearBtnTarget) this.clearBtnTarget.hidden = !hasFilters
    if (this.hasNewChipTarget) {
      this.newChipTarget.classList.toggle("teachers-page__chip--hidden", this.statsFilter !== "newThisMonth")
    }
  }

  setStatsFilter(event) {
    const filter = event.currentTarget.dataset.filter
    if (!filter || filter === "lessonsThisMonth") return

    this.statsFilter = this.statsFilter === filter ? "all" : filter

    this.statTargets.forEach((stat) => {
      const active = stat.dataset.filter === this.statsFilter && this.statsFilter !== "all"
      stat.setAttribute("aria-pressed", active ? "true" : "false")
    })

    if (this.statsFilter === "active" && this.hasStatusTarget) {
      this.statusTarget.value = "active"
    } else if (this.hasStatusTarget && ["all", "withStudents", "newThisMonth"].includes(this.statsFilter)) {
      if (this.statsFilter !== "active") this.statusTarget.value = ""
    }

    if (this.hasAssignmentTarget) {
      if (this.statsFilter === "withStudents") {
        this.assignmentTarget.value = "assigned"
      } else if (this.statsFilter === "all" || this.statsFilter === "active" || this.statsFilter === "newThisMonth") {
        if (this.assignmentTarget.value === "assigned") this.assignmentTarget.value = "all"
      }
    }

    this.filter()
  }

  clearFilters() {
    if (this.hasSearchTarget) this.searchTarget.value = ""
    if (this.hasStatusTarget) this.statusTarget.value = ""
    if (this.hasAssignmentTarget) this.assignmentTarget.value = "all"
    this.statsFilter = "all"
    if (this.hasStatTarget) {
      this.statTargets.forEach((stat) => stat.setAttribute("aria-pressed", "false"))
    }
    this.filter()
  }

  updateInitials() {
    if (!this.hasInitialsPreviewTarget) return
    const display = this.hasDisplayNameTarget ? this.displayNameTarget.value.trim() : ""
    const first = this.hasFirstNameTarget ? this.firstNameTarget.value.trim() : ""
    const last = this.hasLastNameTarget ? this.lastNameTarget.value.trim() : ""
    const source = display || [first || "T", last || "C"].join(" ")
    const parts = source.split(/\s+/).filter(Boolean)
    let initials = "TC"
    if (parts.length === 1) initials = parts[0].slice(0, 2).toUpperCase()
    else if (parts.length > 1) initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    this.initialsPreviewTarget.textContent = initials
  }

  toggleInvite() {
    if (!this.hasInviteFieldsTarget || !this.hasInviteToggleTarget) return
    this.inviteFieldsTarget.classList.toggle(
      "teachers-page__invite-fields--hidden",
      !this.inviteToggleTarget.checked
    )
  }

  updateNotesCount() {
    if (!this.hasNotesTarget || !this.hasNotesCountTarget) return
    this.notesCountTarget.textContent = `${this.notesTarget.value.length}/500`
  }

  pickPhoto() {
    if (this.hasPhotoInputTarget) this.photoInputTarget.click()
  }

  previewPhoto() {
    const file = this.hasPhotoInputTarget ? this.photoInputTarget.files?.[0] : null
    this.setPhotoError()
    if (!file) {
      this.clearPhoto()
      return
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.setPhotoError(this.t("teachers", "photo_type_error"))
      this.photoInputTarget.value = ""
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.setPhotoError(this.t("teachers", "photo_size_error"))
      this.photoInputTarget.value = ""
      return
    }
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl)
    this.photoUrl = URL.createObjectURL(file)
    if (this.hasPhotoImageTarget) {
      this.photoImageTarget.src = this.photoUrl
      this.photoImageTarget.hidden = false
    }
    if (this.hasInitialsPreviewTarget) this.initialsPreviewTarget.hidden = true
    if (this.hasPhotoRemoveTarget) this.photoRemoveTarget.hidden = false
    if (this.hasPhotoPickTarget) {
      const label = this.photoPickTarget.querySelector("span")
      if (label) label.textContent = this.t("teachers", "replace_photo")
    }
    if (this.hasRemovePhotoInputTarget) this.removePhotoInputTarget.value = "0"
  }

  removePhoto() {
    this.clearPhoto()
    if (this.hasPhotoInputTarget) this.photoInputTarget.value = ""
    if (this.hasRemovePhotoInputTarget) this.removePhotoInputTarget.value = "1"
  }

  clearPhoto() {
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl)
    this.photoUrl = ""
    if (this.hasPhotoImageTarget) {
      this.photoImageTarget.removeAttribute("src")
      this.photoImageTarget.hidden = true
    }
    if (this.hasInitialsPreviewTarget) this.initialsPreviewTarget.hidden = false
    if (this.hasPhotoRemoveTarget) this.photoRemoveTarget.hidden = true
    if (this.hasPhotoPickTarget) {
      const label = this.photoPickTarget.querySelector("span")
      if (label) label.textContent = this.t("teachers", "choose_file")
    }
  }

  setPhotoError(message) {
    if (!this.hasPhotoErrorTarget) return
    this.photoErrorTarget.textContent = message || ""
    this.photoErrorTarget.hidden = !message
  }

  toggleWorkingDay() {
    this.syncHoursUi()
  }

  syncHoursUi() {
    if (!this.hasHoursRowTarget) return
    const selected = this.selectedDays()
    this.hoursRowTargets.forEach((row) => {
      const on = selected.includes(row.dataset.day)
      row.hidden = !on
      row.querySelectorAll("input").forEach((input) => {
        input.disabled = !on
      })
    })
    if (this.hasHoursWrapTarget) this.hoursWrapTarget.hidden = selected.length === 0
    if (this.hasCopyMondayTarget) {
      this.copyMondayTarget.hidden = !(selected.includes("Monday") && selected.length > 1)
    }
  }

  selectedDays() {
    if (!this.hasWorkingDayTarget) return []
    return this.workingDayTargets.filter((input) => input.checked).map((input) => input.dataset.day)
  }

  copyMonday() {
    const monday = this.hoursRowTargets.find((row) => row.dataset.day === "Monday")
    if (!monday) return
    const start = monday.querySelector('[data-role="start"]')?.value
    const end = monday.querySelector('[data-role="end"]')?.value
    this.hoursRowTargets.forEach((row) => {
      if (row.hidden) return
      const startInput = row.querySelector('[data-role="start"]')
      const endInput = row.querySelector('[data-role="end"]')
      if (startInput) startInput.value = start
      if (endInput) endInput.value = end
    })
  }

  markDirty(event) {
    if (event?.target?.closest?.(".lt-teaching, .lt-add-lesson, .lt-list, .lt-empty, .lt-subject")) return
    this.dirty = true
  }

  confirmLeave(event) {
    if (!this.dirty) return
    const key = this.editingValue ? "leave_unsaved_edit" : "leave_unsaved_create"
    if (!window.confirm(this.t("teachers", key))) event.preventDefault()
  }

  markTouched(event) {
    this.dirty = true
    const map = {
      first_name: "firstName",
      last_name: "lastName",
      email: "email",
      status: "status",
      custom_duration: "customDuration",
      notes: "notes"
    }
    const key = map[event.currentTarget.name]
    if (key) {
      this.touched.add(key)
      this.renderErrors(this.validate())
    }
  }

  validateSubmit(event) {
    this.touched = new Set(["firstName", "lastName", "status", "email", "customDuration", "notes"])
    this.syncCustomDuration()
    const slotsError = this.availabilitySlotsInvalid()
    const compensationError = this.compensationSubmitBlocked()
    const errors = this.validate()
    this.renderErrors(errors)
    if (Object.keys(errors).length > 0 || slotsError || compensationError) {
      event.preventDefault()
      if (this.hasFormAlertTarget) this.formAlertTarget.hidden = false
      return
    }
    if (this.hasFormAlertTarget) this.formAlertTarget.hidden = true
    window.setTimeout(() => {
      this.submitBtnTargets.forEach((btn) => {
        btn.textContent = this.t("teachers", this.editingValue ? "saving" : "creating")
        btn.disabled = true
      })
    }, 0)
  }

  validate() {
    const errors = {}
    const first = this.hasFirstNameTarget ? this.firstNameTarget.value.trim() : ""
    const last = this.hasLastNameTarget ? this.lastNameTarget.value.trim() : ""
    const email = this.hasEmailTarget ? this.emailTarget.value.trim() : ""
    const status = this.hasFormStatusTarget ? this.formStatusTarget.value : "active"
    const notes = this.hasNotesTarget ? this.notesTarget.value : ""
    const preset = this.hasDurationPresetTarget ? this.durationPresetTarget.value : ""
    const custom = this.hasCustomMinutesTarget ? this.customMinutesTarget.value : ""

    if (!first) errors.firstName = this.t("teachers", "enter_first_name")
    if (!last) errors.lastName = this.t("teachers", "enter_last_name")
    if (!status) errors.status = this.t("teachers", "select_status")
    if (!email || !EMAIL_RE.test(email)) {
      errors.email = this.t("teachers", "enter_email")
    }
    if (preset === "custom") {
      const minutes = Number(custom)
      if (!Number.isInteger(minutes) || minutes <= 0) {
        errors.customDuration = this.t("teachers", "custom_duration_error")
      }
    }
    if (notes.length > 500) errors.notes = this.t("teachers", "notes_too_long")
    return errors
  }

  renderErrors(errors) {
    this.element.querySelectorAll("[data-error-for]").forEach((node) => {
      const key = node.dataset.errorFor
      const show = this.touched.has(key) && errors[key]
      node.textContent = show ? errors[key] : ""
      node.hidden = !show
      node.closest(".teachers-page__field")?.classList.toggle("teachers-page__field--invalid", Boolean(show))
    })
  }

  compensationSubmitBlocked() {
    const section = this.element.querySelector("#compensation[data-controller*='teacher-compensation']")
    if (!section) return false
    const ctrl = this.application.getControllerForElementAndIdentifier(section, "teacher-compensation")
    if (!ctrl) return false
    ctrl.syncPayload()
    if (!ctrl.submitBlocked()) return false
    ctrl.renderSalaryError()
    section.scrollIntoView({ behavior: "smooth", block: "start" })
    return true
  }

  availabilitySlotsInvalid() {
    const root = document.querySelector("[data-controller~='teacher-availability']")
    if (!root) return false
    const controller = this.application.getControllerForElementAndIdentifier(root, "teacher-availability")
    if (controller) {
      const errors = controller.validate()
      return Object.keys(errors).length > 0
    }
    const payload = root.querySelector("[name='availability_slots']")
    if (!payload) return false
    try {
      const errors = validateSlots(JSON.parse(payload.value || "[]"))
      return Object.keys(errors).length > 0
    } catch {
      return true
    }
  }

  filterAssigned() {
    if (!this.hasAssignedRowTarget && !this.hasAssignedEmptyTarget) return
    const query = this.hasAssignedSearchTarget ? this.assignedSearchTarget.value.trim().toLowerCase() : ""
    let visible = 0
    this.assignedRowTargets.forEach((row) => {
      const haystack = `${row.dataset.search || ""} ${row.dataset.subjects || ""}`.toLowerCase()
      const show = !query || haystack.includes(query)
      row.hidden = !show
      if (show) visible += 1
    })
    const total = this.assignedRowTargets.length
    if (this.hasAssignedListTarget) this.assignedListTarget.hidden = visible === 0
    if (this.hasAssignedEmptyTarget) this.assignedEmptyTarget.hidden = visible > 0
    this.updateAssignedCount(total)
  }

  updateAssignedCount(total = this.assignedRowTargets.length) {
    if (!this.hasAssignedCountTarget) return
    this.assignedCountTarget.textContent =
      total === 1
        ? this.t("teachers", "assigned_count_one")
        : this.t("teachers", "assigned_count", { count: total })
  }

  filterAssignOptions() {
    if (!this.hasAssignOptionTarget) return
    const query = this.hasAssignSearchTarget ? this.assignSearchTarget.value.trim().toLowerCase() : ""
    let visible = 0
    this.assignOptionTargets.forEach((option) => {
      const show = !query || (option.dataset.name || "").includes(query)
      const item = option.closest("li")
      if (item) item.hidden = !show
      if (show) visible += 1
    })
    if (this.hasAssignEmptyTarget) this.assignEmptyTarget.hidden = visible > 0
  }

  openAssign() {
    if (this.hasAssignDialogTarget) this.assignDialogTarget.hidden = false
  }

  closeAssign() {
    if (this.hasAssignDialogTarget) this.assignDialogTarget.hidden = true
  }

  confirmAssign() {
    const selected = this.hasAssignBoxTarget ? this.assignBoxTargets.filter((box) => box.checked) : []
    selected.forEach((box) => {
      this.appendAssignedStudent(box)
      box.closest("li")?.remove()
    })
    this.closeAssign()
    if (this.hasAssignedListTarget) this.assignedListTarget.hidden = this.assignedListTarget.children.length === 0
    if (this.hasAssignedEmptyTarget) this.assignedEmptyTarget.hidden = this.assignedListTarget?.children.length > 0
    if (selected.length > 0) {
      this.showToast(
        this.t("teachers", "assigned_toast", {
          count: selected.length,
          name: this.nameValue || this.t("common", "teacher")
        })
      )
    }
    this.filterAssigned()
  }

  appendAssignedStudent(box) {
    if (!this.hasAssignedListTarget) return
    const name = box.dataset.name
    const initials = box.dataset.initials || "ST"
    const subjects = box.dataset.subjects || ""
    const status = box.dataset.status || "active"
    const path = box.dataset.path || "#"
    const statusLabel = this.i18nValue?.statuses?.[status] || status
    const li = document.createElement("li")
    li.dataset.teachersTarget = "assignedRow"
    li.dataset.id = box.dataset.id
    li.dataset.search = name.toLowerCase()
    li.dataset.subjects = subjects
    li.dataset.status = status
    li.innerHTML = `
      <div class="teachers-page__assigned-main">
        <span class="teachers-page__avatar teachers-page__avatar--sm">${initials}</span>
        <div>
          <a class="teachers-page__name" href="${path}">${name}</a>
          <p class="teachers-page__meta">${subjects || statusLabel}</p>
        </div>
      </div>
      <div class="teachers-page__assigned-actions">
        <span class="status-badge status-badge--olive">${statusLabel}</span>
        <button class="teachers-page__danger-btn" type="button" data-action="teachers#openRemove" data-id="${box.dataset.id}" data-name="${name}">
          <span>${this.t("teachers", "remove")}</span>
        </button>
      </div>
    `
    this.assignedListTarget.appendChild(li)
  }

  openRemove(event) {
    this.removeId = event.currentTarget.dataset.id
    this.removeName = event.currentTarget.dataset.name
    if (this.hasRemoveDialogTarget) this.removeDialogTarget.hidden = false
  }

  closeRemove() {
    this.removeId = null
    if (this.hasRemoveDialogTarget) this.removeDialogTarget.hidden = true
  }

  confirmRemove() {
    const row = this.assignedRowTargets.find((item) => item.dataset.id === this.removeId)
    const name = this.removeName || row?.querySelector(".teachers-page__name")?.textContent?.trim()
    row?.remove()
    this.closeRemove()
    if (name) this.showToast(this.t("teachers", "removed_toast", { name }))
    this.filterAssigned()
  }

  showToast(message) {
    if (!this.hasToastTarget) return
    this.toastTarget.textContent = message
    this.toastTarget.hidden = false
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toastTarget.hidden = true
    }, 3200)
  }

  toggleCustomDuration() {
    this.syncCustomDuration()
  }

  syncCustomDuration() {
    if (!this.hasDurationPresetTarget) return
    const preset = this.durationPresetTarget.value
    if (this.hasCustomDurationTarget) this.customDurationTarget.hidden = preset !== "custom"
    if (this.hasDurationValueTarget && preset !== "custom") this.durationValueTarget.value = preset
    if (preset === "custom") this.syncCustomMinutes()
  }

  syncCustomMinutes() {
    if (!this.hasDurationValueTarget || !this.hasCustomMinutesTarget) return
    this.durationValueTarget.value = this.customMinutesTarget.value
  }

  openSubjectPopover() {
    if (this.hasSubjectPopoverTarget) this.subjectPopoverTarget.hidden = false
    if (this.hasSubjectDraftTarget) this.subjectDraftTarget.focus()
  }

  closeSubjectPopover() {
    if (this.hasSubjectPopoverTarget) this.subjectPopoverTarget.hidden = true
    if (this.hasSubjectDraftTarget) this.subjectDraftTarget.value = ""
    if (this.hasSubjectErrorTarget) this.subjectErrorTarget.hidden = true
  }

  closeSubjectOnOutside(event) {
    if (!this.hasSubjectPopoverTarget || this.subjectPopoverTarget.hidden) return
    if (event.target.closest("[data-subject-root]")) return
    this.closeSubjectPopover()
  }

  addSubject(event) {
    event?.preventDefault?.()
    if (!this.hasSubjectDraftTarget || !this.hasSubjectListTarget) return
    const name = this.subjectDraftTarget.value.trim().replace(/\s+/g, " ")
    if (!name) return
    const existing = [...this.subjectListTarget.querySelectorAll("input")].map((input) => input.value.toLowerCase())
    if (existing.includes(name.toLowerCase())) {
      if (this.hasSubjectErrorTarget) {
        this.subjectErrorTarget.textContent = this.t("teachers", "subject_duplicate")
        this.subjectErrorTarget.hidden = false
      }
      return
    }
    const chip = document.createElement("span")
    chip.className = "teachers-page__subject-chip"
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = "subjects[]"
    input.value = name
    const label = document.createElement("span")
    label.textContent = name
    const button = document.createElement("button")
    button.type = "button"
    button.dataset.action = "teachers#removeSubject"
    button.setAttribute("aria-label", this.t("teachers", "remove_subject"))
    button.textContent = "×"
    chip.append(input, label, button)
    this.subjectListTarget.append(chip)
    this.closeSubjectPopover()
  }

  removeSubject(event) {
    event.currentTarget.closest(".teachers-page__subject-chip")?.remove()
  }

  setCalendarColor(event) {
    const value = event.currentTarget.dataset.color
    if (this.hasCalendarColorTarget) this.calendarColorTarget.value = value
    this.element.querySelectorAll("[data-color]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.color === value ? "true" : "false")
    })
  }

  toast(event) {
    const message = event.currentTarget.dataset.message
    if (message) this.showToast(message)
  }

  openAbsence() {
    this.loadAbsenceDialog()
  }

  openAbsenceEdit(event) {
    const absenceId = event?.currentTarget?.dataset?.absenceId
    if (!absenceId) return
    this.loadAbsenceDialog(absenceId)
  }

  loadAbsenceDialog(absenceId) {
    const frame = this.absenceFrameElement()
    if (!frame) return

    const showDialog = () => {
      const dialog = this.absenceDialogElement(frame)
      if (!dialog) return
      dialog.classList.add("is-open")
      openModal(dialog, { onClose: () => this.closeAbsence() })
    }

    const baseUrl = this.absenceDialogUrlValue
    if (!baseUrl) return

    const url = new URL(baseUrl, window.location.origin)
    if (absenceId) url.searchParams.set("absence_id", absenceId)

    if (this.absenceDialogElement(frame) && frame.getAttribute("src") === url.toString()) {
      showDialog()
      return
    }

    frame.innerHTML = ""
    frame.removeAttribute("src")

    const onLoad = (event) => {
      if (event.target !== frame) return
      showDialog()
    }
    frame.addEventListener("turbo:frame-load", onLoad, { once: true })
    frame.src = url.toString()
  }

  closeAbsence() {
    const frame = this.absenceFrameElement()
    const dialog = frame ? this.absenceDialogElement(frame) : null
    if (dialog) {
      dialog.classList.remove("is-open")
      closeModal(dialog)
    }
    if (frame) {
      frame.innerHTML = ""
      frame.removeAttribute("src")
    }
    this.resetPageScroll()
  }

  absenceFrameElement() {
    if (this.hasAbsenceFrameTarget) return this.absenceFrameTarget
    return document.getElementById("absence_dialog")
  }

  absenceDialogElement(frame) {
    if (this.hasAbsenceDialogTarget) return this.absenceDialogTarget
    if (frame) return frame.querySelector("#teacher-absence-dialog")
    return document.getElementById("teacher-absence-dialog")
  }

  openAffectedLessons(event) {
    const absenceId = event?.currentTarget?.dataset?.absenceId
    if (absenceId) this.openAffectedLessonsById(absenceId)
  }

  openAffectedLessonsById(absenceId) {
    const frame = this.affectedLessonsFrameElement()
    if (!frame || !this.teacherIdValue || !absenceId) return

    const showDialog = () => {
      this.closeAbsence()
      const dialog = this.affectedLessonsDialogElement(frame)
      if (!dialog) {
        this.resetPageScroll()
        return
      }
      dialog.classList.add("is-open")
      dialog.removeAttribute("hidden")
      openModal(dialog, { onClose: () => this.closeAffectedLessons() })
    }

    if (this.affectedLessonsDialogElement(frame)) {
      showDialog()
      return
    }

    const onLoad = (event) => {
      if (event.target !== frame) return
      window.requestAnimationFrame(() => showDialog())
    }
    const onMissing = () => {
      this.resetPageScroll()
      delete frame.dataset.keepOpen
    }
    frame.addEventListener("turbo:frame-load", onLoad, { once: true })
    frame.addEventListener("turbo:frame-missing", onMissing, { once: true })
    const template = this.affectedLessonsUrlValue
    if (!template) return
    frame.dataset.keepOpen = "true"
    frame.src = template.replace("__ABSENCE__", encodeURIComponent(absenceId))
  }

  closeAffectedLessons() {
    const frame = this.affectedLessonsFrameElement()
    const dialog = frame ? this.affectedLessonsDialogElement(frame) : null
    if (dialog) {
      dialog.classList.remove("is-open")
      closeModal(dialog)
    }
    if (frame) {
      frame.innerHTML = ""
      frame.removeAttribute("src")
      delete frame.dataset.keepOpen
    }
    const reschedule = document.getElementById("affected_lesson_reschedule")
    if (reschedule) {
      reschedule.innerHTML = ""
      reschedule.removeAttribute("src")
    }
    this.resetPageScroll()
  }

  resetPageScroll() {
    document.body.style.overflow = ""
    delete document.body.dataset.modalDepth
    delete document.body.dataset.modalOverflow
  }

  stripManageAbsenceParam() {
    if (!window.history?.replaceState) return
    const url = new URL(window.location.href)
    if (!url.searchParams.has("manage_absence")) return
    url.searchParams.delete("manage_absence")
    window.history.replaceState({}, "", url.toString())
  }

  affectedLessonsFrameElement() {
    if (this.hasAffectedLessonsFrameTarget) return this.affectedLessonsFrameTarget
    return document.getElementById("affected_lessons_dialog")
  }

  affectedLessonsDialogElement(frame) {
    if (this.hasAffectedLessonsDialogTarget) return this.affectedLessonsDialogTarget
    if (frame) return frame.querySelector("#teacher-affected-lessons-dialog")
    return document.getElementById("teacher-affected-lessons-dialog")
  }

  openArchiveLessons() {
    const frame = this.archiveLessonsFrameElement()
    const url = this.archiveLessonsDialogUrlValue
    if (!frame || !url) return

    const showDialog = () => {
      const dialog = this.archiveLessonsDialogElement(frame)
      if (!dialog) {
        this.resetPageScroll()
        return
      }
      dialog.classList.add("is-open")
      dialog.removeAttribute("hidden")
      openModal(dialog, { onClose: () => this.closeArchiveLessons() })
    }

    if (this.archiveLessonsDialogElement(frame)) {
      showDialog()
      return
    }

    const onLoad = (event) => {
      if (event.target !== frame) return
      window.requestAnimationFrame(() => showDialog())
    }
    frame.addEventListener("turbo:frame-load", onLoad, { once: true })
    frame.src = url
  }

  closeArchiveLessons() {
    const frame = this.archiveLessonsFrameElement()
    const dialog = frame ? this.archiveLessonsDialogElement(frame) : null
    if (dialog) {
      dialog.classList.remove("is-open")
      closeModal(dialog)
    }
    if (frame) {
      frame.innerHTML = ""
      frame.removeAttribute("src")
    }
    this.resetPageScroll()
  }

  stripManageArchiveParam() {
    if (!window.history?.replaceState) return
    const url = new URL(window.location.href)
    if (!url.searchParams.has("manage_archive")) return
    url.searchParams.delete("manage_archive")
    window.history.replaceState({}, "", url.toString())
  }

  archiveLessonsFrameElement() {
    if (this.hasArchiveLessonsFrameTarget) return this.archiveLessonsFrameTarget
    return document.getElementById("archive_lessons_dialog")
  }

  archiveLessonsDialogElement(frame) {
    if (this.hasArchiveLessonsDialogTarget) return this.archiveLessonsDialogTarget
    if (frame) return frame.querySelector("#teacher-archive-lessons-dialog")
    return document.getElementById("teacher-archive-lessons-dialog")
  }

}
