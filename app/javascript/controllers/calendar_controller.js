import { Controller } from "@hotwired/stimulus"

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
]
const WEEKDAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
]
const DAY_START_HOUR = 7
const DAY_END_HOUR = 21
const HOUR_HEIGHT = 64
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)

export default class extends Controller {
  static targets = [
    "title",
    "toast",
    "viewTab",
    "viewSelect",
    "filters",
    "filtersToggle",
    "filterCount",
    "filterTeacher",
    "filterStudent",
    "filterType",
    "filterStatus",
    "filterLocation",
    "monthView",
    "grid",
    "weekView",
    "weekGrid",
    "dayView",
    "dayGrid",
    "agendaView",
    "agendaList",
    "selectedDay",
    "selectedTitle",
    "selectedList",
    "emptyBanner",
    "drawer",
    "drawerBackdrop",
    "drawerTitle",
    "drawerSubmit",
    "draftTeacher",
    "draftStudent",
    "draftTitle",
    "draftDate",
    "draftStart",
    "draftEnd",
    "draftType",
    "draftStatus",
    "draftLocation",
    "draftMeeting",
    "draftPlace",
    "draftRepeat",
    "draftRepeatEnd",
    "draftNotes",
    "onlineField",
    "placeField",
    "repeatExtra",
    "details",
    "detailsTitle",
    "detailsTone",
    "detailsStudent",
    "detailsTeacher",
    "detailsDate",
    "detailsTime",
    "detailsLocation",
    "detailsNotes",
    "detailsNotesRow",
    "overflow",
    "overflowTitle",
    "overflowList"
  ]

  static values = {
    lessons: Array,
    teacherId: String,
    studentId: String,
    i18n: Object
  }

  monthName(index) {
    return this.i18nValue?.calendar?.months?.[MONTH_KEYS[index]] || MONTH_KEYS[index]
  }

  weekdayName(index) {
    return this.i18nValue?.calendar?.weekdays?.[WEEKDAY_KEYS[index]] || WEEKDAY_KEYS[index]
  }

  t(group, key) {
    return this.i18nValue?.[group]?.[key] || key
  }

  connect() {
    const today = startOfDay(new Date())
    this.today = today
    this.cursor = new Date(today)
    this.selectedDate = new Date(today)
    this.view = "month"
    this.filtersOpen = false
    this.appliedFilters = emptyFilters()
    this.lessons = Array.isArray(this.lessonsValue) ? [...this.lessonsValue] : []
    this.editingId = null
    this.activeLessonId = null
    this.overflowDate = null

    this.render()
    this.syncDrawerFields()

    if (this.teacherIdValue || this.studentIdValue) {
      this.openCreate()
      if (this.hasDraftTeacherTarget && this.teacherIdValue) {
        this.draftTeacherTarget.value = this.teacherIdValue
      }
      if (this.hasDraftStudentTarget && this.studentIdValue) {
        this.draftStudentTarget.value = this.studentIdValue
      }
    }

    this.boundKeydown = this.onKeydown.bind(this)
    this.boundResize = this.render.bind(this)
    document.addEventListener("keydown", this.boundKeydown)
    window.addEventListener("resize", this.boundResize)
  }

  disconnect() {
    document.removeEventListener("keydown", this.boundKeydown)
    window.removeEventListener("resize", this.boundResize)
  }

  onKeydown(event) {
    if (event.key !== "Escape") return
    this.closeCreate()
    this.closeFilters()
    this.closeLesson()
    this.closeOverflow()
  }

  previous() {
    this.cursor = shiftPeriod(this.cursor, this.view, -1)
    if (this.view === "day") this.selectedDate = new Date(this.cursor)
    this.render()
  }

  next() {
    this.cursor = shiftPeriod(this.cursor, this.view, 1)
    if (this.view === "day") this.selectedDate = new Date(this.cursor)
    this.render()
  }

