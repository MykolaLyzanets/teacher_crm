import { Controller } from "@hotwired/stimulus"

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default class extends Controller {
  static targets = [
    "search",
    "status",
    "teacher",
    "row",
    "empty",
    "emptyTitle",
    "emptyText",
    "addBtn",
    "table",
    "selectAll",
    "checkbox",
    "bulk",
    "bulkCount",
    "assignSearch",
    "assignOption",
    "assignEmpty",
    "stat",
    "firstName",
    "lastName",
    "preferredName",
    "initialsPreview",
    "photoInput",
    "photoImage",
    "photoPick",
    "photoRemove",
    "photoError",
    "removePhotoInput",
    "email",
    "formStatus",
    "parentName",
    "parentEmail",
    "parentPhone",
    "notes",
    "notesCount",
    "formAlert",
    "submitBtn",
    "toast",
    "assignedBlock",
    "unassignedBlock",
    "assignBadge",
    "teacherAvatar",
    "teacherName",
    "teacherMeta",
    "teacherLink",
    "removeDialog",
    "unassignForm",
    "formStatus",
    "parentName",
    "parentEmail",
    "parentPhone",
    "notes",
    "notesCount",
    "formAlert",
    "submitBtn",
    "toast",
    "assignedBlock",
    "unassignedBlock",
    "assignBadge",
    "teacherAvatar",
    "teacherName",
    "teacherMeta",
    "teacherLink",
    "removeDialog",
    "unassignForm",
    "inviteCheckbox",
    "menu",
    "menuButton",
    "statusValue",
    "statusButton",
    "statusMenu",
    "statusBadge",
    "lessonRow",
    "lessonsEmpty",
    "lessonsTable",
    "cancelTip"
  ]

  static values = {
    i18n: Object,
    editing: Boolean,
    studentId: String,
    materialsUrl: { type: String, default: "/materials" },
  }

  connect() {
    this.statsFilter = "all"
    this.touched = new Set()
    this.photoUrl = ""
    this.boundCloseMenu = this.closeMenu.bind(this)
    this.boundCloseStatusMenu = this.closeStatusMenu.bind(this)
    document.addEventListener("click", this.boundCloseMenu)
    window.addEventListener("resize", this.boundCloseStatusMenu)
    window.addEventListener("scroll", this.boundCloseStatusMenu, true)
    if (this.hasRowTarget) this.filter()
    if (this.hasInitialsPreviewTarget) this.updateInitials()
    if (this.hasNotesTarget) this.updateNotesCount()
  }

  disconnect() {
    document.removeEventListener("click", this.boundCloseMenu)
    window.removeEventListener("resize", this.boundCloseStatusMenu)
    window.removeEventListener("scroll", this.boundCloseStatusMenu, true)
    this.hideCancelTip()
    window.clearTimeout(this.toastTimer)
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
      if (this.hasEmptyTarget) this.emptyTarget.classList.remove("students-page__empty--hidden")
      if (this.hasTableTarget) this.tableTarget.hidden = true
      if (this.hasEmptyTitleTarget) this.emptyTitleTarget.textContent = this.t("students", "empty_title")
      if (this.hasEmptyTextTarget) this.emptyTextTarget.textContent = this.t("students", "empty_text")
      if (this.hasAddBtnTarget) this.addBtnTarget.classList.remove("students-page__empty-add--hidden")
      return
    }

    const query = this.hasSearchTarget ? this.searchTarget.value.trim().toLowerCase() : ""
    const status = this.hasStatusTarget ? this.statusTarget.value : ""
    const teacher = this.hasTeacherTarget ? this.teacherTarget.value : "all"
    let visible = 0

    this.rowTargets.forEach((row) => {
      const matchesQuery =
        !query ||
        row.dataset.name?.includes(query) ||
        row.dataset.email?.includes(query)
      const matchesStatus = !status || row.dataset.status === status
      let matchesTeacher = true

      if (teacher === "assigned") matchesTeacher = row.dataset.assigned === "1"
      else if (teacher === "unassigned") matchesTeacher = row.dataset.assigned !== "1"
      else if (teacher !== "all") matchesTeacher = row.dataset.teacherId === teacher

      let matchesStats = true
      if (this.statsFilter === "active") matchesStats = row.dataset.status === "active"
      if (this.statsFilter === "assigned") matchesStats = row.dataset.assigned === "1"
      if (this.statsFilter === "unassigned") matchesStats = row.dataset.assigned !== "1"
      if (this.statsFilter === "newThisMonth") {
        const created = row.dataset.created ? new Date(row.dataset.created) : null
        const now = new Date()
        matchesStats =
          !!created &&
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth()
      }

      const show = matchesQuery && matchesStatus && matchesTeacher && matchesStats
      row.classList.toggle("students-page__row--hidden", !show)
      const box = row.querySelector('[data-students-target="checkbox"]')
      if (box) box.disabled = !show
      if (show) visible += 1
    })

    const hasFilters =
      !!query ||
      !!status ||
      teacher !== "all" ||
      this.statsFilter !== "all"

    if (this.hasEmptyTarget) {
      this.emptyTarget.classList.toggle("students-page__empty--hidden", visible > 0)
    }
    if (this.hasTableTarget) {
      this.tableTarget.hidden = visible === 0
    }
    if (this.hasEmptyTitleTarget) {
      this.emptyTitleTarget.textContent = hasFilters
        ? this.t("students", "empty_filtered_title")
        : this.t("students", "empty_title")
    }
    if (this.hasEmptyTextTarget) {
      this.emptyTextTarget.textContent = hasFilters
        ? this.t("students", "empty_filtered_text")
        : this.t("students", "empty_text")
    }
    if (this.hasAddBtnTarget) {
      this.addBtnTarget.classList.toggle("students-page__empty-add--hidden", hasFilters)
    }

    this.syncSelection()
  }

  setStatsFilter(event) {
    const filter = event.currentTarget.dataset.filter
    this.statsFilter = this.statsFilter === filter ? "all" : filter

    this.statTargets.forEach((stat) => {
      const active = stat.dataset.filter === this.statsFilter && this.statsFilter !== "all"
      stat.setAttribute("aria-pressed", active ? "true" : "false")
    })

    if (this.statsFilter === "active" && this.hasStatusTarget) {
      this.statusTarget.value = "active"
    } else if (this.hasStatusTarget && ["all", "assigned", "unassigned", "newThisMonth"].includes(this.statsFilter)) {
      if (this.statsFilter !== "active") this.statusTarget.value = ""
    }

    if (this.hasTeacherTarget) {
      if (this.statsFilter === "assigned") this.teacherTarget.value = "assigned"
      else if (this.statsFilter === "unassigned") this.teacherTarget.value = "unassigned"
      else if (this.statsFilter === "all" || this.statsFilter === "active" || this.statsFilter === "newThisMonth") {
        if (["assigned", "unassigned"].includes(this.teacherTarget.value)) {
          this.teacherTarget.value = "all"
        }
      }
    }

    this.filter()
  }

  toggleAll() {
    const checked = this.selectAllTarget.checked
    this.visibleCheckboxes().forEach((box) => {
      box.checked = checked
    })
    this.syncSelection()
  }

  syncSelection() {
    if (!this.hasCheckboxTarget) return
    const selected = this.visibleCheckboxes().filter((box) => box.checked)
    if (this.hasBulkTarget) {
      this.bulkTarget.classList.toggle("students-page__bulk--hidden", selected.length === 0)
    }
    if (this.hasBulkCountTarget) {
      this.bulkCountTarget.textContent = this.t("common", "selected", { count: selected.length })
    }
    if (this.hasSelectAllTarget) {
      const visible = this.visibleCheckboxes()
      this.selectAllTarget.checked = visible.length > 0 && selected.length === visible.length
    }
  }

  ignoreSearchEnter(event) {
    if (event.key === "Enter") event.preventDefault()
  }

  filterTeachers() {
    const query = this.hasAssignSearchTarget ? this.assignSearchTarget.value.trim().toLowerCase() : ""
    let visible = 0
    if (this.hasAssignOptionTarget) {
      this.assignOptionTargets.forEach((option) => {
        const show = !query || option.dataset.name?.includes(query)
        const item = option.closest("li")
        if (item) item.hidden = !show
        if (show) visible += 1
      })
    }
    if (this.hasAssignEmptyTarget) {
      this.assignEmptyTarget.classList.toggle("students-page__is-hidden", visible > 0)
    }
  }

  toggleMenu(event) {
    event.stopPropagation()
    this.closeStatusMenu()
    if (!this.hasMenuTarget) return
    const open = this.menuTarget.hidden
    this.menuTarget.hidden = !open
    if (this.hasMenuButtonTarget) {
      this.menuButtonTarget.setAttribute("aria-expanded", String(open))
    }
  }

  closeMenu() {
    if (this.hasMenuTarget) this.menuTarget.hidden = true
    if (this.hasMenuButtonTarget) this.menuButtonTarget.setAttribute("aria-expanded", "false")
    this.closeStatusMenu()
  }

  toggleStatusMenu(event) {
    event.stopPropagation()
    if (!this.hasStatusMenuTarget) return
    if (this.hasMenuTarget) this.menuTarget.hidden = true
    if (this.hasMenuButtonTarget) this.menuButtonTarget.setAttribute("aria-expanded", "false")
    const open = this.statusMenuTarget.hidden
    this.statusMenuTarget.hidden = !open
    if (this.hasStatusButtonTarget) {
      this.statusButtonTarget.setAttribute("aria-expanded", String(open))
    }
    if (open) this.positionStatusMenu()
  }

  positionStatusMenu() {
    if (!this.hasStatusMenuTarget || !this.hasStatusButtonTarget) return
    const menu = this.statusMenuTarget
    const rect = this.statusButtonTarget.getBoundingClientRect()
    const gap = 8
    menu.style.position = "fixed"
    menu.style.left = `${Math.max(12, rect.left)}px`
    menu.style.right = "auto"
    menu.style.marginTop = "0"
    menu.style.zIndex = "80"
    const spaceBelow = window.innerHeight - rect.bottom
    const height = menu.offsetHeight
    if (spaceBelow < height + gap + 8 && rect.top > height + gap) {
      menu.style.top = `${Math.max(12, rect.top - height - gap)}px`
    } else {
      menu.style.top = `${rect.bottom + gap}px`
    }
  }

  closeStatusMenu() {
    if (this.hasStatusMenuTarget) this.statusMenuTarget.hidden = true
    if (this.hasStatusButtonTarget) this.statusButtonTarget.setAttribute("aria-expanded", "false")
    this.hideCancelTip()
  }

  showCancelTip(event) {
    const reason = (event.currentTarget.dataset.cancelReason || "").trim()
    if (!reason || !this.hasCancelTipTarget) return
    const tip = this.cancelTipTarget
    tip.textContent = reason
    tip.hidden = false
    const rect = event.currentTarget.getBoundingClientRect()
    const gap = 8
    const width = tip.offsetWidth
    const height = tip.offsetHeight
    let top = rect.top - height - gap
    if (top < 8) top = rect.bottom + gap
    let left = rect.left + (rect.width / 2) - (width / 2)
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8)
    tip.style.top = `${top}px`
    tip.style.left = `${left}px`
  }

  hideCancelTip() {
    if (!this.hasCancelTipTarget) return
    this.cancelTipTarget.hidden = true
  }

  stopStatusMenu() {}

  chooseStatus(event) {
    const button = event.currentTarget
    const value = button.dataset.status
    if (!value || !this.hasStatusValueTarget) return
    if (this.statusValueTarget.value === value) {
      this.closeStatusMenu()
      return
    }

    this.statusValueTarget.value = value
    if (this.hasStatusBadgeTarget) {
      this.statusBadgeTarget.textContent = button.dataset.label || button.textContent.trim()
      this.statusBadgeTarget.className = `status-badge status-badge--${button.dataset.tone || "neutral"}`
    }
    this.statusMenuTarget?.querySelectorAll(".students-page__status-option").forEach((option) => {
      const current = option.dataset.status === value
      option.classList.toggle("is-current", current)
      option.setAttribute("aria-selected", String(current))
    })
    this.closeStatusMenu()
    button.closest("form")?.requestSubmit()
  }

  shareMaterial(event) {
    event.preventDefault()
    event.stopPropagation()
    this.closeMenu()
    const id = this.studentIdValue
    if (!id) return
    const base = String(this.materialsUrlValue || "/materials").replace(/\/$/, "")
    window.location.assign(`${base}?student_id=${encodeURIComponent(id)}`)
  }

  filterLessons(event) {
    const filter = event.currentTarget.value
    const rows = this.hasLessonRowTarget ? this.lessonRowTargets : []
    rows.forEach((row) => {
      const upcoming = row.dataset.upcoming === "1"
      const completed = row.dataset.status === "completed"
      const cancelled = row.dataset.cancelled === "1"
      let show = true
      if (filter === "upcoming") show = upcoming
      else if (filter === "completed") show = completed
      else if (filter === "cancelled") show = cancelled
      row.hidden = !show
    })
    const visible = rows.some((row) => !row.hidden)
    if (this.hasLessonsEmptyTarget) this.lessonsEmptyTarget.hidden = visible
    if (this.hasLessonsTableTarget) this.lessonsTableTarget.hidden = !visible
  }

  openRemove() {
    if (this.hasRemoveDialogTarget) this.removeDialogTarget.hidden = false
  }

  closeRemove() {
    if (this.hasRemoveDialogTarget) this.removeDialogTarget.hidden = true
  }

  confirmRemove() {
    if (!this.hasUnassignFormTarget) return
    this.unassignFormTarget.requestSubmit()
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
      this.setPhotoError(this.t("students", "photo_type_error"))
      this.photoInputTarget.value = ""
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.setPhotoError(this.t("students", "photo_size_error"))
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
      if (label) label.textContent = this.t("students", "replace_photo")
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
      if (label) label.textContent = this.t("students", "choose_file")
    }
  }

  setPhotoError(message) {
    if (!this.hasPhotoErrorTarget) return
    this.photoErrorTarget.textContent = message || ""
    this.photoErrorTarget.hidden = !message
  }

  updateInitials() {
    if (!this.hasInitialsPreviewTarget) return
    const preferred = this.hasPreferredNameTarget ? this.preferredNameTarget.value.trim() : ""
    const first = this.hasFirstNameTarget ? this.firstNameTarget.value.trim() : ""
    const last = this.hasLastNameTarget ? this.lastNameTarget.value.trim() : ""
    const source = preferred || [first || "S", last || "T"].join(" ")
    const parts = source.split(/\s+/).filter(Boolean)
    let initials = "ST"
    if (parts.length === 1) initials = parts[0].slice(0, 2).toUpperCase()
    else if (parts.length > 1) initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    this.initialsPreviewTarget.textContent = initials
  }

  updateNotesCount() {
    if (!this.hasNotesTarget || !this.hasNotesCountTarget) return
    this.notesCountTarget.textContent = `${this.notesTarget.value.length}/300`
  }

  markTouched(event) {
    const map = {
      first_name: "firstName",
      last_name: "lastName",
      email: "email",
      status: "status",
      parent_name: "parentName",
      parent_email: "parentEmail",
      parent_phone: "parentPhone",
      notes: "notes",
      invite_to_workspace: "email"
    }
    const key = map[event.currentTarget.name]
    if (key) {
      this.touched.add(key)
      this.renderErrors(this.validate())
    }
  }

  validateSubmit(event) {
    this.touched = new Set([
      "firstName", "lastName", "email", "status",
      "parentName", "parentEmail", "parentPhone", "notes"
    ])
    const errors = this.validate()
    this.renderErrors(errors)
    if (Object.keys(errors).length > 0) {
      event.preventDefault()
      if (this.hasFormAlertTarget) this.formAlertTarget.hidden = false
      this.revealFirstError()
      return
    }
    if (this.hasFormAlertTarget) this.formAlertTarget.hidden = true
    this.markSubmitting()
  }

  revealFirstError() {
    const invalid = this.element.querySelector(".students-page__field--invalid")
    const focusable = invalid?.querySelector("input, select, textarea")
    if (focusable) {
      focusable.focus({ preventScroll: true })
      invalid.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    this.hasFormAlertTarget && this.formAlertTarget.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  markSubmitting() {
    window.setTimeout(() => {
      this.submitBtnTargets.forEach((btn) => {
        btn.textContent = this.t("students", this.editingValue ? "saving" : "creating")
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
    const parentEmail = this.hasParentEmailTarget ? this.parentEmailTarget.value.trim() : ""
    const notes = this.hasNotesTarget ? this.notesTarget.value : ""

    if (!first) errors.firstName = this.t("students", "enter_first_name")
    if (!last) errors.lastName = this.t("students", "enter_last_name")
    if (!email || !EMAIL_RE.test(email)) errors.email = this.t("students", "enter_email")
    if (!status) errors.status = this.t("students", "select_status")
    if (parentEmail && !EMAIL_RE.test(parentEmail)) errors.parentEmail = this.t("students", "enter_email")
    if (notes.length > 300) errors.notes = this.t("students", "notes_too_long")
    return errors
  }

  renderErrors(errors) {
    this.element.querySelectorAll(".students-page__field--invalid").forEach((field) => {
      field.classList.remove("students-page__field--invalid")
    })
    this.element.querySelectorAll("[data-error-for]").forEach((node) => {
      const key = node.dataset.errorFor
      const show = this.touched.has(key) && errors[key]
      node.textContent = show ? errors[key] : ""
      node.hidden = !show
      const field = node.closest(".students-page__field")
      field?.classList.toggle("students-page__field--invalid", Boolean(show))
    })
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

  toastMessage(event) {
    this.showToast(event.currentTarget.dataset.message || "")
  }

  visibleCheckboxes() {
    if (!this.hasCheckboxTarget) return []
    return this.checkboxTargets.filter((box) => {
      const row = box.closest('[data-students-target="row"]')
      return row && !row.classList.contains("students-page__row--hidden")
    })
  }
}
