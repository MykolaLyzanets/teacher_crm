import { Controller } from "@hotwired/stimulus"
import {
  formatMoney,
  formatPriceInput,
  getBookableLessonTypesForTeacher,
  initLessonTypesStore,
  lessonTypeDisplayName,
  lessonTypeNameForLesson,
  priceSuffix,
  uniqueLessonTypeNames
} from "../lib/lesson_types_store"

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
    "filterLessonType",
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
    "draftDate",
    "draftStart",
    "draftEnd",
    "draftType",
    "draftLessonType",
    "lessonTypeHint",
    "lessonTypeEmpty",
    "draftLocation",
    "draftMeeting",
    "draftPlace",
    "draftRepeat",
    "draftRepeatEnd",
    "draftNotes",
    "onlineField",
    "placeField",
    "repeatExtra",
    "typeBtn",
    "formatBtn",
    "studentWrap",
    "groupWrap",
    "groupChips",
    "groupAdd",
    "groupCount",
    "draftSubject",
    "subjectHint",
    "draftPrice",
    "draftCurrency",
    "customDays",
    "weekdayBtn",
    "summary",
    "details",
    "detailsTitle",
    "detailsTone",
    "detailsType",
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
    teachers: Array,
    students: Array,
    teacherId: String,
    studentId: String,
    i18n: Object,
    lessonTypesSeed: Object
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
    this.studentIds = []
    this.customWeekdays = []
    this.priceTouched = false
    this.lessonType = "individual"
    this.selectedLessonTypeId = ""
    initLessonTypesStore(this.lessonTypesSeedValue || {})
    this.populateLessonTypeFilter()

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
    } else if (new URLSearchParams(window.location.search).get("create") === "1") {
      this.openCreate()
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
      lessonTypeName: this.hasFilterLessonTypeTarget ? this.filterLessonTypeTarget.value : "",
      status: this.hasFilterStatusTarget ? this.filterStatusTarget.value : "",
      location: this.hasFilterLocationTarget ? this.filterLocationTarget.value : ""
    }
    this.filtersOpen = false
    this.syncFiltersPanel()
    this.render()
  }

  clearFilters() {
    this.appliedFilters = emptyFilters()
    ;["filterTeacher", "filterStudent", "filterType", "filterLessonType", "filterStatus", "filterLocation"].forEach((name) => {
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
      type: "individual",
      location: "online",
      meetingLink: "",
      locationText: "",
      repeat: "none",
      notes: "",
      subject: "",
      teacherId: this.teacherIdValue || "",
      studentId: this.studentIdValue || "",
      studentIds: this.studentIdValue ? [this.studentIdValue] : []
    })
    this.setDrawerMode("create")
    this.showDrawer()
  }

  closeCreate() {
    this.hideDrawer()
    this.editingId = null
  }

  teacherRecord(id) {
    return (this.teachersValue || []).find((item) => String(item.id) === String(id))
  }

  studentRecord(id) {
    return (this.studentsValue || []).find((item) => String(item.id) === String(id))
  }

  studentLabel(id) {
    const student = this.studentRecord(id)
    if (!student) return ""
    return [student.preferredName || student.firstName, student.lastName].filter(Boolean).join(" ")
  }

  teacherDuration(teacher) {
    return Number(teacher?.defaultLessonDurationMinutes) || 60
  }

  setLessonType(event) {
    this.applyLessonTypeMode(event.currentTarget.dataset.type === "group" ? "group" : "individual")
  }

  onLessonTypeChange() {
    const id = this.hasDraftLessonTypeTarget ? this.draftLessonTypeTarget.value : ""
    this.selectedLessonTypeId = id
    const bookable = this.bookableTypesForCurrentTeacher().find((item) => item.lessonType.id === id)
    if (bookable) {
      this.applyLessonTypeMode(bookable.lessonType.mode)
      this.applyLessonTypeDefaults(bookable)
    }
    this.syncDrawerFields()
  }

  applyLessonTypeMode(mode) {
    this.lessonType = mode === "group" ? "group" : "individual"
    if (this.hasDraftTypeTarget) this.draftTypeTarget.value = this.lessonType
    if (this.lessonType === "individual") this.studentIds = this.studentIds.slice(0, 1)
    this.syncLessonTypeUi()
  }

  applyLessonTypeDefaults(bookable) {
    const duration = Number(bookable.lessonType.defaultDurationMinutes) || 60
    if (this.hasDraftStartTarget && this.hasDraftEndTarget) {
      this.draftEndTarget.value = minutesToTime(timeToMinutes(this.draftStartTarget.value) + duration)
    }
    if (!this.priceTouched && this.hasDraftPriceTarget) {
      this.draftPriceTarget.value = formatPriceInput(bookable.effectivePriceCents)
    }
    if (!this.priceTouched && this.hasDraftCurrencyTarget) {
      this.draftCurrencyTarget.value = bookable.effectiveCurrency || "UAH"
    }
  }

  bookableTypesForCurrentTeacher() {
    const teacher = this.teacherRecord(this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : "")
    if (!teacher) return []
    return getBookableLessonTypesForTeacher(teacher.id, teacher.email)
  }

  populateLessonTypeFilter() {
    if (!this.hasFilterLessonTypeTarget) return
    const current = this.filterLessonTypeTarget.value
    const names = uniqueLessonTypeNames()
    this.filterLessonTypeTarget.innerHTML = `<option value="">${escapeHtml(this.t("calendar", "all_types"))}</option>` +
      names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")
    this.filterLessonTypeTarget.value = names.includes(current) ? current : ""
  }

  rebuildLessonTypeSelect(preferredId) {
    if (!this.hasDraftLessonTypeTarget) return
    const teacher = this.teacherRecord(this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : "")
    const bookable = teacher ? getBookableLessonTypesForTeacher(teacher.id, teacher.email) : []
    if (this.hasLessonTypeHintTarget) this.lessonTypeHintTarget.hidden = Boolean(teacher)
    if (this.hasLessonTypeEmptyTarget) this.lessonTypeEmptyTarget.hidden = !teacher || bookable.length > 0
    this.draftLessonTypeTarget.hidden = !teacher || bookable.length === 0
    this.draftLessonTypeTarget.innerHTML = `<option value="">${escapeHtml(this.t("calendar", "select_lesson_type"))}</option>` +
      bookable.map((item) => {
        const typeLabel = lessonTypeDisplayName(item.lessonType)
        const price = item.lessonType.isFree
          ? "Free"
          : `${formatMoney(item.effectivePriceCents, item.effectiveCurrency)}${priceSuffix(item.lessonType.priceType)}`
        return `<option value="${escapeHtml(item.lessonType.id)}">${escapeHtml(typeLabel)} · ${item.lessonType.defaultDurationMinutes} ${escapeHtml(this.t("calendar", "min") || "min")} · ${escapeHtml(price)}</option>`
      }).join("")
    const nextId = preferredId && bookable.some((item) => item.lessonType.id === preferredId)
      ? preferredId
      : (bookable[0]?.lessonType.id || "")
    this.draftLessonTypeTarget.value = nextId
    this.selectedLessonTypeId = nextId
    if (nextId) {
      const selected = bookable.find((item) => item.lessonType.id === nextId)
      if (selected) this.applyLessonTypeMode(selected.lessonType.mode)
    }
    return bookable.find((item) => item.lessonType.id === nextId)
  }

  syncLessonTypeUi() {
    const group = this.lessonType === "group"
    if (this.hasTypeBtnTarget) {
      this.typeBtnTargets.forEach((button) => {
        button.setAttribute("aria-checked", button.dataset.type === this.lessonType ? "true" : "false")
      })
    }
    if (this.hasStudentWrapTarget) this.studentWrapTarget.hidden = group
    if (this.hasGroupWrapTarget) this.groupWrapTarget.hidden = !group
    if (!group && this.hasDraftStudentTarget) this.draftStudentTarget.value = this.studentIds[0] || ""
    this.renderGroupChips()
  }

  onStudentChange() {
    const id = this.hasDraftStudentTarget ? this.draftStudentTarget.value : ""
    this.studentIds = id ? [id] : []
    const student = this.studentRecord(id)
    if (student?.teacherId && this.hasDraftTeacherTarget && !this.draftTeacherTarget.value) {
      this.draftTeacherTarget.value = student.teacherId
      this.applyTeacherDefaults(student.teacherId)
    }
    this.syncDrawerFields()
  }

  addParticipant() {
    const id = this.hasGroupAddTarget ? this.groupAddTarget.value : ""
    if (id && !this.studentIds.includes(id)) this.studentIds = [...this.studentIds, id]
    if (this.hasGroupAddTarget) this.groupAddTarget.value = ""
    this.renderGroupChips()
    this.syncDrawerFields()
  }

  removeParticipant(event) {
    const button = event.target.closest("button[data-id]")
    if (!button || !this.hasGroupChipsTarget || !this.groupChipsTarget.contains(button)) return
    this.studentIds = this.studentIds.filter((item) => item !== button.dataset.id)
    this.renderGroupChips()
    this.syncDrawerFields()
  }

  renderGroupChips() {
    if (!this.hasGroupChipsTarget) return
    this.groupChipsTarget.innerHTML = this.studentIds.map((id) => {
      const name = escapeHtml(this.studentLabel(id) || id)
      return `<span class="calendar-page__chip">${name}<button type="button" data-id="${escapeHtml(id)}">×</button></span>`
    }).join("")
    if (this.hasGroupCountTarget) {
      this.groupCountTarget.textContent = this.studentIds.length ? ` · ${this.studentIds.length}` : ""
    }
  }

  onTeacherChange() {
    this.applyTeacherDefaults(this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : "")
    this.syncDrawerFields()
  }

  applyTeacherDefaults(teacherId) {
    const teacher = this.teacherRecord(teacherId)
    const selected = this.rebuildLessonTypeSelect(this.selectedLessonTypeId)
    if (selected) {
      this.applyLessonTypeDefaults(selected)
    } else if (this.hasDraftStartTarget && this.hasDraftEndTarget) {
      this.draftEndTarget.value = minutesToTime(timeToMinutes(this.draftStartTarget.value) + this.teacherDuration(teacher))
    }
    if (teacher?.defaultMeetingLink && this.hasDraftMeetingTarget && !this.draftMeetingTarget.value) {
      this.draftMeetingTarget.value = teacher.defaultMeetingLink
    }
    this.rebuildSubjects(teacher)
  }

  rebuildSubjects(teacher) {
    if (!this.hasDraftSubjectTarget) return
    const subjects = Array.isArray(teacher?.subjects) ? teacher.subjects : []
    const current = this.draftSubjectTarget.value
    this.draftSubjectTarget.innerHTML = `<option value="">${escapeHtml(this.t("calendar", "select_subject"))}</option>` +
      subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")
    this.draftSubjectTarget.value = subjects.includes(current) ? current : ""
    this.draftSubjectTarget.hidden = subjects.length === 0
    if (this.hasSubjectHintTarget) {
      this.subjectHintTarget.hidden = Boolean(teacher) && subjects.length > 0
      this.subjectHintTarget.textContent = teacher ? this.t("calendar", "subject_empty") : this.t("calendar", "subject_need_teacher")
    }
  }

  onStartChange() {
    const teacher = this.teacherRecord(this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : "")
    const bookable = this.bookableTypesForCurrentTeacher().find((item) => item.lessonType.id === this.selectedLessonTypeId)
    const duration = Number(bookable?.lessonType.defaultDurationMinutes) || this.teacherDuration(teacher)
    if (this.hasDraftStartTarget && this.hasDraftEndTarget) {
      this.draftEndTarget.value = minutesToTime(timeToMinutes(this.draftStartTarget.value) + duration)
    }
    this.syncDrawerFields()
  }

  onPriceChange() {
    this.priceTouched = true
    this.syncDrawerFields()
  }

  setFormat(event) {
    const location = event.currentTarget.dataset.location === "in_person" ? "in_person" : "online"
    if (this.hasDraftLocationTarget) this.draftLocationTarget.value = location
    this.syncFormatUi()
    const teacher = this.teacherRecord(this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : "")
    if (location === "online" && this.hasDraftMeetingTarget && !this.draftMeetingTarget.value && teacher?.defaultMeetingLink) {
      this.draftMeetingTarget.value = teacher.defaultMeetingLink
    }
    this.syncDrawerFields()
  }

  syncFormatUi() {
    const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
    this.formatBtnTargets.forEach((button) => {
      button.setAttribute("aria-checked", button.dataset.location === location ? "true" : "false")
    })
    if (this.hasOnlineFieldTarget) this.onlineFieldTarget.hidden = location !== "online"
    if (this.hasPlaceFieldTarget) this.placeFieldTarget.hidden = location === "online"
  }

  toggleWeekday(event) {
    const day = event.currentTarget.dataset.day
    this.customWeekdays = this.customWeekdays.includes(day)
      ? this.customWeekdays.filter((item) => item !== day)
      : [...this.customWeekdays, day]
    this.syncWeekdayUi()
    this.syncDrawerFields()
  }

  syncWeekdayUi() {
    this.weekdayBtnTargets.forEach((button) => {
      button.setAttribute("aria-pressed", this.customWeekdays.includes(button.dataset.day) ? "true" : "false")
    })
  }

  syncDrawerFields() {
    this.syncFormatUi()
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    if (this.hasRepeatExtraTarget) this.repeatExtraTarget.hidden = repeat === "none" || Boolean(this.editingId)
    if (this.hasCustomDaysTarget) this.customDaysTarget.hidden = repeat !== "custom" || Boolean(this.editingId)
    this.updateSummary()
    this.syncSubmit()
  }

  requiredFieldsOk() {
    const teacherId = this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : ""
    const date = this.hasDraftDateTarget ? this.draftDateTarget.value : ""
    const start = this.hasDraftStartTarget ? this.draftStartTarget.value : ""
    const end = this.hasDraftEndTarget ? this.draftEndTarget.value : ""
    if (!teacherId || !date || !start || !end) return false
    if (!this.selectedLessonTypeId) return false
    if (timeToMinutes(end) <= timeToMinutes(start)) return false
    if (this.lessonType === "group") {
      if (this.studentIds.length < 2) return false
    } else if (this.studentIds.length !== 1) return false
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    if (repeat !== "none" && !this.editingId) {
      const until = this.hasDraftRepeatEndTarget ? this.draftRepeatEndTarget.value : ""
      if (!until) return false
    }
    return true
  }

  syncSubmit() {
    if (this.hasDrawerSubmitTarget) this.drawerSubmitTarget.disabled = !this.requiredFieldsOk()
  }

  updateSummary() {
    if (!this.hasSummaryTarget) return
    if (!this.requiredFieldsOk()) {
      this.summaryTarget.hidden = true
      return
    }
    const teacherName = this.hasDraftTeacherTarget ? (this.draftTeacherTarget.selectedOptions[0]?.textContent?.trim() || "") : ""
    const subject = this.hasDraftSubjectTarget ? this.draftSubjectTarget.value : ""
    const when = `${formatLessonDayShort(this.draftDateTarget.value)} · ${formatTimeRange(this.draftStartTarget.value, this.draftEndTarget.value)}`
    const cents = parsePriceAmount(this.hasDraftPriceTarget ? this.draftPriceTarget.value : "")
    const currency = this.hasDraftCurrencyTarget ? this.draftCurrencyTarget.value : "EUR"
    const price = cents == null ? "" : formatMoneyLabel(cents, currency)
    const bookable = this.bookableTypesForCurrentTeacher().find((item) => item.lessonType.id === this.selectedLessonTypeId)
    const typeName = bookable?.lessonType.name || this.t("calendar", "individual")
    const group = this.lessonType === "group" || this.studentIds.length > 1
    const headline = group ? `${typeName} · ${this.studentIds.length}` : typeName
    const people = group ? teacherName : `${this.studentLabel(this.studentIds[0])} · ${teacherName}`
    this.summaryTarget.hidden = false
    this.summaryTarget.innerHTML = `<p>${escapeHtml(headline)}</p>${subject ? `<p>${escapeHtml(subject)}</p>` : ""}<p>${escapeHtml(people)}</p><p>${escapeHtml(when)}</p>${price ? `<p class="calendar-page__summary-price">${escapeHtml(price)}</p>` : ""}`
  }

  buildTitle() {
    const subject = this.hasDraftSubjectTarget ? this.draftSubjectTarget.value.trim() : ""
    const group = this.lessonType === "group" || this.studentIds.length > 1
    if (group) return subject ? `${subject} · ${this.t("calendar", "group_lesson")}` : this.t("calendar", "group_lesson")
    const name = this.studentLabel(this.studentIds[0])
    if (subject && name) return `${subject} · ${name}`
    return subject || name || this.t("calendar", "individual_lesson")
  }

  partyLabel() {
    if (this.lessonType === "group" || this.studentIds.length > 1) {
      return this.t("calendar", "group_count").replace("%{count}", String(this.studentIds.length))
    }
    return this.studentLabel(this.studentIds[0]) || this.t("common", "student")
  }

  submitCreate() {
    if (!this.requiredFieldsOk()) return
    const date = this.draftDateTarget.value
    const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
    const meetingLink = this.hasDraftMeetingTarget ? this.draftMeetingTarget.value.trim() : ""
    const locationText = this.hasDraftPlaceTarget ? this.draftPlaceTarget.value.trim() : ""
    const notes = this.hasDraftNotesTarget ? this.draftNotesTarget.value.trim() : ""
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    const repeatEnd = this.hasDraftRepeatEndTarget ? this.draftRepeatEndTarget.value : ""
    const cents = parsePriceAmount(this.hasDraftPriceTarget ? this.draftPriceTarget.value : "")
    const payload = {
      title: this.buildTitle(),
      subject: this.hasDraftSubjectTarget ? this.draftSubjectTarget.value : "",
      student: this.partyLabel(),
      teacher: this.draftTeacherTarget.selectedOptions[0]?.textContent?.trim() || this.t("common", "teacher"),
      teacherId: this.draftTeacherTarget.value,
      studentId: this.studentIds[0] || "",
      studentIds: [...this.studentIds],
      date,
      startTime: this.draftStartTarget.value,
      endTime: this.draftEndTarget.value,
      type: this.lessonType,
      status: "confirmed",
      location,
      meetingLink: location === "online" ? meetingLink : undefined,
      locationText: location === "in_person" ? locationText : undefined,
      notes: notes || undefined,
      priceCents: cents,
      currency: this.hasDraftCurrencyTarget ? this.draftCurrencyTarget.value : "EUR",
      lessonTypeId: this.selectedLessonTypeId,
      lessonTypeName: this.bookableTypesForCurrentTeacher().find((item) => item.lessonType.id === this.selectedLessonTypeId)?.lessonType.name
    }

    if (this.editingId) {
      this.lessons = this.lessons.map((lesson) =>
        lesson.id === this.editingId ? { ...lesson, ...payload } : lesson
      )
      this.showToast(this.t("calendar", "updated"))
    } else {
      const created = expandRepeat({ ...payload, id: `local-${Date.now()}` }, repeat, repeatEnd, this.customWeekdays)
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
      if (this.appliedFilters.type) {
        const mode = lesson.type === "group" ? "group" : "individual"
        if (mode !== this.appliedFilters.type) return false
      }
      if (this.appliedFilters.lessonTypeName && lessonTypeNameForLesson(lesson) !== this.appliedFilters.lessonTypeName) return false
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
    if (this.hasDetailsTypeTarget) this.detailsTypeTarget.textContent = lessonTypeNameForLesson(lesson) || this.typeLabel(lesson.type)
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
    this.priceTouched = lesson.priceCents != null
    this.lessonType = lesson.type === "group" ? "group" : "individual"
    this.customWeekdays = Array.isArray(lesson.customWeekdays) ? [...lesson.customWeekdays] : []
    this.studentIds = uniqueIds(lesson.studentIds || [lesson.studentId].filter(Boolean))
    if (this.hasDraftDateTarget) this.draftDateTarget.value = lesson.date || toDateKey(this.selectedDate)
    if (this.hasDraftStartTarget) this.draftStartTarget.value = lesson.startTime || "10:00"
    if (this.hasDraftEndTarget) this.draftEndTarget.value = lesson.endTime || "11:00"
    if (this.hasDraftTypeTarget) this.draftTypeTarget.value = this.lessonType
    if (this.hasDraftLocationTarget) this.draftLocationTarget.value = lesson.location || "online"
    if (this.hasDraftMeetingTarget) this.draftMeetingTarget.value = lesson.meetingLink || ""
    if (this.hasDraftPlaceTarget) this.draftPlaceTarget.value = lesson.locationText || ""
    if (this.hasDraftRepeatTarget) this.draftRepeatTarget.value = "none"
    if (this.hasDraftNotesTarget) this.draftNotesTarget.value = lesson.notes || ""
    if (this.hasDraftTeacherTarget) this.draftTeacherTarget.value = lesson.teacherId || ""
    const selected = this.rebuildLessonTypeSelect(lesson.lessonTypeId)
    if (this.hasDraftStudentTarget) this.draftStudentTarget.value = this.studentIds[0] || ""
    if (this.hasDraftPriceTarget && lesson.priceCents != null) {
      this.draftPriceTarget.value = String(Math.round(Number(lesson.priceCents) / 100))
    } else if (selected && !this.priceTouched) {
      this.applyLessonTypeDefaults(selected)
    }
    if (this.hasDraftCurrencyTarget && lesson.currency) {
      this.draftCurrencyTarget.value = lesson.currency
    }
    this.rebuildSubjects(this.teacherRecord(lesson.teacherId))
    if (this.hasDraftSubjectTarget) this.draftSubjectTarget.value = lesson.subject || ""
    this.syncLessonTypeUi()
    this.syncWeekdayUi()
    this.syncDrawerFields()
  }

  setDrawerMode(mode) {
    if (this.hasDrawerTitleTarget) {
      this.drawerTitleTarget.textContent = mode === "edit" ? this.t("calendar", "edit_lesson") : this.t("calendar", "drawer_title")
    }
    if (this.hasDrawerSubmitTarget) {
      this.drawerSubmitTarget.textContent = mode === "edit" ? this.t("calendar", "save_changes") : this.t("calendar", "create_lesson")
    }
    this.syncDrawerFields()
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
  return { teacher: "", student: "", type: "", lessonTypeName: "", status: "", location: "" }
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

function minutesToTime(total) {
  const safe = Math.max(0, Math.min(total, 24 * 60 - 1))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean).map(String))]
}

