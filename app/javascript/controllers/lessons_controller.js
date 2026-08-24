import { Controller } from "@hotwired/stimulus"

const TONES = { completed: "olive", cancelled: "rose", upcoming: "amber" }

export default class extends Controller {
  static targets = [
    "toast",
    "tab",
    "search",
    "teacher",
    "from",
    "to",
    "catalogEmpty",
    "filterEmpty",
    "table",
    "row",
    "menu",
    "menuBtn",
    "drawer",
    "drawerTitle",
    "drawerSubtitle",
    "drawerMenu",
    "drawerCancelItem",
    "drawerMissing",
    "drawerContent",
    "drawerBadge",
    "drawerDate",
    "drawerTime",
    "drawerTeacher",
    "drawerParty",
    "drawerPrice",
    "drawerVideoIcon",
    "drawerPinIcon",
    "drawerFormat",
    "drawerMeeting",
    "drawerPlace",
    "drawerNotesRow",
    "drawerNotes",
    "drawerFoot",
    "confirm",
    "confirmTitle",
    "confirmText",
    "confirmBtn",
    "outcome"
  ]

  static values = {
    i18n: Object,
    calendarUrl: String,
    tab: { type: String, default: "all" }
  }

  connect() {
    this.pending = null
    this.activeRow = null
    this.boundPointer = this.onPointerDown.bind(this)
    this.boundKey = this.onKeydown.bind(this)
    document.addEventListener("mousedown", this.boundPointer)
    document.addEventListener("keydown", this.boundKey)
    this.filter()
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    document.removeEventListener("keydown", this.boundKey)
    if (this.toastTimer) window.clearTimeout(this.toastTimer)
  }

  t(key) {
    return this.i18nValue?.lessons?.[key] || this.i18nValue?.common?.[key] || key
  }

