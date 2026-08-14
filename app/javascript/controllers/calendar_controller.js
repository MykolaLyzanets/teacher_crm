import { Controller } from "@hotwired/stimulus"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const WEEKDAY_FULL = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
]

export default class extends Controller {
  static targets = [
    "title",
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
    "weekList",
    "dayView",
    "dayList",
    "agendaView",
    "agendaList",
    "selectedDay",
    "selectedTitle",
    "selectedList",
    "emptyBanner",
    "drawer",
    "drawerBackdrop",
    "draftTeacher",
    "draftStudent",
    "draftTitle",
    "draftDate",
    "draftStart",
    "draftEnd",
    "draftType",
    "draftLocation",
    "draftNotes"
  ]

  static values = {
    lessons: Array,
    teacherId: String,
    studentId: String
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

    this.render()

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
    document.addEventListener("keydown", this.boundKeydown)
  }

  disconnect() {
    document.removeEventListener("keydown", this.boundKeydown)
  }

  onKeydown(event) {
    if (event.key === "Escape") {
      this.closeCreate()
      this.closeFilters()
    }
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
    ;[
      "filterTeacher",
      "filterStudent",
      "filterType",
      "filterStatus",
      "filterLocation"
    ].forEach((name) => {
      if (this[`has${capitalize(name)}Target`]) this[`${name}Target`].value = ""
    })
    this.filtersOpen = false
    this.syncFiltersPanel()
    this.render()
  }

  openCreate() {
    if (this.hasDraftDateTarget) this.draftDateTarget.value = toDateKey(this.selectedDate)
    if (this.hasDraftStartTarget && !this.draftStartTarget.value) this.draftStartTarget.value = "10:00"
    if (this.hasDraftEndTarget && !this.draftEndTarget.value) this.draftEndTarget.value = "11:00"
    this.drawerTarget.classList.remove("calendar-page__drawer--hidden")
    this.drawerBackdropTarget.classList.remove("calendar-page__drawer-backdrop--hidden")
  }

  closeCreate() {
    this.drawerTarget.classList.add("calendar-page__drawer--hidden")
    this.drawerBackdropTarget.classList.add("calendar-page__drawer-backdrop--hidden")
  }

  submitCreate() {
    const title = this.hasDraftTitleTarget ? this.draftTitleTarget.value.trim() : ""
    const teacherOption = this.hasDraftTeacherTarget
      ? this.draftTeacherTarget.selectedOptions[0]
      : null
    const studentOption = this.hasDraftStudentTarget
      ? this.draftStudentTarget.selectedOptions[0]
      : null
    const date = this.hasDraftDateTarget ? this.draftDateTarget.value : toDateKey(this.selectedDate)
    const startTime = this.hasDraftStartTarget ? this.draftStartTarget.value : "10:00"
    const endTime = this.hasDraftEndTarget ? this.draftEndTarget.value : "11:00"
    const type = this.hasDraftTypeTarget ? this.draftTypeTarget.value : "individual"
    const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
    const notes = this.hasDraftNotesTarget ? this.draftNotesTarget.value.trim() : ""

    if (!title || !date) {
      window.alert("Please enter a title and date.")
      return
    }

    this.lessons.push({
      id: `local-${Date.now()}`,
      title,
      student: studentOption?.textContent?.trim() || "Student",
      teacher: teacherOption?.textContent?.trim() || "Teacher",
      date,
      startTime,
      endTime,
      type,
      status: "confirmed",
      location,
      notes: notes || undefined
    })

    this.selectedDate = parseDateKey(date)
    this.cursor = new Date(this.selectedDate)
    this.closeCreate()
    this.render()
  }

  selectDay(event) {
    const key = event.currentTarget.dataset.date
    if (!key) return
    this.selectedDate = parseDateKey(key)
    if (this.view === "month" && window.matchMedia("(min-width: 768px)").matches) {
      this.openCreate()
    }
    this.render()
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
    this.titleTarget.textContent = periodTitle(this.cursor, this.view)
    this.syncViewTabs()
    this.syncFilterCount()
    this.renderMonth(byDate)
    this.renderWeek(byDate)
    this.renderDay(byDate)
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
        body = `<div class="calendar-page__day-events">${visible.map((lesson) => eventHtml(lesson, list.length > 2 ? "compact" : "month")).join("")}${
          overflow > 0 ? `<span class="calendar-page__more">+${overflow} more</span>` : ""
        }</div>`
      }

