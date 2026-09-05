import { Controller } from "@hotwired/stimulus"

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

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
    "absenceList",
    "absenceEmpty",
    "absenceType",
    "absenceStart",
    "absenceEnd",
    "absenceNote"
  ]

  static values = {
    i18n: Object,
    name: String,
    editing: Boolean
  }

  connect() {
    this.statsFilter = "all"
    this.removeId = null
    this.photoUrl = ""
    this.dirty = false
    this.touched = new Set()
    if (this.hasNotesTarget) this.updateNotesCount()
    if (this.hasInitialsPreviewTarget) this.updateInitials()
    this.syncHoursUi()
    this.syncCustomDuration()
    this.boundPointer = this.closeSubjectOnOutside.bind(this)
    document.addEventListener("mousedown", this.boundPointer)
    if (this.hasAssignedRowTarget) this.filterAssigned()
    if (this.hasRowTarget) this.filter()
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
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

  markDirty() {
    this.dirty = true
  }

  confirmLeave(event) {
    if (!this.dirty) return
    const key = this.editingValue ? "leave_unsaved_edit" : "leave_unsaved_create"
    if (!window.confirm(this.t("teachers", key))) event.preventDefault()
  }

  syncLessonTypeRequirement() {
    const status = this.hasFormStatusTarget ? this.formStatusTarget.value : "active"
    const host = this.element.querySelector("[data-controller~='lesson-types']") || this.element
    const lessonTypes = this.application.getControllerForElementAndIdentifier(host, "lesson-types")
    if (lessonTypes) lessonTypes.requireActiveValue = status === "active"
  }

  markTouched(event) {
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
    const hoursError = this.hasHoursRowTarget ? this.hoursErrorMessage() : null
    if (this.hasHoursErrorTarget) {
      this.hoursErrorTarget.textContent = hoursError || ""
      this.hoursErrorTarget.hidden = !hoursError
    }
    const errors = this.validate()
    this.renderErrors(errors)
    if (Object.keys(errors).length > 0 || hoursError) {
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
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

  hoursErrorMessage() {
    for (const row of this.hoursRowTargets) {
      if (row.hidden) continue
      const start = row.querySelector('[data-role="start"]')?.value
      const end = row.querySelector('[data-role="end"]')?.value
      if (!start || !end) return this.t("teachers", "working_hours_error")
      if (end <= start) return this.t("teachers", "hours_order_error")
    }
    return null
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
    if (this.hasAbsenceDialogTarget) this.absenceDialogTarget.hidden = false
  }

  closeAbsence() {
    if (this.hasAbsenceDialogTarget) this.absenceDialogTarget.hidden = true
  }

  confirmAbsence() {
    const type = this.hasAbsenceTypeTarget ? this.absenceTypeTarget.selectedOptions[0]?.textContent : "Absence"
    const start = this.hasAbsenceStartTarget ? this.absenceStartTarget.value : ""
    const end = this.hasAbsenceEndTarget ? this.absenceEndTarget.value : start
    if (!start) return
    if (this.hasAbsenceEmptyTarget) this.absenceEmptyTarget.hidden = true
    if (this.hasAbsenceListTarget) {
      const item = document.createElement("li")
      item.innerHTML = `<div class="teachers-page__assigned-main"><div><p class="teachers-page__name">${type}</p><p class="teachers-page__meta">${start} – ${end || start}</p></div></div>`
      this.absenceListTarget.prepend(item)
    }
    this.closeAbsence()
    this.showToast(this.t("teachers", "absence_recorded") || "Absence recorded.")
  }
}