  today() {
    this.cursor = new Date(this.today)
    this.selectedDate = new Date(this.today)
    this.render()
  }

  setView(event) {
    const view = event.currentTarget.dataset.view
    if (!view) return
    this.view = view
    if (view === "day") this.cursor = new Date(this.selectedDate)
    if (this.hasViewSelectTarget) this.viewSelectTarget.value = view
    this.render()
  }

  setViewFromSelect() {
    this.view = this.viewSelectTarget.value
    if (this.view === "day") this.cursor = new Date(this.selectedDate)
    this.render()
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen
    this.syncFiltersPanel()
  }

  closeFilters() {
    this.filtersOpen = false
    this.syncFiltersPanel()
  }

  applyFilters() {
    this.appliedFilters = {
      teacher: this.hasFilterTeacherTarget ? this.filterTeacherTarget.value : "",
      student: this.hasFilterStudentTarget ? this.filterStudentTarget.value : "",
      type: this.hasFilterTypeTarget ? this.filterTypeTarget.value : "",
      status: this.hasFilterStatusTarget ? this.filterStatusTarget.value : "",
      location: this.hasFilterLocationTarget ? this.filterLocationTarget.value : ""
    }
    this.filtersOpen = false
    this.syncFiltersPanel()
    this.render()
  }

  clearFilters() {
    this.appliedFilters = emptyFilters()
    ;["filterTeacher", "filterStudent", "filterType", "filterStatus", "filterLocation"].forEach((name) => {
      if (this[`has${capitalize(name)}Target`]) this[`${name}Target`].value = ""
    })
    this.filtersOpen = false
    this.syncFiltersPanel()
    this.render()
  }

  openCreate(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    this.editingId = null
    const dateKey = event?.currentTarget?.dataset?.date || toDateKey(this.selectedDate)
    const start = event?.currentTarget?.dataset?.start || "10:00"
    this.selectedDate = parseDateKey(dateKey)
    if (this.view === "day") this.cursor = new Date(this.selectedDate)
    this.fillDraft({
      date: dateKey,
      startTime: start,
      endTime: addHour(start),
      title: "",
      type: "individual",
      status: "confirmed",
      location: "online",
      meetingLink: "",
      locationText: "",
      repeat: "none",
      notes: "",
      teacherId: this.teacherIdValue || "",
      studentId: this.studentIdValue || ""
    })
    this.setDrawerMode("create")
    this.showDrawer()
  }

  closeCreate() {
    this.hideDrawer()
    this.editingId = null
  }

  syncDrawerFields() {
    const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
    if (this.hasOnlineFieldTarget) {
      this.onlineFieldTarget.hidden = location !== "online"
    }
    if (this.hasPlaceFieldTarget) {
      this.placeFieldTarget.hidden = location === "online"
    }
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    if (this.hasRepeatExtraTarget) {
      this.repeatExtraTarget.hidden = repeat === "none" || Boolean(this.editingId)
    }
  }