      return `<button type="button" class="${classes}" data-date="${key}" data-action="calendar#selectDay" aria-label="${WEEKDAY_FULL[(day.getDay() + 6) % 7]}, ${day.getMonth() + 1}/${day.getDate()}/${day.getFullYear()}">
        <span class="${numberClass}">${day.getDate()}</span>
        ${body}
      </button>`
    }).join("")
  }

  renderWeek(byDate) {
    if (!this.hasWeekListTarget) return
    const days = getWeekDays(this.cursor)
    this.weekListTarget.innerHTML = days.map((day) => {
      const key = toDateKey(day)
      const list = byDate[key] || []
      return `<section class="calendar-page__agenda-group">
        <h3>${formatAgendaDate(day)}${isSameDay(day, this.today) ? ' <span class="calendar-page__today-pill">Today</span>' : ""}</h3>
        ${list.length ? list.map((lesson) => eventHtml(lesson, "agenda")).join("") : `<p class="calendar-page__event-meta">No lessons</p>`}
      </section>`
    }).join("")
  }

  renderDay(byDate) {
    if (!this.hasDayListTarget) return
    const key = toDateKey(this.cursor)
    const list = byDate[key] || []
    this.dayListTarget.innerHTML = list.length
      ? list.map((lesson) => eventHtml(lesson, "agenda")).join("")
      : `<div class="calendar-page__agenda-empty"><p>No lessons on this day.</p><button type="button" class="calendar-page__primary-btn" data-action="calendar#openCreate">Create lesson</button></div>`
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
      this.agendaListTarget.innerHTML = `<div class="calendar-page__agenda-empty"><p>No lessons scheduled</p><button type="button" class="calendar-page__primary-btn" data-action="calendar#openCreate">Create lesson</button></div>`
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
        <h3>${isSameDay(date, this.today) ? '<span class="calendar-page__today-pill">Today</span>' : ""}${formatAgendaDate(date)}</h3>
        <div class="calendar-page__agenda-list">${groups[key].map((lesson) => eventHtml(lesson, "agenda")).join("")}</div>
      </section>`
    }).join("")
  }

  renderSelectedDay(byDate) {
    if (!this.hasSelectedTitleTarget || !this.hasSelectedListTarget) return
    const key = toDateKey(this.selectedDate)
    const list = byDate[key] || []
    this.selectedTitleTarget.textContent = formatAgendaDate(this.selectedDate)
    this.selectedListTarget.innerHTML = list.length
      ? list.map((lesson) => eventHtml(lesson, "agenda")).join("")
      : `<p class="calendar-page__event-meta">No lessons on this day.</p>`
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
      const hiddenClass = `calendar-page__${name}--hidden`
      el.classList.toggle(hiddenClass, name !== this.view)
    })
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

function periodTitle(date, view) {
  if (view === "day") {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }
  if (view === "week") {
    const start = startOfWeek(date)
    const end = addDays(start, 6)
    if (start.getMonth() === end.getMonth()) {
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

function formatAgendaDate(date) {
  return `${WEEKDAY_FULL[mondayIndex(date)]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`
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

function eventHtml(lesson, density) {
  const tone = lesson.status === "cancelled" ? "cancelled" : lesson.type
  if (density === "compact") {
    return `<div class="calendar-page__event calendar-page__event--compact calendar-page__event--${tone}">
      <span class="calendar-page__event-time">${escapeHtml(formatTimeLabel(lesson.startTime))}</span>
      <span class="calendar-page__event-title">${escapeHtml(lesson.title)}</span>
    </div>`
  }
  if (density === "agenda") {
    return `<div class="calendar-page__event calendar-page__event--agenda calendar-page__event--${tone}">
      <div class="calendar-page__event-time">${escapeHtml(formatTimeRange(lesson.startTime, lesson.endTime))}</div>
      <div>
        <div class="calendar-page__event-title">${escapeHtml(lesson.title)}</div>
        <div class="calendar-page__event-meta">${escapeHtml(lesson.student)} · ${escapeHtml(lesson.teacher)}</div>
        <div class="calendar-page__event-meta">${escapeHtml(lesson.status)} · ${escapeHtml(lesson.type)} · ${lesson.location === "online" ? "Online" : "In person"}</div>
      </div>
    </div>`
  }
  return `<div class="calendar-page__event calendar-page__event--${tone}">
    <span class="calendar-page__event-time">${escapeHtml(formatTimeLabel(lesson.startTime))}</span>
    <span class="calendar-page__event-title">${escapeHtml(lesson.title)}</span>
    <span class="calendar-page__event-meta">${escapeHtml(lesson.student)}</span>
  </div>`
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
