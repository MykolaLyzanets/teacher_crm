import { Controller } from "@hotwired/stimulus"

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
    "notesCount"
  ]

  connect() {
    if (this.hasRowTarget) {
      this.statsFilterValue = "all"
      this.filter()
    }
    if (this.hasNotesTarget) this.updateNotesCount()
    if (this.hasInitialsPreviewTarget) this.updateInitials()
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
          ? "No teachers match your filters"
          : "No teachers yet"
      }
      if (this.hasEmptyTextTarget) {
        this.emptyTextTarget.textContent = hasFilters
          ? "Try a different search or clear the active filters."
          : "Add your first teacher to assign lessons and manage access."
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
}