  selectTab(event) {
    this.tabValue = event.currentTarget.dataset.tab
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === this.tabValue ? "true" : "false")
    })
    this.filter()
  }

  filter() {
    const query = (this.hasSearchTarget ? this.searchTarget.value : "").trim().toLowerCase()
    const teacher = this.hasTeacherTarget ? this.teacherTarget.value : "all"
    const from = this.hasFromTarget ? this.fromTarget.value : ""
    const to = this.hasToTarget ? this.toTarget.value : ""
    const hasRows = this.rowTargets.length > 0
    let visible = 0

    this.rowTargets.forEach((row) => {
      const tab = row.dataset.tab
      const matchTab = this.tabValue === "all" || tab === this.tabValue
      const matchTeacher = teacher === "all" || row.dataset.teacher === teacher
      const matchFrom = !from || row.dataset.date >= from
      const matchTo = !to || row.dataset.date <= to
      const matchQuery = !query || (row.dataset.search || "").includes(query)
      const show = matchTab && matchTeacher && matchFrom && matchTo && matchQuery
      row.hidden = !show
      if (show) visible += 1
    })

    if (this.hasCatalogEmptyTarget) this.catalogEmptyTarget.hidden = hasRows
    if (this.hasTableTarget) this.tableTarget.hidden = !hasRows || visible === 0
    if (this.hasFilterEmptyTarget) this.filterEmptyTarget.hidden = !hasRows || visible > 0
  }

  clearFilters() {
    this.tabValue = "all"
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === "all" ? "true" : "false")
    })
    if (this.hasSearchTarget) this.searchTarget.value = ""
    if (this.hasTeacherTarget) this.teacherTarget.value = "all"
    if (this.hasFromTarget) this.fromTarget.value = ""
    if (this.hasToTarget) this.toTarget.value = ""
    this.filter()
  }

  closeMenus() {
    this.menuTargets.forEach((menu) => menu.classList.add("lessons-page__menu--hidden"))
    this.menuBtnTargets.forEach((button) => button.setAttribute("aria-expanded", "false"))
    if (this.hasDrawerMenuTarget) this.drawerMenuTarget.classList.add("lessons-page__menu--hidden")
  }

  toggleMenu(event) {
    event.stopPropagation()
    const wrap = event.currentTarget.closest("[data-lesson-menu]")
    const menu = wrap?.querySelector("[data-lessons-target='menu']")
    const wasOpen = menu && !menu.classList.contains("lessons-page__menu--hidden")
    this.closeMenus()
    if (!menu || wasOpen) return
    menu.classList.remove("lessons-page__menu--hidden")
    event.currentTarget.setAttribute("aria-expanded", "true")
  }

  toggleDrawerMenu(event) {
    event.stopPropagation()
    if (!this.hasDrawerMenuTarget) return
    this.drawerMenuTarget.classList.toggle("lessons-page__menu--hidden")
  }

  onPointerDown(event) {
    if (event.target.closest("[data-lesson-menu]") || event.target.closest(".lessons-page__drawer-more")) return
    this.closeMenus()
  }

  onKeydown(event) {
    if (event.key === "Escape") {
      this.closeMenus()
      this.closeConfirm()
      this.closeOutcome()
      this.closeView()
    }
  }

  rowFromEvent(event) {
    return event.currentTarget.closest(".lessons-page__row")
  }

  parseLesson(row) {
    try {
      return JSON.parse(row.dataset.lesson || "{}")
    } catch (_error) {
      return {}
    }
  }

  writeLesson(row, lesson) {
    row.dataset.lesson = JSON.stringify(lesson)
    row.dataset.tab = lesson.review
    row.dataset.upcoming = lesson.upcoming ? "true" : "false"
    row.querySelectorAll("[data-badge]").forEach((badge) => {
      badge.textContent = lesson.reviewLabel
      badge.className = `status-badge status-badge--${TONES[lesson.review] || "neutral"}`
    })
  }

  openView(event) {
    this.closeMenus()
    const row = this.rowFromEvent(event) || this.activeRow
    this.activeRow = row
    this.fillDrawer(row ? this.parseLesson(row) : null)
    this.drawerTarget.classList.remove("lessons-page__drawer-wrap--hidden")
  }

  closeView() {
    if (this.hasDrawerTarget) this.drawerTarget.classList.add("lessons-page__drawer-wrap--hidden")
    this.closeMenus()
    this.closeOutcome()
  }

  openEdit() {
    if (this.calendarUrlValue) window.location.href = this.calendarUrlValue
  }

  fillDrawer(lesson) {
    const missing = !lesson?.id
    this.drawerMissingTarget.hidden = !missing
    this.drawerContentTarget.hidden = missing
    this.drawerFootTarget.hidden = missing || !lesson.upcoming
    if (missing) {
      this.drawerTitleTarget.textContent = this.t("default_subject")
      this.drawerSubtitleTarget.textContent = ""
      return
    }

    this.drawerTitleTarget.textContent = lesson.subject
    this.drawerSubtitleTarget.textContent = lesson.typeLabel || ""
    this.drawerBadgeTarget.textContent = lesson.reviewLabel
    this.drawerBadgeTarget.className = `status-badge status-badge--${TONES[lesson.review] || "neutral"}`
    this.drawerDateTarget.textContent = lesson.dateLong
    this.drawerTimeTarget.textContent = lesson.timeRange
    this.drawerTeacherTarget.textContent = lesson.teacher || ""
    this.drawerPartyTarget.textContent = lesson.party || ""
    this.drawerPriceTarget.textContent = lesson.price || ""
    const online = lesson.location === "online"
    this.drawerVideoIconTarget.hidden = !online
    this.drawerPinIconTarget.hidden = online
    this.drawerFormatTarget.textContent = online ? this.t("online") || "Online" : this.t("in_person") || "In person"
    const hasLink = online && Boolean(lesson.meetingLink)
    this.drawerMeetingTarget.hidden = !hasLink
    if (hasLink) this.drawerMeetingTarget.href = lesson.meetingLink
    this.drawerPlaceTarget.hidden = online || !lesson.locationText
    this.drawerPlaceTarget.textContent = lesson.locationText || ""
    const notes = (lesson.notes || "").trim()
    this.drawerNotesRowTarget.hidden = !notes
    this.drawerNotesTarget.textContent = notes
    this.drawerCancelItemTarget.hidden = !lesson.upcoming
  }

  askCancel(event) {
    this.closeMenus()
    this.activeRow = this.rowFromEvent(event)
    this.openConfirm("cancel")
  }

  askDelete(event) {
    this.closeMenus()
    this.activeRow = this.rowFromEvent(event)
    this.openConfirm("delete")
  }

  askCancelFromDrawer() {
    this.closeMenus()
    this.openConfirm("cancel")
  }

  askDeleteFromDrawer() {
    this.closeMenus()
    this.openConfirm("delete")
  }

  openConfirm(kind) {
    this.pending = kind
    const destructive = kind === "delete"
    this.confirmTitleTarget.textContent = this.t(destructive ? "delete_title" : "cancel_title")
    this.confirmTextTarget.textContent = this.t(destructive ? "delete_text" : "cancel_text")
    this.confirmBtnTarget.textContent = this.t(destructive ? "delete_lesson" : "cancel_lesson")
    this.confirmBtnTarget.classList.toggle("lessons-page__confirm-btn--danger", destructive)
    this.confirmTarget.classList.remove("lessons-page__confirm--hidden")
  }

  closeConfirm() {
    if (this.hasConfirmTarget) this.confirmTarget.classList.add("lessons-page__confirm--hidden")
    this.pending = null
  }

  runConfirm() {
    const kind = this.pending
    const row = this.activeRow
    this.closeConfirm()
    if (!row || !kind) return
    if (kind === "delete") {
      row.remove()
      this.closeView()
      this.activeRow = null
      this.showToast(this.t("deleted_toast"))
      this.filter()
      return
    }

    const lesson = this.parseLesson(row)
    lesson.status = "cancelled"
    lesson.review = "cancelled"
    lesson.reviewLabel = this.t("tab_cancelled")
    lesson.upcoming = false
    this.writeLesson(row, lesson)
    if (!this.drawerTarget.classList.contains("lessons-page__drawer-wrap--hidden")) this.fillDrawer(lesson)
    this.showToast(this.t("cancelled_toast"))
    this.filter()
  }

  markCompleted() {
    this.applyOutcome("completed")
  }

  openOutcome() {
    if (this.hasOutcomeTarget) this.outcomeTarget.classList.remove("lessons-page__confirm--hidden")
  }

  closeOutcome() {
    if (this.hasOutcomeTarget) this.outcomeTarget.classList.add("lessons-page__confirm--hidden")
  }

  chooseOutcome(event) {
    this.applyOutcome(event.currentTarget.dataset.outcome)
    this.closeOutcome()
  }

  applyOutcome(outcome) {
    const row = this.activeRow
    if (!row) return
    const lesson = this.parseLesson(row)
    if (outcome === "not_happened") {
      lesson.status = "cancelled"
      lesson.review = "cancelled"
      lesson.reviewLabel = this.t("tab_cancelled")
      this.showToast(this.t("cancelled_toast"))
    } else {
      lesson.status = "completed"
      lesson.review = "completed"
      lesson.reviewLabel = this.t("tab_completed")
      this.showToast(this.t("completed_toast"))
    }
    lesson.upcoming = false
    this.writeLesson(row, lesson)
    this.fillDrawer(lesson)
    this.filter()
  }

  correctOutcome() {
    const row = this.activeRow
    if (!row) return
    const lesson = this.parseLesson(row)
    lesson.status = "confirmed"
    lesson.review = "upcoming"
    lesson.reviewLabel = this.t("tab_upcoming")
    lesson.upcoming = true
    this.writeLesson(row, lesson)
    this.fillDrawer(lesson)
    this.showToast(this.t("corrected_toast"))
    this.filter()
  }

  showToast(message) {
    if (!this.hasToastTarget) return
    this.toastTarget.textContent = message
    this.toastTarget.hidden = false
    if (this.toastTimer) window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toastTarget.hidden = true
    }, 3200)
  }
}