  submitCreate() {
    const title = this.hasDraftTitleTarget ? this.draftTitleTarget.value.trim() : ""
    const teacherOption = this.hasDraftTeacherTarget ? this.draftTeacherTarget.selectedOptions[0] : null
    const studentOption = this.hasDraftStudentTarget ? this.draftStudentTarget.selectedOptions[0] : null
    const date = this.hasDraftDateTarget ? this.draftDateTarget.value : toDateKey(this.selectedDate)
    const startTime = this.hasDraftStartTarget ? this.draftStartTarget.value : "10:00"
    const endTime = this.hasDraftEndTarget ? this.draftEndTarget.value : "11:00"
    const type = this.hasDraftTypeTarget ? this.draftTypeTarget.value : "individual"
    const status = this.hasDraftStatusTarget ? this.draftStatusTarget.value : "confirmed"
    const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
    const meetingLink = this.hasDraftMeetingTarget ? this.draftMeetingTarget.value.trim() : ""
    const locationText = this.hasDraftPlaceTarget ? this.draftPlaceTarget.value.trim() : ""
    const notes = this.hasDraftNotesTarget ? this.draftNotesTarget.value.trim() : ""
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    const repeatEnd = this.hasDraftRepeatEndTarget ? this.draftRepeatEndTarget.value : ""

    if (!title || !date) {
      window.alert(this.t("calendar", "need_title_date"))
      return
    }

    const payload = {
      title,
      student: studentOption?.textContent?.trim() || this.t("common", "student"),
      teacher: teacherOption?.textContent?.trim() || this.t("common", "teacher"),
      teacherId: this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : "",
      studentId: this.hasDraftStudentTarget ? this.draftStudentTarget.value : "",
      date,
      startTime,
      endTime,
      type,
      status,
      location,
      meetingLink: location === "online" ? meetingLink : undefined,
      locationText: location === "in_person" ? locationText : undefined,
      notes: notes || undefined
    }

    if (this.editingId) {
      this.lessons = this.lessons.map((lesson) =>
        lesson.id === this.editingId ? { ...lesson, ...payload } : lesson
      )
      this.showToast(this.t("calendar", "updated"))
    } else {
      const created = expandRepeat({ ...payload, id: `local-${Date.now()}` }, repeat, repeatEnd)
      this.lessons.push(...created)
      if (created.length > 1) {
        this.showToast(this.t("calendar", "created_many").replace("%{count}", created.length))
      } else {
        this.showToast(this.t("calendar", "created"))
      }
    }

    this.selectedDate = parseDateKey(date)
    this.cursor = this.view === "month" || this.view === "agenda" ? this.cursor : new Date(this.selectedDate)
    this.closeCreate()
    this.render()
  }

  selectDay(event) {
    if (event.target.closest("[data-lesson-id], .calendar-page__more, .calendar-page__event")) return
    const key = event.currentTarget.dataset.date
    if (!key) return
    this.selectedDate = parseDateKey(key)
    const mobile = window.matchMedia("(max-width: 767px)").matches
    if (this.view === "month" && !mobile) this.openCreate()
    this.render()
  }

