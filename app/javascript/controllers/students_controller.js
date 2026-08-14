import { Controller } from "@hotwired/stimulus"

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
    "dialog",
    "assignSelect",
    "stat",
    "firstName",
    "lastName"
  ]

  connect() {
    this.statsFilter = "all"
    this.assignIds = []
    this.filter()
  }

  filter() {
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
        ? "No students match your filters"
        : "No students yet"
    }
    if (this.hasEmptyTextTarget) {
      this.emptyTextTarget.textContent = hasFilters
        ? "Try a different search or clear the filters."
        : "Add your first student to keep contact and lesson details organized."
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
    const selected = this.visibleCheckboxes().filter((box) => box.checked)
    if (this.hasBulkTarget) {
      this.bulkTarget.classList.toggle("students-page__bulk--hidden", selected.length === 0)
    }
    if (this.hasBulkCountTarget) {
      this.bulkCountTarget.textContent = `${selected.length} selected`
    }
    if (this.hasSelectAllTarget) {
      const visible = this.visibleCheckboxes()
      this.selectAllTarget.checked = visible.length > 0 && selected.length === visible.length
    }
  }

  openAssign() {
    this.assignIds = this.visibleCheckboxes()
      .filter((box) => box.checked)
      .map((box) => box.dataset.id)
    this.showDialog()
  }

  openAssignFor(event) {
    this.assignIds = [event.currentTarget.dataset.id]
    this.showDialog()
  }

  closeAssign() {
    if (this.hasDialogTarget) this.dialogTarget.hidden = true
  }

  confirmAssign() {
    const teacherId = this.hasAssignSelectTarget ? this.assignSelectTarget.value : ""
    if (!teacherId || this.assignIds.length === 0) {
      this.closeAssign()
      return
    }

    const option = this.assignSelectTarget.selectedOptions[0]
    const teacherName = option?.textContent?.trim() || "Teacher"

    this.rowTargets.forEach((row) => {
      const box = row.querySelector('[data-students-target="checkbox"]')
      if (!box || !this.assignIds.includes(box.dataset.id)) return
      row.dataset.teacherId = teacherId
      row.dataset.assigned = "1"
      const teacherCell = row.querySelector(".students-page__teacher")
      if (teacherCell) {
        teacherCell.innerHTML = `<button class="students-page__teacher-btn" type="button" data-action="students#openAssignFor" data-id="${box.dataset.id}"><span class="students-page__avatar students-page__avatar--sm">T</span><span>${teacherName}</span></button>`
      }
    })

    this.closeAssign()
    this.filter()
  }

  updateInitials() {
    // Form helper reserved for future preview; no-op keeps Stimulus stable.
  }

  showDialog() {
    if (this.hasDialogTarget) this.dialogTarget.hidden = false
  }

  visibleCheckboxes() {
    return this.checkboxTargets.filter((box) => {
      const row = box.closest('[data-students-target="row"]')
      return row && !row.classList.contains("students-page__row--hidden")
    })
  }
}
