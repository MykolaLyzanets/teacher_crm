import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"
import { closeModal, isModalOpen, openModal } from "../lib/modal"

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
    "drawerCorrectItem",
    "drawerEdit",
    "drawerMissing",
    "drawerContent",
    "drawerBadge",
    "drawerStatus",
    "drawerOutcomeBtn",
    "drawerCompletedBanner",
    "drawerCancelledBanner",
    "drawerParticipantsTitle",
    "drawerParticipants",
    "drawerDate",
    "drawerTime",
    "drawerTypeRow",
    "drawerType",
    "drawerPriceRow",
    "drawerPrice",
    "drawerTimezone",
    "drawerMeetingRow",
    "drawerMeeting",
    "drawerMeetingHint",
    "drawerPlaceRow",
    "drawerPlaceLink",
    "drawerPlace",
    "drawerNotesRow",
    "drawerNotes",
    "drawerNotesEmpty",
    "confirm",
    "confirmTitle",
    "confirmText",
    "confirmBtn",
    "outcome",
    "completeFields",
    "attendance",
    "duration",
    "teacherNote",
    "progressNote",
    "outcomeError",
    "outcomeSubmit",
    "cancelTip"
  ]

  static values = {
    i18n: Object,
    calendarUrl: String,
    url: String,
    tab: { type: String, default: "all" }
  }

  connect() {
    this.pending = null
    this.pendingOutcome = "completed"
    this.savingOutcome = false
    this.activeRow = null
    this.boundPointer = this.onPointerDown.bind(this)
    this.boundKey = this.onKeydown.bind(this)
    this.boundLessonSaved = this.onLessonSaved.bind(this)
    this.boundReposition = () => {
      this.closeMenus()
      this.hideCancelTip()
    }
    document.addEventListener("mousedown", this.boundPointer)
    document.addEventListener("keydown", this.boundKey)
    window.addEventListener("calendar:lesson-saved", this.boundLessonSaved)
    window.addEventListener("resize", this.boundReposition)
    window.addEventListener("scroll", this.boundReposition, true)
    this.filter()
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    document.removeEventListener("keydown", this.boundKey)
    window.removeEventListener("calendar:lesson-saved", this.boundLessonSaved)
    window.removeEventListener("resize", this.boundReposition)
    window.removeEventListener("scroll", this.boundReposition, true)
    if (this.hasDrawerTarget) closeModal(this.drawerTarget)
    this.hideCancelTip()
    if (this.toastTimer) window.clearTimeout(this.toastTimer)
  }

  onLessonSaved() {
    window.location.reload()
  }

  t(key, vars = {}) {
    let text = this.i18nValue?.lessons?.[key] || this.i18nValue?.common?.[key] || key
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`%{${name}}`, String(value))
    })
    return text
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
    this.menuTargets.forEach((menu) => {
      menu.classList.add("lessons-page__menu--hidden")
      menu.style.position = ""
      menu.style.top = ""
      menu.style.right = ""
      menu.style.left = ""
      menu.style.zIndex = ""
      menu.style.marginTop = ""
    })
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
    this.positionMenu(menu, event.currentTarget)
  }

  positionMenu(menu, button) {
    const rect = button.getBoundingClientRect()
    const gap = 4
    menu.style.position = "fixed"
    menu.style.left = "auto"
    menu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`
    menu.style.marginTop = "0"
    menu.style.zIndex = "40"
    const height = menu.offsetHeight
    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < height + gap + 8 && rect.top > height + gap) {
      menu.style.top = `${Math.max(12, rect.top - height - gap)}px`
    } else {
      menu.style.top = `${rect.bottom + gap}px`
    }
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
    if (event.key !== "Escape") return
    this.closeMenus()
    if (this.detailsOpen()) return
    this.closeConfirm()
    this.closeOutcome()
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
    row.querySelectorAll("[data-badge]").forEach((badge) => this.applyBadge(badge, lesson))
  }

  applyBadge(badge, lesson) {
    badge.textContent = lesson.reviewLabel
    badge.className = `status-badge status-badge--${TONES[lesson.review] || "neutral"}`
    this.syncCancelReason(badge, lesson)
  }

  cancelReasonFor(lesson) {
    if (lesson?.review !== "cancelled") return ""
    return String(lesson.cancelReason || lesson.notes || "").trim()
  }

  syncCancelReason(badge, lesson) {
    const reason = this.cancelReasonFor(lesson)
    if (reason) {
      badge.dataset.cancelReason = reason
      badge.setAttribute("aria-label", `${lesson.reviewLabel}: ${reason}`)
    } else {
      delete badge.dataset.cancelReason
      badge.removeAttribute("aria-label")
    }
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

  openView(event) {
    this.closeMenus()
    const row = this.rowFromEvent(event) || this.activeRow
    this.activeRow = row
    this.fillDrawer(row ? this.parseLesson(row) : null)
    if (!this.hasDrawerTarget) return
    openModal(this.drawerTarget, { onClose: () => this.requestCloseView() })
  }

  requestCloseView() {
    this.closeMenus()
    if (this.hasConfirmTarget && !this.confirmTarget.classList.contains("lessons-page__confirm--hidden")) {
      this.closeConfirm()
      return
    }
    if (this.hasOutcomeTarget && !this.outcomeTarget.classList.contains("lessons-page__confirm--hidden")) {
      this.closeOutcome()
      return
    }
    this.closeView()
  }

  closeView() {
    if (this.hasDrawerTarget) closeModal(this.drawerTarget)
    this.closeMenus()
    this.closeOutcome()
  }

  detailsOpen() {
    return this.hasDrawerTarget && isModalOpen(this.drawerTarget)
  }

  openEdit(event) {
    this.closeMenus()
    const row = this.rowFromEvent(event) || this.activeRow
    this.activeRow = row
    const lesson = row ? this.parseLesson(row) : null
    this.closeView()
    const url = this.editDialogUrl(lesson)
    if (!url) return
    const frame = document.getElementById("create_lesson")
    if (frame) {
      frame.src = url
      return
    }
    Turbo.visit(url, { frame: "create_lesson" })
  }

  editDialogUrl(lesson) {
    if (!lesson?.id || !this.calendarUrlValue) return ""
    const url = new URL(this.calendarUrlValue, window.location.origin)
    url.searchParams.set("lesson_id", lesson.id)
    if (lesson.date) url.searchParams.set("date", lesson.date)
    if (lesson.startTime) url.searchParams.set("start", lesson.startTime)
    if (lesson.endTime) url.searchParams.set("end", lesson.endTime)
    if (lesson.teacherId) url.searchParams.set("teacher_id", lesson.teacherId)
    const studentId = lesson.studentId || lesson.students?.[0]?.id
    if (studentId) url.searchParams.set("student_id", studentId)
    url.searchParams.set("t", String(Date.now()))
    return `${url.pathname}${url.search}`
  }

  fillDrawer(lesson) {
    const missing = !lesson?.id
    this.drawerMissingTarget.hidden = !missing
    this.drawerContentTarget.hidden = missing
    if (missing) {
      this.drawerTitleTarget.textContent = this.t("default_subject")
      this.drawerSubtitleTarget.textContent = ""
      if (this.hasDrawerEditTarget) this.drawerEditTarget.hidden = true
      return
    }

    const students = Array.isArray(lesson.students) ? lesson.students : []
    const group = lesson.type === "group" || students.length > 1
    this.drawerTitleTarget.textContent = lesson.subject
    this.drawerSubtitleTarget.textContent = this.subtitleFor(lesson, students, group)
    this.applyBadge(this.drawerBadgeTarget, lesson)
    if (this.hasDrawerEditTarget) this.drawerEditTarget.hidden = !lesson.upcoming
    this.fillStatus(lesson)
    this.fillParticipants(lesson, students, group)
    this.drawerDateTarget.textContent = lesson.dateLong
    const minutes = Number(lesson.durationMinutes) || 0
    this.drawerTimeTarget.textContent = minutes
      ? `${lesson.timeRange} · ${minutes} ${this.t("min")}`
      : lesson.timeRange
    const typeName = lesson.typeLabel
    this.drawerTypeRowTarget.hidden = !typeName
    this.drawerTypeTarget.textContent = typeName || ""
    const free = Number(lesson.priceCents) === 0
    this.drawerPriceRowTarget.hidden = lesson.price == null && lesson.priceCents == null
    this.drawerPriceTarget.textContent = free ? this.t("free") : (lesson.price || "")
    this.drawerTimezoneTarget.textContent = lesson.timezone || "—"
    this.fillLocation(lesson)
    const notes = this.notesText(lesson)
    this.drawerNotesRowTarget.hidden = !notes
    this.drawerNotesTarget.textContent = notes
    if (this.hasDrawerNotesEmptyTarget) this.drawerNotesEmptyTarget.hidden = Boolean(notes)
    this.drawerCancelItemTarget.hidden = !lesson.upcoming
    if (this.hasDrawerCorrectItemTarget) this.drawerCorrectItemTarget.hidden = Boolean(lesson.upcoming)
  }

  subtitleFor(lesson, students, group) {
    const typeLine = group
      ? `${this.t("group_lesson")} · ${this.t("group_participants", { count: students.length })}`
      : this.t("individual_lesson")
    return lesson.subject ? `${typeLine} · ${lesson.subject}` : typeLine
  }

  fillStatus(lesson) {
    const completed = lesson.review === "completed"
    const cancelled = lesson.review === "cancelled"
    const showOutcome = Boolean(lesson.upcoming) && this.lessonHasPassed(lesson)
    if (this.hasDrawerOutcomeBtnTarget) this.drawerOutcomeBtnTarget.hidden = !showOutcome
    if (this.hasDrawerCompletedBannerTarget) this.drawerCompletedBannerTarget.hidden = !completed
    if (this.hasDrawerCancelledBannerTarget) {
      const banner = this.drawerCancelledBannerTarget
      banner.hidden = !cancelled
      if (!banner.dataset.defaultText) banner.dataset.defaultText = banner.textContent.trim()
      banner.textContent = cancelled
        ? (this.cancelReasonFor(lesson) || banner.dataset.defaultText)
        : banner.dataset.defaultText
    }
    if (this.hasDrawerStatusTarget) this.drawerStatusTarget.hidden = !(showOutcome || completed || cancelled)
  }

  lessonHasPassed(lesson) {
    if (!lesson.date || !lesson.endTime) return false
    const [hours, minutes] = String(lesson.endTime).split(":").map(Number)
    const end = new Date(`${lesson.date}T00:00:00`)
    if (Number.isNaN(end.getTime())) return false
    end.setHours(hours || 0, minutes || 0, 0, 0)
    return end.getTime() <= Date.now()
  }

  fillParticipants(lesson, students, group) {
    const count = students.length
    this.drawerParticipantsTitleTarget.textContent = group
      ? this.t("participants_count", { count })
      : this.t("participants")
    const teacherCard = this.personCard({
      name: lesson.teacher || this.t("teacher"),
      meta: lesson.teacherRole || this.t("teacher"),
      initials: lesson.teacherInitials,
      photo: lesson.teacherPhoto,
      url: lesson.teacherUrl
    })
    const studentCards = students.length
      ? students.map((student) => this.personCard({
        name: student.name,
        meta: [student.grade, student.assigned ? this.t("assigned_teacher") : ""].filter(Boolean).join(" · "),
        initials: student.initials,
        photo: student.photo,
        url: student.url
      })).join("")
      : `<div class="lessons-page__person">${escapeHtml(lesson.party || this.t("student"))}</div>`
    this.drawerParticipantsTarget.innerHTML = `${teacherCard}${studentCards}`
  }

  personCard({ name, meta, initials, photo, url }) {
    const avatar = photo
      ? `<img src="${escapeHtml(photo)}" alt="">`
      : escapeHtml(initials || "?")
    const link = url
      ? `<a class="lessons-page__person-link" href="${escapeHtml(url)}">${escapeHtml(this.t("view_profile"))}</a>`
      : ""
    return `<article class="lessons-page__person">
      <span class="lessons-page__avatar">${avatar}</span>
      <div class="lessons-page__person-copy">
        <p class="lessons-page__person-name">${escapeHtml(name || "")}</p>
        ${meta ? `<p class="lessons-page__person-meta">${escapeHtml(meta)}</p>` : ""}
      </div>
      ${link}
    </article>`
  }

  fillLocation(lesson) {
    const online = lesson.location === "online"
    const link = (lesson.meetingLink || "").trim()
    this.drawerMeetingRowTarget.hidden = !online
    this.drawerPlaceRowTarget.hidden = online
    if (online) {
      const hasLink = Boolean(link)
      this.drawerMeetingTarget.hidden = !hasLink
      this.drawerMeetingHintTarget.hidden = hasLink
      this.drawerMeetingHintTarget.textContent = this.t("meeting_pending")
      if (hasLink) {
        this.drawerMeetingTarget.href = link
        this.drawerMeetingTarget.textContent = this.t("join_online")
      }
      return
    }

    const place = (lesson.locationText || "").trim()
    this.drawerPlaceTarget.hidden = Boolean(place)
    this.drawerPlaceLinkTarget.hidden = !place
    this.drawerPlaceTarget.textContent = this.t("in_person")
    if (place) {
      this.drawerPlaceLinkTarget.href = `https://maps.google.com/?q=${encodeURIComponent(place)}`
      this.drawerPlaceLinkTarget.textContent = place
    }
  }

  notesText(lesson) {
    const cancelReason = this.cancelReasonFor(lesson)
    const notes = (lesson.notes || "").trim()
    return [
      cancelReason && notes === cancelReason ? "" : notes,
      (lesson.teacherNote || "").trim(),
      (lesson.studentProgressNote || "").trim()
    ].filter(Boolean).join("\n\n")
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

    this.persistOutcome("cancelled", this.t("cancelled_toast"))
  }

  openOutcome() {
    const lesson = this.activeRow ? this.parseLesson(this.activeRow) : {}
    this.pendingOutcome = "completed"
    this.showOutcomeError("")
    if (this.hasAttendanceTarget) this.attendanceTarget.value = "present"
    if (this.hasDurationTarget) this.durationTarget.value = String(lesson.actualDurationMinutes || lesson.durationMinutes || 60)
    if (this.hasTeacherNoteTarget) this.teacherNoteTarget.value = lesson.teacherNote || ""
    if (this.hasProgressNoteTarget) this.progressNoteTarget.value = lesson.studentProgressNote || ""
    this.syncOutcomeChoice()
    if (this.hasOutcomeTarget) this.outcomeTarget.classList.remove("lessons-page__confirm--hidden")
  }

  closeOutcome() {
    if (this.hasOutcomeTarget) this.outcomeTarget.classList.add("lessons-page__confirm--hidden")
    this.showOutcomeError("")
  }

  chooseOutcome(event) {
    this.pendingOutcome = event.currentTarget.dataset.outcome || "completed"
    this.syncOutcomeChoice()
  }

  syncOutcomeChoice() {
    const completed = this.pendingOutcome !== "not_happened"
    this.element.querySelectorAll(".lessons-page__outcome").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.outcome === this.pendingOutcome)
    })
    if (this.hasCompleteFieldsTarget) this.completeFieldsTarget.hidden = !completed
  }

  submitOutcome() {
    const outcome = this.pendingOutcome === "not_happened" ? "cancelled" : "completed"
    const toast = outcome === "cancelled" ? this.t("cancelled_toast") : this.t("completed_toast")
    this.persistOutcome(outcome, toast)
  }

  correctOutcome() {
    this.closeMenus()
    this.persistOutcome("confirmed", this.t("corrected_toast"))
  }

  async persistOutcome(outcome, toast) {
    const row = this.activeRow
    const lesson = row ? this.parseLesson(row) : null
    if (!lesson?.id || this.savingOutcome) return

    this.savingOutcome = true
    if (this.hasOutcomeSubmitTarget) this.outcomeSubmitTarget.disabled = true
    this.showOutcomeError("")
    try {
      const response = await fetch(this.outcomeUrl(lesson.id), {
        method: "PATCH",
        credentials: "same-origin",
        headers: this.apiHeaders(),
        body: JSON.stringify(this.outcomePayload(outcome))
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = Array.isArray(data.errors) ? data.errors.filter(Boolean).join(" ") : (data.error || this.t("save_failed"))
        throw new Error(message || this.t("save_failed"))
      }
      this.applyCatalog(row, data)
      this.closeOutcome()
      if (this.detailsOpen()) this.fillDrawer(this.parseLesson(row))
      this.showToast(toast)
      this.filter()
    } catch (error) {
      const message = error.message || this.t("save_failed")
      const outcomeOpen = this.hasOutcomeTarget && !this.outcomeTarget.classList.contains("lessons-page__confirm--hidden")
      if (outcomeOpen) this.showOutcomeError(message)
      else this.showToast(message)
    } finally {
      this.savingOutcome = false
      if (this.hasOutcomeSubmitTarget) this.outcomeSubmitTarget.disabled = false
    }
  }

  outcomePayload(outcome) {
    const payload = { outcome }
    if (outcome !== "completed") return payload
    if (this.hasAttendanceTarget) payload.attendance = this.attendanceTarget.value
    if (this.hasDurationTarget) payload.actualDurationMinutes = Number(this.durationTarget.value)
    if (this.hasTeacherNoteTarget) payload.teacherNote = this.teacherNoteTarget.value
    if (this.hasProgressNoteTarget) payload.studentProgressNote = this.progressNoteTarget.value
    return payload
  }

  outcomeUrl(id) {
    const base = String(this.urlValue || "/lessons").replace(/\/$/, "")
    return `${base}/${encodeURIComponent(id)}/outcome`
  }

  apiHeaders() {
    const headers = { Accept: "application/json", "Content-Type": "application/json" }
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (token) headers["X-CSRF-Token"] = token
    return headers
  }

  applyCatalog(row, catalog) {
    const lesson = this.parseLesson(row)
    const status = catalog.status || lesson.status
    const review = status === "cancelled" ? "cancelled" : status === "completed" ? "completed" : "upcoming"
    Object.assign(lesson, {
      status,
      review,
      reviewLabel: this.t(`tab_${review}`),
      cancelReason: review === "cancelled" ? String(catalog.notes || "").trim() : "",
      upcoming: review === "upcoming",
      notes: catalog.notes,
      teacherNote: catalog.teacherNote,
      studentProgressNote: catalog.studentProgressNote,
      attendance: catalog.attendance,
      actualDurationMinutes: catalog.actualDurationMinutes
    })
    this.writeLesson(row, lesson)
  }

  showOutcomeError(message) {
    if (!this.hasOutcomeErrorTarget) return
    this.outcomeErrorTarget.hidden = !message
    this.outcomeErrorTarget.textContent = message || ""
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