  openLesson(event) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    const id = event.currentTarget.dataset.lessonId
    const lesson = this.lessons.find((item) => String(item.id) === String(id))
    if (!lesson) return
    this.activeLessonId = id
    this.closeOverflow()
    this.renderDetails(lesson)
  }

  closeLesson() {
    this.activeLessonId = null
    if (this.hasDetailsTarget) this.detailsTarget.hidden = true
  }

  editLesson() {
    const lesson = this.lessons.find((item) => item.id === this.activeLessonId)
    if (!lesson) return
    this.closeLesson()
    this.editingId = lesson.id
    this.fillDraft(lesson)
    this.setDrawerMode("edit")
    this.showDrawer()
  }

  duplicateLesson() {
    const lesson = this.lessons.find((item) => item.id === this.activeLessonId)
    if (!lesson) return
    this.closeLesson()
    this.editingId = null
    this.fillDraft({
      ...lesson,
      title: `${lesson.title} (${this.t("calendar", "copy")})`,
      status: "confirmed",
      repeat: "none"
    })
    this.setDrawerMode("create")
    this.showDrawer()
  }

  cancelLesson() {
    if (!window.confirm(this.t("calendar", "cancel_confirm"))) return
    this.lessons = this.lessons.map((lesson) =>
      lesson.id === this.activeLessonId ? { ...lesson, status: "cancelled" } : lesson
    )
    this.closeLesson()
    this.render()
  }

  showOverflow(event) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    const key = event.currentTarget.dataset.date
    if (!key) return
    this.selectedDate = parseDateKey(key)
    this.overflowDate = key
    this.renderOverflow()
  }

  closeOverflow() {
    this.overflowDate = null
    if (this.hasOverflowTarget) this.overflowTarget.hidden = true
  }

  filteredLessons() {
    return this.lessons.filter((lesson) => {
      if (this.appliedFilters.teacher && lesson.teacher !== this.appliedFilters.teacher) return false
      if (this.appliedFilters.student && lesson.student !== this.appliedFilters.student) return false
      if (this.appliedFilters.type && lesson.type !== this.appliedFilters.type) return false
      if (this.appliedFilters.status && lesson.status !== this.appliedFilters.status) return false
      if (this.appliedFilters.location && lesson.location !== this.appliedFilters.location) return false
      return true
    })
  }

  lessonsByDate(lessons) {
    const map = {}
    lessons.forEach((lesson) => {
      if (!map[lesson.date]) map[lesson.date] = []
      map[lesson.date].push(lesson)
    })
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    })
    return map
  }

  render() {
    const lessons = this.filteredLessons()
    const byDate = this.lessonsByDate(lessons)
    this.months = MONTH_KEYS.map((_, index) => this.monthName(index))
    this.weekdays = WEEKDAY_KEYS.map((_, index) => this.weekdayName(index))
    this.titleTarget.textContent = periodTitle(this.cursor, this.view, this.months, this.weekdays)
    this.syncViewTabs()
    this.syncFilterCount()
    this.renderMonth(byDate)
    this.renderTimeGrid(this.hasWeekGridTarget ? this.weekGridTarget : null, getWeekDays(this.cursor), byDate)
    this.renderTimeGrid(this.hasDayGridTarget ? this.dayGridTarget : null, [this.cursor], byDate)
    this.renderAgenda(lessons)
    this.renderSelectedDay(byDate)
    this.syncViewVisibility()
    this.syncEmptyBanner(lessons)
  }

  renderMonth(byDate) {
    if (!this.hasGridTarget) return
    const mobile = window.matchMedia("(max-width: 767px)").matches
    const days = getMonthGrid(this.cursor)
    this.gridTarget.innerHTML = days.map((day) => {
      const key = toDateKey(day)
      const list = byDate[key] || []
      const inMonth = isSameMonth(day, this.cursor)
      const isToday = isSameDay(day, this.today)
      const isSelected = isSameDay(day, this.selectedDate)
      const weekend = day.getDay() === 0 || day.getDay() === 6
      const classes = [
        "calendar-page__day-cell",
        inMonth ? "" : "calendar-page__day-cell--outside",
        weekend ? "calendar-page__day-cell--weekend" : "",
        isSelected ? "calendar-page__day-cell--selected" : ""
      ].filter(Boolean).join(" ")

      const numberClass = [
        "calendar-page__day-number",
        isToday ? "calendar-page__day-number--today" : ""
      ].filter(Boolean).join(" ")

      let body = ""
      if (mobile) {
        body = `<span class="calendar-page__dots">${list.slice(0, 3).map((lesson) =>
          `<span class="calendar-page__dot calendar-page__dot--${lesson.status === "cancelled" ? "cancelled" : lesson.type}"></span>`
        ).join("")}</span>`
      } else {
        const visible = list.slice(0, 3)
        const overflow = Math.max(0, list.length - 3)
        body = `<div class="calendar-page__day-events">${visible.map((lesson) => eventHtml(lesson, list.length > 2 ? "compact" : "month", this)).join("")}${
          overflow > 0 ? `<button type="button" class="calendar-page__more" data-date="${key}" data-action="calendar#showOverflow">+${overflow} ${this.t("calendar", "more")}</button>` : ""
        }</div>`
      }

      return `<div class="${classes}" data-date="${key}" data-action="click->calendar#selectDay" role="button" tabindex="0" aria-label="${this.weekdays[(day.getDay() + 6) % 7]}, ${day.getMonth() + 1}/${day.getDate()}/${day.getFullYear()}">
        <span class="${numberClass}">${day.getDate()}</span>
        ${body}
      </div>`
    }).join("")
  }

  renderTimeGrid(container, days, byDate) {
    if (!container) return
    const nowTop = currentTimeTop(this.today)
    const showNow = days.some((day) => isSameDay(day, this.today))
    const columns = `64px repeat(${days.length}, minmax(0, 1fr))`

    const headers = days.map((day, index) => {
      const isToday = isSameDay(day, this.today)
      return `<div class="calendar-page__time-head">
        <p>${this.weekdays[index % 7]?.slice(0, 3) || ""}</p>
        <span class="${isToday ? "is-today" : ""}">${day.getDate()}</span>
      </div>`
    }).join("")

    const hourLabels = HOURS.map((hour) =>
      `<div class="calendar-page__time-hour"><span>${escapeHtml(formatTimeLabel(`${String(hour).padStart(2, "0")}:00`))}</span></div>`
    ).join("")

    const columnsHtml = days.map((day) => {
      const key = toDateKey(day)
      const list = byDate[key] || []
      const dayIsToday = isSameDay(day, this.today)
      const slots = HOURS.map((hour) => {
        const start = `${String(hour).padStart(2, "0")}:00`
        return `<button type="button" class="calendar-page__time-slot" style="top: ${(hour - DAY_START_HOUR) * HOUR_HEIGHT}px" data-date="${key}" data-start="${start}" data-action="calendar#openCreate" aria-label="${this.t("calendar", "create_lesson")}"></button>`
      }).join("")
      const now = showNow && dayIsToday && nowTop !== null
        ? `<div class="calendar-page__time-now" style="top: ${nowTop}px"><span></span><i></i></div>`
        : ""
      const events = list.map((lesson) => {
        const start = timeToMinutes(lesson.startTime)
        const end = timeToMinutes(lesson.endTime)
        const top = ((start - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT
        const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 28)
        return `<div class="calendar-page__time-event" style="top: ${top}px; height: ${height}px">${eventHtml(lesson, "block", this)}</div>`
      }).join("")

      return `<div class="calendar-page__time-day" style="height: ${HOURS.length * HOUR_HEIGHT}px">${slots}${now}${events}</div>`
    }).join("")

    container.innerHTML = `<div class="calendar-page__time-inner" style="grid-template-columns: ${columns}">
      <div class="calendar-page__time-corner"></div>
      ${headers}
      <div class="calendar-page__time-hours">${hourLabels}</div>
      ${columnsHtml}
    </div>`
  }

  renderAgenda(lessons) {
    if (!this.hasAgendaListTarget) return
    const monthKey = `${this.cursor.getFullYear()}-${this.cursor.getMonth()}`
    const monthLessons = lessons
      .filter((lesson) => {
        const date = parseDateKey(lesson.date)
        return `${date.getFullYear()}-${date.getMonth()}` === monthKey
      })
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))

    if (!monthLessons.length) {
      this.agendaListTarget.innerHTML = `<div class="calendar-page__agenda-empty"><p>${this.t("calendar", "no_lessons_scheduled")}</p><button type="button" class="calendar-page__primary-btn" data-action="calendar#openCreate">${this.t("calendar", "create_lesson")}</button></div>`
      return
    }

    const groups = {}
    monthLessons.forEach((lesson) => {
      if (!groups[lesson.date]) groups[lesson.date] = []
      groups[lesson.date].push(lesson)
    })

    this.agendaListTarget.innerHTML = Object.keys(groups).map((key) => {
      const date = parseDateKey(key)
      return `<section class="calendar-page__agenda-group">
        <h3>${isSameDay(date, this.today) ? `<span class="calendar-page__today-pill">${this.t("calendar", "today")}</span>` : ""}${formatAgendaDate(date, this.months, this.weekdays)}</h3>
        <div class="calendar-page__agenda-list">${groups[key].map((lesson) => eventHtml(lesson, "agenda", this)).join("")}</div>
      </section>`
    }).join("")
  }

  renderSelectedDay(byDate) {
    if (!this.hasSelectedTitleTarget || !this.hasSelectedListTarget) return
    const key = toDateKey(this.selectedDate)
    const list = byDate[key] || []
    this.selectedTitleTarget.textContent = formatAgendaDate(this.selectedDate, this.months, this.weekdays)
    this.selectedListTarget.innerHTML = list.length
      ? list.map((lesson) => eventHtml(lesson, "agenda", this)).join("")
      : `<p class="calendar-page__event-meta">${this.t("calendar", "no_lessons_day")}</p>`
  }

  renderDetails(lesson) {
    if (!this.hasDetailsTarget) return
    this.detailsTitleTarget.textContent = lesson.title
    const tone = lesson.status === "cancelled" ? "cancelled" : lesson.type
    this.detailsToneTarget.className = `calendar-page__details-tone calendar-page__event--${tone}`
    this.detailsToneTarget.textContent = `${this.statusLabel(lesson.status)} · ${this.typeLabel(lesson.type)}`
    this.detailsStudentTarget.textContent = lesson.student
    this.detailsTeacherTarget.textContent = lesson.teacher
    this.detailsDateTarget.textContent = formatAgendaDate(parseDateKey(lesson.date), this.months, this.weekdays)
    this.detailsTimeTarget.textContent = formatTimeRange(lesson.startTime, lesson.endTime)
    this.detailsLocationTarget.textContent = lesson.location === "online"
      ? (lesson.meetingLink || this.t("common", "online"))
      : (lesson.locationText || this.t("common", "in_person"))
    if (this.hasDetailsNotesRowTarget) {
      this.detailsNotesRowTarget.hidden = !lesson.notes
    }
    if (this.hasDetailsNotesTarget) this.detailsNotesTarget.textContent = lesson.notes || ""
    this.detailsTarget.hidden = false
  }

  renderOverflow() {
    if (!this.hasOverflowTarget || !this.overflowDate) return
    const date = parseDateKey(this.overflowDate)
    const list = this.lessonsByDate(this.filteredLessons())[this.overflowDate] || []
    this.overflowTitleTarget.textContent = formatAgendaDate(date, this.months, this.weekdays)
    this.overflowListTarget.innerHTML = list.map((lesson) =>
      `<button type="button" class="calendar-page__overflow-item" data-lesson-id="${escapeHtml(lesson.id)}" data-action="click->calendar#openLesson">
        <p>${escapeHtml(lesson.title)}</p>
        <span>${escapeHtml(formatTimeRange(lesson.startTime, lesson.endTime))} · ${escapeHtml(lesson.student)}</span>
      </button>`
    ).join("")
    this.overflowTarget.hidden = false
  }

  statusLabel(status) {
    return this.i18nValue?.statuses?.[status] || status
  }

  typeLabel(type) {
    return this.i18nValue?.calendar?.[type] || type
  }

  fillDraft(lesson) {
    if (this.hasDraftDateTarget) this.draftDateTarget.value = lesson.date || toDateKey(this.selectedDate)
    if (this.hasDraftStartTarget) this.draftStartTarget.value = lesson.startTime || "10:00"
    if (this.hasDraftEndTarget) this.draftEndTarget.value = lesson.endTime || "11:00"
    if (this.hasDraftTitleTarget) this.draftTitleTarget.value = lesson.title || ""
    if (this.hasDraftTypeTarget) this.draftTypeTarget.value = lesson.type || "individual"
    if (this.hasDraftStatusTarget) this.draftStatusTarget.value = lesson.status === "cancelled" ? "pending" : (lesson.status || "confirmed")
    if (this.hasDraftLocationTarget) this.draftLocationTarget.value = lesson.location || "online"
    if (this.hasDraftMeetingTarget) this.draftMeetingTarget.value = lesson.meetingLink || ""
    if (this.hasDraftPlaceTarget) this.draftPlaceTarget.value = lesson.locationText || ""
    if (this.hasDraftRepeatTarget) this.draftRepeatTarget.value = "none"
    if (this.hasDraftNotesTarget) this.draftNotesTarget.value = lesson.notes || ""
    if (this.hasDraftTeacherTarget && lesson.teacherId) this.draftTeacherTarget.value = lesson.teacherId
    if (this.hasDraftStudentTarget && lesson.studentId) this.draftStudentTarget.value = lesson.studentId
    this.syncDrawerFields()
  }

  setDrawerMode(mode) {
    if (this.hasDrawerTitleTarget) {
      this.drawerTitleTarget.textContent = mode === "edit" ? this.t("calendar", "edit_lesson") : this.t("calendar", "drawer_title")
    }
    if (this.hasDrawerSubmitTarget) {
      this.drawerSubmitTarget.textContent = mode === "edit" ? this.t("calendar", "save_lesson") : this.t("calendar", "create_lesson")
    }
    if (this.hasRepeatExtraTarget && mode === "edit") this.repeatExtraTarget.hidden = true
  }

  showDrawer() {
    this.drawerTarget.classList.remove("calendar-page__drawer--hidden")
    this.drawerBackdropTarget.classList.remove("calendar-page__drawer-backdrop--hidden")
  }

  hideDrawer() {
    this.drawerTarget.classList.add("calendar-page__drawer--hidden")
    this.drawerBackdropTarget.classList.add("calendar-page__drawer-backdrop--hidden")
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

  syncViewTabs() {
    if (this.hasViewTabTarget) {
      this.viewTabTargets.forEach((tab) => {
        tab.setAttribute("aria-selected", tab.dataset.view === this.view ? "true" : "false")
      })
    }
  }

  syncViewVisibility() {
    const map = {
      month: this.hasMonthViewTarget ? this.monthViewTarget : null,
      week: this.hasWeekViewTarget ? this.weekViewTarget : null,
      day: this.hasDayViewTarget ? this.dayViewTarget : null,
      agenda: this.hasAgendaViewTarget ? this.agendaViewTarget : null
    }
    Object.entries(map).forEach(([name, el]) => {
      if (!el) return
      el.classList.toggle(`calendar-page__${name}--hidden`, name !== this.view)
    })
    if (this.hasSelectedDayTarget) {
      const mobile = window.matchMedia("(max-width: 767px)").matches
      this.selectedDayTarget.hidden = this.view !== "month" || !mobile
    }
  }

  syncFiltersPanel() {
    if (this.hasFiltersTarget) {
      this.filtersTarget.classList.toggle("calendar-page__filters--hidden", !this.filtersOpen)
    }
    if (this.hasFiltersToggleTarget) {
      this.filtersToggleTarget.setAttribute("aria-expanded", this.filtersOpen ? "true" : "false")
    }
  }

  syncFilterCount() {
    if (!this.hasFilterCountTarget) return
    const count = Object.values(this.appliedFilters).filter(Boolean).length
    this.filterCountTarget.textContent = String(count)
    this.filterCountTarget.classList.toggle("calendar-page__filter-count--hidden", count === 0)
  }

  syncEmptyBanner(lessons) {
    if (!this.hasEmptyBannerTarget) return
    const show = lessons.length === 0 && this.view !== "agenda"
    this.emptyBannerTarget.classList.toggle("calendar-page__empty-banner--hidden", !show)
  }
}

