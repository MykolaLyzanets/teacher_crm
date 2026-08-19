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
    "inviteToggle",
    "inviteFields",
    "notes",
    "notesCount",
    "photoInput",
    "photoImage",
    "photoPick",
    "photoRemove",
    "photoError",
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
    "assignDialog",
    "assignBox",
    "removeDialog",
    "removeConfirm",
    "toast"
  ]

  static values = {
    i18n: Object,
    name: String
  }

  connect() {
    this.removeId = null
    this.photoUrl = ""
    if (this.hasRowTarget) {
      this.statsFilterValue = "all"
      this.filter()
    }
    if (this.hasNotesTarget) this.updateNotesCount()
    if (this.hasInitialsPreviewTarget) this.updateInitials()
    this.syncHoursUi()
    this.syncCustomDuration()
    this.boundPointer = this.closeSubjectOnOutside.bind(this)
    document.addEventListener("mousedown", this.boundPointer)
    if (this.hasAssignedRowTarget) this.filterAssigned()
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
    if (!this.hasRowTarget) return

    const query = (this.hasSearchTarget ? this.searchTarget.value : "").trim().toLowerCase()
    const status = this.hasStatusTarget ? this.statusTarget.value : ""
    const assignment = this.hasAssignmentTarget ? this.assignmentTarget.value : "all"
    const statsFilter = this.statsFilterValue || "all"

    let visible = 0

    this.rowTargets.forEach((row) => {
      const haystack = (row.dataset.search || "").toLowerCase()
      const rowStatus = row.dataset.status || ""
      const assigned = row.dataset.assigned === "1"
      const newMonth = row.dataset.newMonth === "1"

      let show = true
      if (query && !haystack.includes(query)) show = false
      if (status && rowStatus !== status) show = false
      if ((statsFilter === "withStudents" || assignment === "assigned") && !assigned) show = false
      if (statsFilter === "active" && rowStatus !== "active") show = false
      if (statsFilter === "newThisMonth" && !newMonth) show = false

      row.classList.toggle("teachers-page__row--hidden", !show)
      if (show) visible += 1
    })

    const hasFilters = Boolean(
      query || status || assignment === "assigned" || statsFilter === "newThisMonth"
    )

    if (this.hasTableTarget) {
      this.tableTarget.classList.toggle("teachers-page__table--hidden", visible === 0)
      this.tableTarget.hidden = visible === 0
    }

    if (this.hasEmptyTarget) {
      this.emptyTarget.classList.toggle("teachers-page__empty--hidden", visible > 0)
    }

    if (visible === 0) {
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
      if (this.hasClearBtnTarget) this.clearBtnTarget.hidden = !hasFilters
      if (this.hasAddBtnTarget) {
        this.addBtnTarget.classList.toggle("teachers-page__empty-add--hidden", hasFilters)
      }
    }

    if (this.hasNewChipTarget) {
      this.newChipTarget.classList.toggle(
        "teachers-page__chip--hidden",
        statsFilter !== "newThisMonth"
      )
    }

    this.syncStatsPressed()
  }

  statsFilter(event) {
    const filter = event.currentTarget.dataset.filter
    if (!filter) return

    if (filter === "lessonsThisMonth") return

    this.statsFilterValue = filter

    if (filter === "active" && this.hasStatusTarget) {
      this.statusTarget.value = "active"
      if (this.hasAssignmentTarget) this.assignmentTarget.value = "all"
    } else if (filter === "withStudents") {
      if (this.hasStatusTarget) this.statusTarget.value = ""
      if (this.hasAssignmentTarget) this.assignmentTarget.value = "assigned"
    } else if (filter === "all" || filter === "newThisMonth") {
      if (this.hasStatusTarget) this.statusTarget.value = ""
      if (this.hasAssignmentTarget) this.assignmentTarget.value = "all"
    }

    this.filter()
  }

  clearFilters() {
    if (this.hasSearchTarget) this.searchTarget.value = ""
    if (this.hasStatusTarget) this.statusTarget.value = ""
    if (this.hasAssignmentTarget) this.assignmentTarget.value = "all"
    this.statsFilterValue = "all"
    this.filter()
  }

  syncStatsPressed() {
    if (!this.hasStatTarget) return
    const active = this.statsFilterValue || "all"
    this.statTargets.forEach((stat) => {
      const isActive = stat.dataset.filter === active
      stat.setAttribute("aria-pressed", isActive ? "true" : "false")
    })
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
  }

  removePhoto() {
    this.clearPhoto()
    if (this.hasPhotoInputTarget) this.photoInputTarget.value = ""
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

  validateHours(event) {
    this.syncCustomDuration()
    const hoursError = this.hasHoursRowTarget ? this.hoursErrorMessage() : null
    if (this.hasHoursErrorTarget) {
      this.hoursErrorTarget.textContent = hoursError || ""
      this.hoursErrorTarget.hidden = !hoursError
    }
    if (hoursError) event.preventDefault()
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
}