function parsePriceAmount(value) {
  const raw = String(value || "").trim().replace(",", ".")
  if (!raw) return null
  const amount = Number(raw)
  if (!Number.isFinite(amount)) return null
  return Math.round(amount * 100)
}

function formatMoneyLabel(cents, currency) {
  const amount = Math.round(Math.abs(Number(cents) || 0) / 100)
  if (currency === "EUR") return `€${amount}`
  return `${currency} ${amount}`
}

function formatLessonDayShort(dateKey) {
  const date = parseDateKey(dateKey)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${date.getDate()} ${months[date.getMonth()]}`
}

function addHour(value) {
  return minutesToTime(Math.min(timeToMinutes(value) + 60, DAY_END_HOUR * 60))
}

function currentTimeTop(now) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const start = DAY_START_HOUR * 60
  const end = DAY_END_HOUR * 60
  if (minutes < start || minutes > end) return null
  return ((minutes - start) / 60) * HOUR_HEIGHT
}

function expandRepeat(lesson, repeat, endDate, weekdays = []) {
  if (!repeat || repeat === "none" || !endDate) return [lesson]
  const lessons = [lesson]
  const end = parseDateKey(endDate)
  if (repeat === "custom") {
    const wanted = new Set((weekdays.length ? weekdays : [weekdayNameFromDate(parseDateKey(lesson.date))]).map(String))
    let date = parseDateKey(lesson.date)
    let index = 0
    while (index < 60) {
      date = addDays(date, 1)
      if (date > end) break
      if (!wanted.has(weekdayNameFromDate(date))) continue
      index += 1
      lessons.push({ ...lesson, id: `${lesson.id}-${index}`, date: toDateKey(date) })
    }
    return lessons
  }
  const step = repeat === "biweekly" ? 14 : 7
  let date = parseDateKey(lesson.date)
  for (let index = 0; index < 52; index += 1) {
    date = addDays(date, step)
    if (date > end) break
    lessons.push({ ...lesson, id: `${lesson.id}-${index + 1}`, date: toDateKey(date) })
  }
  return lessons
}

function weekdayNameFromDate(date) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()]
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