function emptyFilters() {
  return { teacher: "", student: "", type: "", status: "", location: "" }
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function addMonths(date, amount) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + amount)
  return next
}

function mondayIndex(date) {
  return (date.getDay() + 6) % 7
}

function startOfWeek(date) {
  return addDays(startOfDay(date), -mondayIndex(date))
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b)
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function getMonthGrid(date) {
  const first = startOfMonth(date)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

function getWeekDays(date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function shiftPeriod(date, view, direction) {
  if (view === "day") return addDays(date, direction)
  if (view === "week") return addDays(date, direction * 7)
  return addMonths(date, direction)
}

function periodTitle(date, view, months, weekdays) {
  if (view === "day") {
    return `${weekdays[mondayIndex(date)]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }
  if (view === "week") {
    const start = startOfWeek(date)
    const end = addDays(start, 6)
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${months[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${months[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function formatAgendaDate(date, months, weekdays) {
  return `${weekdays[mondayIndex(date)]}, ${months[date.getMonth()]} ${date.getDate()}`
}

function formatTimeLabel(value) {
  const [h, m] = String(value || "00:00").split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hour = ((h + 11) % 12) + 1
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`
}

function formatTimeRange(start, end) {
  return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`
}

function timeToMinutes(value) {
  const [h, m] = String(value || "00:00").split(":").map(Number)
  return h * 60 + m
}

function addHour(value) {
  const minutes = Math.min(timeToMinutes(value) + 60, (DAY_END_HOUR) * 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function currentTimeTop(now) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const start = DAY_START_HOUR * 60
  const end = DAY_END_HOUR * 60
  if (minutes < start || minutes > end) return null
  return ((minutes - start) / 60) * HOUR_HEIGHT
}

function expandRepeat(lesson, repeat, endDate) {
  if (!repeat || repeat === "none" || !endDate) return [lesson]
  const step = repeat === "biweekly" ? 14 : 7
  const lessons = [lesson]
  let date = parseDateKey(lesson.date)
  const end = parseDateKey(endDate)
  for (let index = 0; index < 52; index += 1) {
    date = addDays(date, step)
    if (date > end) break
    lessons.push({ ...lesson, id: `${lesson.id}-${index + 1}`, date: toDateKey(date) })
  }
  return lessons
}

function eventHtml(lesson, density, controller) {
  const tone = lesson.status === "cancelled" ? "cancelled" : lesson.type
  const online = lesson.location === "online" ? controller.t("common", "online") : controller.t("common", "in_person")
  const action = `data-lesson-id="${escapeHtml(lesson.id)}" data-action="click->calendar#openLesson"`
  if (density === "compact") {
    return `<button type="button" class="calendar-page__event calendar-page__event--compact calendar-page__event--${tone}" ${action}>
      <span class="calendar-page__event-time">${escapeHtml(formatTimeLabel(lesson.startTime))}</span>
      <span class="calendar-page__event-title">${escapeHtml(lesson.title)}</span>
    </button>`
  }
  if (density === "agenda") {
    return `<button type="button" class="calendar-page__event calendar-page__event--agenda calendar-page__event--${tone}" ${action}>
      <div class="calendar-page__event-time">${escapeHtml(formatTimeRange(lesson.startTime, lesson.endTime))}</div>
      <div>
        <div class="calendar-page__event-title">${escapeHtml(lesson.title)}</div>
        <div class="calendar-page__event-meta">${escapeHtml(lesson.student)} · ${escapeHtml(lesson.teacher)}</div>
        <div class="calendar-page__event-meta">${escapeHtml(controller.statusLabel(lesson.status))} · ${escapeHtml(controller.typeLabel(lesson.type))} · ${escapeHtml(online)}</div>
      </div>
    </button>`
  }
  if (density === "block") {
    return `<button type="button" class="calendar-page__event calendar-page__event--block calendar-page__event--${tone}" ${action}>
      <p class="calendar-page__event-time">${escapeHtml(formatTimeRange(lesson.startTime, lesson.endTime))}</p>
      <p class="calendar-page__event-title">${escapeHtml(lesson.title)}</p>
      <p class="calendar-page__event-meta">${escapeHtml(lesson.student)}</p>
    </button>`
  }
  return `<button type="button" class="calendar-page__event calendar-page__event--${tone}" ${action}>
    <span class="calendar-page__event-time">${escapeHtml(formatTimeLabel(lesson.startTime))}</span>
    <span class="calendar-page__event-title">${escapeHtml(lesson.title)}</span>
    <span class="calendar-page__event-meta">${escapeHtml(lesson.student)}</span>
  </button>`
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
