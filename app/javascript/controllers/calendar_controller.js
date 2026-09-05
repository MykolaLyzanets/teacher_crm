import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"
import {
  checkTeacherAvailability,
  findStudentConflicts,
  generateOccurrenceDates,
  initials,
  studentName,
  teacherName
} from "../lib/calendar_create"
import { closeModal } from "../lib/modal"
import {
  formatMoney,
  formatPriceInput,
  getBookableLessonTypesForTeacher,
  initLessonTypesStore,
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

let pendingCreateDraft = null

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
    "drawerTitle",
    "drawerSubmit",
    "draftTeacher",
    "draftDate",
    "draftStart",
    "draftEnd",
    "draftType",
    "draftLessonType",
    "lessonTypeHint",
    "lessonTypeEmpty",
    "lessonTypeHelp",
    "lessonTypeChanged",
    "draftLocation",
    "draftMeeting",
    "draftPlace",
    "draftRepeat",
    "draftRepeatEnd",
    "draftNotes",
    "onlineField",
    "placeField",
    "repeatExtra",
    "repeatSummary",
    "formatBtn",
    "studentWrap",
    "groupWrap",
    "groupChips",
    "groupCount",
    "groupNeedTeacher",
    "groupPicker",
    "groupTrigger",
    "groupMenu",
    "groupQuery",
    "groupList",
    "draftSubject",
    "subjectHint",
    "subjectEmpty",
    "manageLessonsLink",
    "draftPrice",
    "draftCurrency",
    "customDays",
    "weekdayBtn",
    "summary",
    "teacherLocked",
    "teacherLockedName",
    "teacherField",
    "teacherPicker",
    "teacherTrigger",
    "teacherLabel",
    "teacherBrowse",
    "teacherMenu",
    "teacherQuery",
    "teacherList",
    "teacherClear",
    "teacherAutoHint",
    "teacherUnassignedHint",
    "teacherMismatch",
    "teacherMismatchText",
    "studentNeedTeacher",
    "studentPicker",
    "studentTrigger",
    "studentLabel",
    "studentBrowse",
    "studentMenu",
    "studentQuery",
    "studentList",
    "assignPermanentWrap",
    "assignPermanent",
    "timezoneLabel",
    "availability",
    "studentConflicts",
    "conflictOptions",
    "repeatConflictHint",
    "skipConflictWrap",
    "skipConflict",
    "overrideWrap",
    "overrideConflict",
    "overrideReasonWrap",
    "overrideReason",
    "formError",
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
    "overflowList",
    "createLink",
    "studentsSeed",
    "teachersSeed"
  ]

  static values = {
    lessons: Array,
    teachers: Array,
    students: Array,
    teacherId: String,
    studentId: String,
    i18n: Object,
    lessonTypesSeed: Object,
    showPrice: { type: Boolean, default: false },
    canOverride: { type: Boolean, default: false },
    canManageTeachers: { type: Boolean, default: false },
    lockTeacher: { type: Boolean, default: false },
    currentTeacherId: String,
    timezone: String,
    createUrl: String,
    dismissUrl: String,
    embedded: { type: Boolean, default: false }
  }

  monthName(index) {
    return this.i18nValue?.calendar?.months?.[MONTH_KEYS[index]] || MONTH_KEYS[index]
  }

  weekdayName(index) {
    return this.i18nValue?.calendar?.weekdays?.[WEEKDAY_KEYS[index]] || WEEKDAY_KEYS[index]
  }

  t(group, key) {
    const value = this.i18nValue?.[group]?.[key]
    return typeof value === "string" ? value : key
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
    this.teacherChoice = null
    this.openPicker = null
    this.originalLesson = null
    this.pendingDraft = null
    this.lessonType = "individual"
    this.selectedLessonTypeId = ""
    initLessonTypesStore(this.lessonTypesSeedValue || {})
    this.boundPointer = this.onPointerDown.bind(this)
    document.addEventListener("mousedown", this.boundPointer)

    if (this.embeddedValue) return

    this.populateLessonTypeFilter()
    this.render()
    this.boundKeydown = this.onKeydown.bind(this)
    this.boundResize = this.render.bind(this)
    this.boundLessonsChanged = this.onEmbeddedLessonsChanged.bind(this)
    document.addEventListener("keydown", this.boundKeydown)
    window.addEventListener("resize", this.boundResize)
    document.addEventListener("calendar:lessons-changed", this.boundLessonsChanged)
    this.openCreateFromQuery()
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    if (this.boundKeydown) document.removeEventListener("keydown", this.boundKeydown)
    if (this.boundResize) window.removeEventListener("resize", this.boundResize)
    if (this.boundLessonsChanged) document.removeEventListener("calendar:lessons-changed", this.boundLessonsChanged)
    if (this.hasDrawerTarget) closeModal(this.drawerTarget)
  }

  onKeydown(event) {
    if (event.key !== "Escape") return
    if (this.openPicker) {
      event.preventDefault()
      event.stopImmediatePropagation()
      this.closePickers()
      return
    }
    this.closeFilters()
    this.closeLesson()
    this.closeOverflow()
  }

  onPointerDown(event) {
    if (!this.openPicker) return
    const root = this.pickerRoot(this.openPicker)
    if (root && !root.contains(event.target)) this.closePickers()
  }

  pickerRoot(name) {
    if (name === "teacher") return this.hasTeacherPickerTarget ? this.teacherPickerTarget : null
    if (name === "student") return this.hasStudentPickerTarget ? this.studentPickerTarget : null
    if (name === "group") return this.hasGroupPickerTarget ? this.groupPickerTarget : null
    return null
  }

  toggleTeacherPicker(event) {
    event?.stopPropagation?.()
    this.togglePicker("teacher")
  }

  toggleStudentPicker(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    this.togglePicker("student")
  }

  toggleGroupPicker(event) {
    event?.stopPropagation?.()
    this.togglePicker("group")
  }

  togglePicker(name) {
    const opening = this.openPicker !== name
    this.closePickers()
    if (!opening) return
    const menuName = `${name}Menu`
    if (!this[`has${capitalize(menuName)}Target`]) return
    this.openPicker = name
    this[`${menuName}Target`].hidden = false
    this.syncPickerExpanded()
    if (name === "teacher") this.filterTeachers()
    if (name === "student") this.filterStudents()
    if (name === "group") this.filterGroupStudents()
    const query = this[`has${capitalize(name)}QueryTarget`] ? this[`${name}QueryTarget`] : null
    window.requestAnimationFrame(() => query?.focus?.())
  }

  closePickers() {
    this.openPicker = null
    ;["teacherMenu", "studentMenu", "groupMenu"].forEach((name) => {
      if (this[`has${capitalize(name)}Target`]) this[`${name}Target`].hidden = true
    })
    this.syncPickerExpanded()
  }

  syncPickerExpanded() {
    if (this.hasTeacherTriggerTarget) this.teacherTriggerTarget.setAttribute("aria-expanded", this.openPicker === "teacher" ? "true" : "false")
    if (this.hasStudentTriggerTarget) this.studentTriggerTarget.setAttribute("aria-expanded", this.openPicker === "student" ? "true" : "false")
    if (this.hasGroupTriggerTarget) this.groupTriggerTarget.setAttribute("aria-expanded", this.openPicker === "group" ? "true" : "false")
    if (this.hasTeacherBrowseTarget) this.teacherBrowseTarget.textContent = this.t("calendar", this.openPicker === "teacher" ? "hide" : "browse")
    if (this.hasStudentBrowseTarget) this.studentBrowseTarget.textContent = this.t("calendar", this.openPicker === "student" ? "hide" : "browse")
  }

  filterTeachers() {
    if (!this.hasTeacherListTarget) return
    const needle = (this.hasTeacherQueryTarget ? this.teacherQueryTarget.value : "").trim().toLowerCase()
    const selected = this.currentTeacherIdValue && this.lockTeacherValue ? this.currentTeacherIdValue : this.draftTeacherId()
    const teachers = (this.teachersValue || []).filter((teacher) => {
      if (teacher.status === "archived") return false
      if (!needle) return true
      return [teacherName(teacher), teacher.jobTitle, ...(teacher.subjects || [])].join(" ").toLowerCase().includes(needle)
    })
    this.teacherListTarget.innerHTML = teachers.length
      ? teachers.map((teacher) => this.teacherOptionHtml(teacher, String(teacher.id) === String(selected))).join("")
      : `<p class="calendar-page__picker-empty">${escapeHtml(this.t("calendar", "no_teachers_match"))}</p>`
  }

  teacherOptionHtml(teacher, selected) {
    const name = teacherName(teacher)
    const meta = teacher.jobTitle || (teacher.subjects || []).slice(0, 2).join(", ") || this.t("common", "teacher")
    const assigned = this.assignedCountFor(teacher)
    const count = ` · ${this.t("calendar", "assigned_n").replace("%{count}", String(assigned))}`
    const photo = teacher.photo || teacher.photoUrl
    return `<button type="button" class="calendar-page__option${selected ? " is-selected" : ""}" role="option" aria-selected="${selected}" data-id="${escapeHtml(teacher.id)}" data-action="calendar#pickTeacher">
      <span class="calendar-page__avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : escapeHtml(initials(name))}</span>
      <span class="calendar-page__option-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(meta)}${escapeHtml(count)}</span></span>
    </button>`
  }

  assignedCountFor(teacher) {
    if (teacher?.assignedCount != null) return Number(teacher.assignedCount)
    return (this.studentsValue || []).filter((student) => {
      if (student.status === "archived") return false
      return String(student.teacherId || "") === String(teacher.id)
    }).length
  }

  clearTeacher() {
    this.selectTeacher("", null)
    this.closePickers()
  }

  filterStudents() {
    this.renderStudentList(this.hasStudentListTarget ? this.studentListTarget : null, this.hasStudentQueryTarget ? this.studentQueryTarget.value : "", false)
  }

  filterGroupStudents() {
    this.renderStudentList(this.hasGroupListTarget ? this.groupListTarget : null, this.hasGroupQueryTarget ? this.groupQueryTarget.value : "", true)
  }

  assignedStudents() {
    const active = (this.studentsValue || []).filter((student) => student.status !== "archived")
    const teacherId = this.draftTeacherId()
    const solo = this.lockTeacherValue || (this.teachersValue || []).filter((teacher) => teacher.status !== "archived").length <= 1
    if (solo || !teacherId) return active
    const matched = active.filter((student) => {
      const assignedId = String(student.teacherId || "")
      return assignedId === String(teacherId) || assignedId === ""
    })
    return matched.length ? matched : active
  }

  renderStudentList(container, query, multiple) {
    if (!container) return
    const needle = String(query || "").trim().toLowerCase()
    const students = this.assignedStudents().filter((student) => {
      if (multiple && this.studentIds.map(String).includes(String(student.id))) return false
      if (!needle) return true
      return [studentName(student), ...(student.subjects || []), student.grade].join(" ").toLowerCase().includes(needle)
    })
    if (!students.length) {
      container.innerHTML = `<p class="calendar-page__picker-empty">${escapeHtml(this.t("calendar", "no_assigned_students"))}</p>`
      return
    }
    const action = multiple ? "calendar#pickGroupStudent" : "calendar#pickStudent"
    container.innerHTML = students.map((student) => {
      const name = studentName(student)
      const selected = this.studentIds.map(String).includes(String(student.id))
      const status = this.i18nValue?.statuses?.[student.status] || student.status || ""
      const meta = (student.subjects || []).slice(0, 2).join(", ") || student.grade || this.t("common", "student")
      const photo = student.photo || student.photoUrl
      return `<button type="button" class="calendar-page__option${selected ? " is-selected" : ""}" role="option" aria-selected="${selected}" data-id="${escapeHtml(student.id)}" data-action="${action}">
        <span class="calendar-page__avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : escapeHtml(initials(name))}</span>
        <span class="calendar-page__option-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(status)} · ${escapeHtml(meta)}</span></span>
      </button>`
    }).join("")
  }

  pickTeacher(event) {
    const id = event.currentTarget.dataset.id || ""
    this.selectTeacher(id, "selected")
    this.closePickers()
  }

  pickStudent(event) {
    this.setStudentIds(event.currentTarget.dataset.id ? [event.currentTarget.dataset.id] : [])
    this.closePickers()
  }

  pickGroupStudent(event) {
    const id = event.currentTarget.dataset.id
    if (id && !this.studentIds.map(String).includes(String(id))) this.setStudentIds([...this.studentIds, id])
    this.closePickers()
  }

  selectTeacher(id, choice = "selected") {
    if (this.hasDraftTeacherTarget) this.draftTeacherTarget.value = id || ""
    this.teacherChoice = id ? choice : null
    this.studentIds = []
    this.selectedLessonTypeId = ""
    this.priceTouched = false
    if (this.hasDraftSubjectTarget) this.draftSubjectTarget.value = ""
    if (this.hasDraftLessonTypeTarget) this.draftLessonTypeTarget.value = ""
    if (this.hasDraftPriceTarget) this.draftPriceTarget.value = ""
    if (this.hasAssignPermanentTarget) this.assignPermanentTarget.checked = false
    const teacher = this.teacherRecord(id)
    if (this.hasDraftStartTarget && this.hasDraftEndTarget) {
      this.draftEndTarget.value = minutesToTime(timeToMinutes(this.draftStartTarget.value) + this.teacherDuration(teacher))
    }
    if (teacher?.defaultMeetingLink && this.hasDraftMeetingTarget) {
      const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
      if (location === "online" && !this.draftMeetingTarget.value) this.draftMeetingTarget.value = teacher.defaultMeetingLink
    }
    this.syncTeacherUi()
    this.rebuildSubjects(teacher)
    this.rebuildLessonTypeSelect("")
    this.syncLessonTypeUi()
    this.syncDrawerFields()
  }

  setStudentIds(ids) {
    this.studentIds = uniqueIds(ids)
    if (this.lessonType !== "group") this.studentIds = this.studentIds.slice(-1)
    this.syncLessonTypeUi()
    this.syncDrawerFields()
  }

  currentTeacherIdOrDraft() {
    if (this.lockTeacherValue && this.currentTeacherIdValue) return this.currentTeacherIdValue
    return this.draftTeacherId()
  }

  draftTeacherId() {
    return this.hasDraftTeacherTarget ? this.draftTeacherTarget.value : ""
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
    this.pendingDraft = null
    const dateKey = event?.currentTarget?.dataset?.date || toDateKey(this.selectedDate)
    const start = event?.currentTarget?.dataset?.start || "10:00"
    this.selectedDate = parseDateKey(dateKey)
    if (this.view === "day") this.cursor = new Date(this.selectedDate)
    this.loadCreateFrame({
      date: dateKey,
      start,
      teacher_id: this.resolvedTeacherId(),
      student_id: this.studentIdValue || ""
    })
  }

  closeCreate() {
    this.closePickers()
    this.editingId = null
    this.pendingDraft = null
    if (!this.hasDrawerTarget) return
    this.loadCreateFrame({ dismiss: 1 })
  }

  createDialogUrl(params = {}) {
    const dismissing = params.dismiss
    const base = dismissing ? (this.dismissUrlValue || this.createUrlValue) : this.createUrlValue
    const url = new URL(base || "/calendar/new", window.location.origin)
    if (dismissing) return `${url.pathname}${url.search}`

    let teacherId = params.teacher_id
    if (teacherId == null || teacherId === "") teacherId = this.resolvedTeacherId()
    const studentId = params.student_id != null ? params.student_id : this.studentIdValue
    const payload = {
      date: params.date || toDateKey(this.selectedDate || this.today),
      start: params.start || "10:00"
    }
    if (params.end) payload.end = params.end
    if (teacherId) payload.teacher_id = teacherId
    if (studentId) payload.student_id = studentId
    Object.entries(payload).forEach(([key, value]) => {
      if (value == null || value === "") url.searchParams.delete(key)
      else url.searchParams.set(key, value)
    })
    return `${url.pathname}${url.search}`
  }

  loadCreateFrame(params = {}) {
    const url = this.createDialogUrl(params)
    const frame = document.getElementById("create_lesson")
    if (frame) {
      frame.src = url
      return
    }
    Turbo.visit(url, { frame: "create_lesson" })
  }

  openCreateFromQuery() {
    const params = new URLSearchParams(window.location.search)
    if (params.get("create") !== "1") return
    this.loadCreateFrame({
      date: params.get("date") || undefined,
      start: params.get("start") || undefined,
      teacher_id: params.get("teacherId") || params.get("teacher_id") || "",
      student_id: params.get("studentId") || params.get("student_id") || ""
    })
  }

  onEmbeddedLessonsChanged(event) {
    if (this.embeddedValue) return
    const lessons = event.detail?.lessons
    if (Array.isArray(lessons)) {
      this.lessons = lessons
      this.render()
    }
    if (event.detail?.message) this.showToast(event.detail.message)
  }

  drawerTargetConnected() {
    window.requestAnimationFrame(() => this.hydrateDrawer())
  }

  hydrateDrawer() {
    if (!this.hasDrawerTarget) return
    this.ingestDrawerCatalog()
    if (this.hasTimezoneLabelTarget) {
      const zone = this.timezoneValue || "Europe/Kyiv"
      this.timezoneLabelTarget.textContent = `${this.t("calendar", "workspace_timezone")}: ${zone.replaceAll("_", " ")}`
    }
    if (this.pendingDraft || pendingCreateDraft) {
      const pending = this.pendingDraft || pendingCreateDraft
      this.pendingDraft = null
      pendingCreateDraft = null
      this.editingId = pending.editingId || null
      this.fillDraft(pending.lesson)
      this.setDrawerMode(pending.mode)
      return
    }
    this.editingId = null
    const studentId = this.drawerTarget.dataset.studentId || this.studentIdValue || ""
    const teacherId = this.resolvedTeacherId()
    if (this.hasDraftTeacherTarget) this.draftTeacherTarget.value = teacherId
    this.studentIds = studentId ? [studentId] : []
    this.lessonType = "individual"
    this.customWeekdays = []
    this.priceTouched = false
    this.originalLesson = null
    this.teacherChoice = null
    if (studentId && teacherId && String(this.studentRecord(studentId)?.teacherId || "") === String(teacherId)) {
      this.teacherChoice = "auto"
    }
    this.rebuildSubjects(this.teacherRecord(teacherId))
    this.autoSelectSingleSubject()
    this.rebuildLessonTypeSelect()
    this.autoSelectSingleLessonType()
    this.autoSelectSingleStudent()
    this.setDrawerMode("create")
  }

  ingestDrawerCatalog() {
    const students = this.parseSeedJson(this.seedValue("studentsSeed"))
    const teachers = this.parseSeedJson(this.seedValue("teachersSeed"))
    if (Array.isArray(students)) this.studentsValue = students
    if (Array.isArray(teachers)) this.teachersValue = teachers
  }

  seedValue(name) {
    const has = this[`has${name.charAt(0).toUpperCase()}${name.slice(1)}Target`]
    if (!has) return ""
    const target = this[`${name}Target`]
    return target.value || target.textContent || ""
  }

  parseSeedJson(raw) {
    const text = String(raw || "").trim()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  resolvedTeacherId() {
    if (this.lockTeacherValue && this.currentTeacherIdValue) return String(this.currentTeacherIdValue)
    const draft = this.draftTeacherId()
    if (draft) return String(draft)
    if (this.teacherIdValue) return String(this.teacherIdValue)
    const studentId = this.studentIdValue || (this.hasDrawerTarget ? this.drawerTarget.dataset.studentId : "")
    const assigned = studentId ? this.studentRecord(studentId)?.teacherId : ""
    if (assigned) return String(assigned)
    const teachers = (this.teachersValue || []).filter((teacher) => teacher.status !== "archived")
    if (teachers.length === 1) return String(teachers[0].id)
    if (this.currentTeacherIdValue) return String(this.currentTeacherIdValue)
    return ""
  }

  autoSelectSingleSubject() {
    if (!this.hasDraftSubjectTarget || this.draftSubjectTarget.value) return
    const options = Array.from(this.draftSubjectTarget.options).map((option) => option.value).filter(Boolean)
    if (options.length !== 1) return
    this.draftSubjectTarget.value = options[0]
  }

  autoSelectSingleLessonType() {
    if (!this.hasDraftLessonTypeTarget || this.draftLessonTypeTarget.value) return
    const options = Array.from(this.draftLessonTypeTarget.options).map((option) => option.value).filter(Boolean)
    if (options.length !== 1) return
    this.draftLessonTypeTarget.value = options[0]
    this.onLessonTypeChange()
  }

  autoSelectSingleStudent() {
    if (this.studentIds.length) return
    const students = this.assignedStudents()
    if (students.length !== 1) return
    this.studentIds = [String(students[0].id)]
  }

  teacherRecord(id) {
    return (this.teachersValue || []).find((item) => String(item.id) === String(id))
  }

  studentRecord(id) {
    return (this.studentsValue || []).find((item) => String(item.id) === String(id))
  }

  studentLabel(id) {
    return studentName(this.studentRecord(id))
  }

  teacherDuration(teacher) {
    return Number(teacher?.defaultLessonDurationMinutes) || 60
  }

  onSubjectChange() {
    this.selectedLessonTypeId = ""
    this.priceTouched = false
    if (this.hasDraftPriceTarget) this.draftPriceTarget.value = ""
    const teacher = this.teacherRecord(this.draftTeacherId())
    if (this.hasDraftStartTarget && this.hasDraftEndTarget) {
      this.draftEndTarget.value = minutesToTime(timeToMinutes(this.draftStartTarget.value) + this.teacherDuration(teacher))
    }
    this.rebuildLessonTypeSelect("")
    this.syncDrawerFields()
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
    const teacher = this.teacherRecord(this.draftTeacherId())
    if (!teacher) return []
    const subject = this.hasDraftSubjectTarget ? this.draftSubjectTarget.value : ""
    return getBookableLessonTypesForTeacher(teacher.id, teacher.email).filter((item) => !subject || item.lessonType.subjectName === subject)
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
    const teacher = this.teacherRecord(this.draftTeacherId())
    const subject = this.hasDraftSubjectTarget ? this.draftSubjectTarget.value : ""
    const bookable = teacher && subject ? getBookableLessonTypesForTeacher(teacher.id, teacher.email).filter((item) => item.lessonType?.subjectName === subject) : []
    if (this.hasLessonTypeHintTarget) this.lessonTypeHintTarget.hidden = Boolean(teacher && subject)
    if (this.hasLessonTypeEmptyTarget) {
      this.lessonTypeEmptyTarget.hidden = !teacher || !subject || bookable.length > 0
      this.lessonTypeEmptyTarget.textContent = String(this.t("calendar", "lesson_type_empty_subject")).replace("%{subject}", subject)
    }
    this.draftLessonTypeTarget.hidden = bookable.length === 0
    if (this.hasLessonTypeHelpTarget) {
      this.lessonTypeHelpTarget.hidden = bookable.length === 0
      this.lessonTypeHelpTarget.textContent = this.t("calendar", this.showPriceValue ? "lesson_type_help" : "lesson_type_help_plain")
    }
    const free = this.t("calendar", "free")
    this.draftLessonTypeTarget.innerHTML = `<option value="">${escapeHtml(this.t("calendar", "select_lesson_type"))}</option>` +
      bookable.map((item) => {
        const base = `${item.lessonType.name} · ${item.lessonType.defaultDurationMinutes} ${this.t("calendar", "min")}`
        const price = item.lessonType.isFree || item.effectivePriceCents === 0
          ? free
          : `${formatMoney(item.effectivePriceCents, item.effectiveCurrency)}${priceSuffix(item.lessonType.priceType)}`
        const label = this.showPriceValue ? `${base} · ${price}` : base
        return `<option value="${escapeHtml(item.lessonType.id)}">${escapeHtml(label)}</option>`
      }).join("")
    const nextId = preferredId && bookable.some((item) => item.lessonType.id === preferredId) ? preferredId : ""
    this.draftLessonTypeTarget.value = nextId
    this.selectedLessonTypeId = nextId
    if (nextId) {
      const selected = bookable.find((item) => item.lessonType.id === nextId)
      if (selected) {
        this.applyLessonTypeMode(selected.lessonType.mode)
        this.applyLessonTypeDefaults(selected)
      }
    }
    return bookable.find((item) => item.lessonType.id === nextId)
  }

  syncTeacherUi() {
    const teacher = this.teacherRecord(this.draftTeacherId())
    const locked = this.lockTeacherValue
    if (this.hasTeacherLockedTarget) this.teacherLockedTarget.hidden = !locked
    if (this.hasTeacherFieldTarget) this.teacherFieldTarget.hidden = locked
    if (this.hasTeacherLockedNameTarget) this.teacherLockedNameTarget.textContent = teacherName(teacher) || this.t("calendar", "you")
    if (this.hasTeacherLabelTarget) {
      this.teacherLabelTarget.textContent = teacher ? teacherName(teacher) : this.t("calendar", "select_teacher")
      this.teacherLabelTarget.classList.toggle("is-placeholder", !teacher)
    }
    if (this.hasTeacherClearTarget) this.teacherClearTarget.hidden = !teacher
    if (this.hasManageLessonsLinkTarget) {
      this.manageLessonsLinkTarget.hidden = !this.canManageTeachersValue || !teacher
      if (teacher) this.manageLessonsLinkTarget.href = `/teachers/${teacher.id}/edit`
    }
  }

  syncLessonTypeUi() {
    const group = this.lessonType === "group"
    const hasTeacher = Boolean(this.draftTeacherId())
    if (this.hasStudentWrapTarget) this.studentWrapTarget.hidden = group
    if (this.hasGroupWrapTarget) this.groupWrapTarget.hidden = !group
    if (this.hasStudentNeedTeacherTarget) this.studentNeedTeacherTarget.hidden = hasTeacher
    if (this.hasStudentPickerTarget) this.studentPickerTarget.hidden = !hasTeacher || group
    if (this.hasGroupNeedTeacherTarget) this.groupNeedTeacherTarget.hidden = hasTeacher
    if (this.hasGroupPickerTarget) this.groupPickerTarget.hidden = !hasTeacher
    if (this.hasStudentLabelTarget) {
      const name = this.studentLabel(this.studentIds[0])
      this.studentLabelTarget.textContent = name || this.t("calendar", "select_student")
      this.studentLabelTarget.classList.toggle("is-placeholder", !name)
    }
    this.renderGroupChips()
    this.syncAssignPermanent()
    this.syncTeacherHints()
  }

  syncTeacherHints() {
    const student = this.studentIds.length === 1 ? this.studentRecord(this.studentIds[0]) : null
    const assignedId = student?.teacherId
    const draftId = this.draftTeacherId()
    if (this.hasTeacherAutoHintTarget) this.teacherAutoHintTarget.hidden = !(this.teacherChoice === "auto" && assignedId)
    if (this.hasTeacherUnassignedHintTarget) this.teacherUnassignedHintTarget.hidden = !(student && !assignedId && !draftId)
    const mismatch = Boolean(student && assignedId && draftId && String(assignedId) !== String(draftId))
    if (this.hasTeacherMismatchTarget) this.teacherMismatchTarget.hidden = !mismatch
    if (mismatch && this.hasTeacherMismatchTextTarget) {
      const assigned = this.teacherRecord(assignedId)
      this.teacherMismatchTextTarget.textContent = this.t("calendar", "teacher_mismatch").replace("%{name}", teacherName(assigned))
    }
  }

  syncAssignPermanent() {
    const student = this.studentIds.length === 1 ? this.studentRecord(this.studentIds[0]) : null
    const show = Boolean(student && !student.teacherId && this.draftTeacherId())
    if (this.hasAssignPermanentWrapTarget) this.assignPermanentWrapTarget.hidden = !show
  }

  keepSelectedTeacher() {
    this.teacherChoice = "selected"
    this.syncTeacherHints()
  }

  useAssignedTeacher() {
    const student = this.studentIds.length === 1 ? this.studentRecord(this.studentIds[0]) : null
    if (!student?.teacherId) return
    this.selectTeacher(student.teacherId, "auto")
    this.setStudentIds([student.id])
  }

  removeParticipant(event) {
    const button = event.target.closest("button[data-id]")
    if (!button || !this.hasGroupChipsTarget || !this.groupChipsTarget.contains(button)) return
    this.setStudentIds(this.studentIds.filter((item) => item !== button.dataset.id))
  }

  renderGroupChips() {
    if (!this.hasGroupChipsTarget) return
    this.groupChipsTarget.innerHTML = this.studentIds.map((id) => {
      const name = escapeHtml(this.studentLabel(id) || id)
      return `<span class="calendar-page__chip">${name}<button type="button" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(this.t("calendar", "remove_participant"))}">×</button></span>`
    }).join("")
    if (this.hasGroupCountTarget) this.groupCountTarget.textContent = this.studentIds.length ? ` · ${this.studentIds.length}` : ""
  }

  rebuildSubjects(teacher) {
    if (!this.hasDraftSubjectTarget) return
    const bookable = teacher ? getBookableLessonTypesForTeacher(teacher.id, teacher.email) : []
    const subjects = [...new Set(bookable.map((item) => item.lessonType?.subjectName).filter(Boolean))]
    const current = this.draftSubjectTarget.value
    this.draftSubjectTarget.innerHTML = `<option value="">${escapeHtml(this.t("calendar", "select_lesson"))}</option>` +
      subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("")
    this.draftSubjectTarget.value = subjects.includes(current) ? current : ""
    this.draftSubjectTarget.hidden = subjects.length === 0
    if (this.hasSubjectHintTarget) {
      this.subjectHintTarget.hidden = Boolean(teacher)
      this.subjectHintTarget.textContent = this.t("calendar", "select_teacher_first")
    }
    if (this.hasSubjectEmptyTarget) this.subjectEmptyTarget.hidden = !teacher || subjects.length > 0
  }

  onStartChange() {
    const teacher = this.teacherRecord(this.draftTeacherId())
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
    const teacher = this.teacherRecord(this.draftTeacherId())
    if (location === "online" && this.hasDraftMeetingTarget && !this.draftMeetingTarget.value && teacher?.defaultMeetingLink) {
      this.draftMeetingTarget.value = teacher.defaultMeetingLink
    }
    this.syncDrawerFields()
  }

  syncFormatUi() {
    const location = this.hasDraftLocationTarget ? this.draftLocationTarget.value : "online"
    if (this.hasFormatBtnTarget) {
      this.formatBtnTargets.forEach((button) => {
        button.setAttribute("aria-checked", button.dataset.location === location ? "true" : "false")
      })
    }
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
    if (!this.hasWeekdayBtnTarget) return
    this.weekdayBtnTargets.forEach((button) => {
      button.setAttribute("aria-pressed", this.customWeekdays.includes(button.dataset.day) ? "true" : "false")
    })
  }

  onSkipConflict() {
    if (this.hasSkipConflictTarget && this.skipConflictTarget.checked && this.hasOverrideConflictTarget) {
      this.overrideConflictTarget.checked = false
    }
    this.syncDrawerFields()
  }

  onOverrideConflict() {
    if (this.hasOverrideConflictTarget && this.overrideConflictTarget.checked && this.hasSkipConflictTarget) {
      this.skipConflictTarget.checked = false
    }
    this.syncDrawerFields()
  }

  syncDrawerFields() {
    this.syncFormatUi()
    this.syncTeacherUi()
    this.syncLessonTypeUi()
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    if (this.hasRepeatExtraTarget) this.repeatExtraTarget.hidden = repeat === "none"
    if (this.hasCustomDaysTarget) this.customDaysTarget.hidden = repeat !== "custom"
    if (this.hasRepeatSummaryTarget && repeat !== "none") {
      const dates = generateOccurrenceDates(this.draftDateTarget?.value, repeat, this.draftRepeatEndTarget?.value, this.customWeekdays)
      const key = repeat === "weekly" ? "repeat_weekly_summary" : repeat === "biweekly" ? "repeat_biweekly_summary" : "repeat_custom_summary"
      this.repeatSummaryTarget.textContent = this.t("calendar", key).replace("%{count}", String(dates.length)).replace("%{until}", this.draftRepeatEndTarget?.value || "")
    }
    this.syncAvailability()
    this.syncLessonTypeChangeNotice()
    this.updateSummary()
    this.syncSubmit()
  }

  syncAvailability() {
    const teacher = this.teacherRecord(this.draftTeacherId())
    const date = this.hasDraftDateTarget ? this.draftDateTarget.value : ""
    const start = this.hasDraftStartTarget ? this.draftStartTarget.value : ""
    const end = this.hasDraftEndTarget ? this.draftEndTarget.value : ""
    const availability = teacher && date && start && end
      ? checkTeacherAvailability(teacher, date, start, end, this.lessons, this.editingId)
      : null
    if (this.hasAvailabilityTarget) {
      this.availabilityTarget.hidden = !availability
      this.availabilityTarget.classList.toggle("is-ok", availability?.kind === "available")
      if (availability?.kind === "available") this.availabilityTarget.textContent = this.t("calendar", "teacher_available")
      else if (availability?.kind === "outside_hours" && availability.hours) {
        this.availabilityTarget.textContent = this.t("calendar", "outside_hours").replace("%{range}", `${availability.hours.startTime}–${availability.hours.endTime}`)
      } else if (availability?.kind === "outside_hours") this.availabilityTarget.textContent = this.t("calendar", "outside_day")
      else if (availability?.kind === "booked") {
        this.availabilityTarget.textContent = this.t("calendar", "already_booked").replace("%{when}", `${availability.conflict.startTime}–${availability.conflict.endTime} · ${availability.conflict.title}`)
      }
    }
    const conflicts = date && start && end ? findStudentConflicts(this.studentIds, date, start, end, this.lessons, this.editingId) : []
    if (this.hasStudentConflictsTarget) {
      this.studentConflictsTarget.hidden = conflicts.length === 0
      this.studentConflictsTarget.innerHTML = conflicts.length
        ? `<p class="calendar-page__notice-title">${escapeHtml(this.t("calendar", "student_conflicts"))}</p><ul>${conflicts.map((item) => `<li>${escapeHtml(this.studentLabel(item.studentId))}: ${escapeHtml(item.lesson.startTime)}–${escapeHtml(item.lesson.endTime)} · ${escapeHtml(item.lesson.title)}</li>`).join("")}</ul>`
        : ""
    }
    const hasConflict = availability?.kind === "booked" || conflicts.length > 0
    const repeat = this.hasDraftRepeatTarget ? this.draftRepeatTarget.value : "none"
    if (this.hasConflictOptionsTarget) this.conflictOptionsTarget.hidden = !hasConflict
    if (this.hasSkipConflictWrapTarget) this.skipConflictWrapTarget.hidden = !(hasConflict && repeat !== "none" && !this.editingId)
    if (this.hasOverrideWrapTarget) this.overrideWrapTarget.hidden = !(hasConflict && this.canOverrideValue)
    if (this.hasOverrideReasonWrapTarget) this.overrideReasonWrapTarget.hidden = !(hasConflict && this.canOverrideValue && this.hasOverrideConflictTarget && this.overrideConflictTarget.checked)
    if (this.hasRepeatConflictHintTarget && hasConflict && repeat !== "none") {
      const dates = generateOccurrenceDates(date, repeat, this.draftRepeatEndTarget?.value, this.customWeekdays)
      this.repeatConflictHintTarget.hidden = false
      this.repeatConflictHintTarget.textContent = this.t("calendar", "repeat_conflict_hint").replace("%{count}", String(dates.length))
    } else if (this.hasRepeatConflictHintTarget) {
      this.repeatConflictHintTarget.hidden = true
    }
    this._hasScheduleConflict = hasConflict
  }

  syncLessonTypeChangeNotice() {
    if (!this.hasLessonTypeChangedTarget) return
    const original = this.originalLesson
    const changed = Boolean(this.editingId && original && this.selectedLessonTypeId && this.selectedLessonTypeId !== original.lessonTypeId)
    this.lessonTypeChangedTarget.hidden = !changed
    if (!changed) return
    const bookable = this.bookableTypesForCurrentTeacher().find((item) => item.lessonType.id === this.selectedLessonTypeId)
    const min = this.t("calendar", "min")
    const previousDuration = Math.max(0, timeToMinutes(original.endTime) - timeToMinutes(original.startTime))
    const previousPrice = this.showPriceValue && original.priceCents != null
      ? ` · ${original.priceCents === 0 ? this.t("calendar", "free") : formatMoney(original.priceCents, original.currency || "UAH")}`
      : ""
    const nextDuration = Number(bookable?.lessonType.defaultDurationMinutes) || previousDuration
    const nextCents = parsePriceAmount(this.hasDraftPriceTarget ? this.draftPriceTarget.value : "")
    const nextCurrency = this.hasDraftCurrencyTarget ? this.draftCurrencyTarget.value : original.currency
    const nextPrice = this.showPriceValue && nextCents != null
      ? ` · ${nextCents === 0 ? this.t("calendar", "free") : formatMoney(nextCents, nextCurrency || "UAH")}`
      : ""
    const previousLabel = `${original.lessonTypeName || this.t("calendar", "custom")} · ${previousDuration} ${min}${previousPrice}`
    const nextLabel = `${bookable?.lessonType.name || this.t("calendar", "custom")} · ${nextDuration} ${min}${nextPrice}`
    this.lessonTypeChangedTarget.innerHTML = `<p class="calendar-page__notice-title">${escapeHtml(this.t("calendar", "lesson_type_change"))}</p>
      <p>${escapeHtml(this.t("calendar", "lesson_type_previous").replace("%{label}", previousLabel))}</p>
      <p>${escapeHtml(this.t("calendar", "lesson_type_new").replace("%{label}", nextLabel))}</p>
      <p class="calendar-page__notice-hint">${escapeHtml(this.t("calendar", "lesson_type_change_hint"))}</p>`
  }

  requiredFieldsOk() {
    const teacherId = this.draftTeacherId()
    const date = this.hasDraftDateTarget ? this.draftDateTarget.value : ""
    const start = this.hasDraftStartTarget ? this.draftStartTarget.value : ""
    const end = this.hasDraftEndTarget ? this.draftEndTarget.value : ""
    const subject = this.hasDraftSubjectTarget ? this.draftSubjectTarget.value : ""
    if (!teacherId || !date || !start || !end || !subject) return false
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
    if (this._hasScheduleConflict) {
      const skip = this.hasSkipConflictTarget && this.skipConflictTarget.checked
      const override = this.hasOverrideConflictTarget && this.overrideConflictTarget.checked
      if (override && this.hasOverrideReasonTarget && !this.overrideReasonTarget.value.trim()) return false
      if (!skip && !override) return false
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
    const selectedTeacher = teacherName(this.teacherRecord(this.draftTeacherId()))
    const subject = this.hasDraftSubjectTarget ? this.draftSubjectTarget.value : ""
    const when = `${formatLessonDayShort(this.draftDateTarget.value)} · ${formatTimeRange(this.draftStartTarget.value, this.draftEndTarget.value)}`
    const cents = parsePriceAmount(this.hasDraftPriceTarget ? this.draftPriceTarget.value : "")
    const currency = this.hasDraftCurrencyTarget ? this.draftCurrencyTarget.value : "EUR"
    const price = this.showPriceValue && cents != null ? formatMoneyLabel(cents, currency) : ""
    const bookable = this.bookableTypesForCurrentTeacher().find((item) => item.lessonType.id === this.selectedLessonTypeId)
    const group = this.lessonType === "group" || this.studentIds.length > 1
    const headline = group
      ? `${this.t("calendar", "group_lesson")} · ${this.studentIds.length}`
      : this.t("calendar", "individual_lesson")
    const typeLine = bookable ? `${bookable.lessonType.name} · ${bookable.lessonType.defaultDurationMinutes} ${this.t("calendar", "min")}` : ""
    const people = group ? selectedTeacher : `${this.studentLabel(this.studentIds[0])} · ${selectedTeacher}`
    this.summaryTarget.hidden = false
    this.summaryTarget.innerHTML = `<p>${escapeHtml(headline)}</p>${typeLine ? `<p>${escapeHtml(typeLine)}</p>` : ""}${subject ? `<p>${escapeHtml(subject)}</p>` : ""}<p>${escapeHtml(people)}</p><p>${escapeHtml(when)}</p>${price ? `<p class="calendar-page__summary-price">${escapeHtml(price)}</p>` : ""}`
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
      teacher: teacherName(this.teacherRecord(this.draftTeacherTarget.value)) || this.t("common", "teacher"),
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

    let toastMessage = ""
    if (this.editingId) {
      this.lessons = this.lessons.map((lesson) =>
        lesson.id === this.editingId ? { ...lesson, ...payload } : lesson
      )
      toastMessage = this.t("calendar", "updated")
    } else {
      let created = expandRepeat({ ...payload, id: `local-${Date.now()}` }, repeat, repeatEnd, this.customWeekdays)
      if (this.hasSkipConflictTarget && this.skipConflictTarget.checked) {
        created = created.filter((lesson) => {
          const teacher = this.teacherRecord(lesson.teacherId)
          const availability = checkTeacherAvailability(teacher, lesson.date, lesson.startTime, lesson.endTime, this.lessons, null)
          const conflicts = findStudentConflicts(lesson.studentIds, lesson.date, lesson.startTime, lesson.endTime, this.lessons, null)
          return availability.kind !== "booked" && conflicts.length === 0
        })
      }
      this.lessons.push(...created)
      if (this.hasAssignPermanentTarget && this.assignPermanentTarget.checked && payload.studentId && payload.teacherId) {
        const student = this.studentRecord(payload.studentId)
        if (student) student.teacherId = payload.teacherId
      }
      if (created.length > 1) {
        toastMessage = this.t("calendar", "created_many").replace("%{count}", created.length)
      } else if (created.length === 1) {
        toastMessage = this.t("calendar", "created")
      }
    }

    this.selectedDate = parseDateKey(date)
    this.cursor = this.view === "month" || this.view === "agenda" ? this.cursor : new Date(this.selectedDate)
    this.dispatch("lessons-changed", { detail: { lessons: this.lessons, message: toastMessage } })
    this.showToast(toastMessage)
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
    pendingCreateDraft = { lesson, mode: "edit", editingId: lesson.id }
    this.loadCreateFrame({
      date: lesson.date,
      start: lesson.startTime,
      end: lesson.endTime,
      teacher_id: lesson.teacherId,
      student_id: lesson.studentId
    })
  }

  duplicateLesson() {
    const lesson = this.lessons.find((item) => item.id === this.activeLessonId)
    if (!lesson) return
    this.closeLesson()
    pendingCreateDraft = {
      lesson: {
        ...lesson,
        title: `${lesson.title} (${this.t("calendar", "copy")})`,
        status: "confirmed",
        repeat: "none"
      },
      mode: "create",
      editingId: null
    }
    this.loadCreateFrame({
      date: lesson.date,
      start: lesson.startTime,
      end: lesson.endTime,
      teacher_id: lesson.teacherId,
      student_id: lesson.studentId
    })
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
    if (this.hasTitleTarget) this.titleTarget.textContent = periodTitle(this.cursor, this.view, this.months, this.weekdays)
    this.syncViewTabs()
    this.syncFilterCount()
    this.renderMonth(byDate)
    this.renderTimeGrid(this.hasWeekGridTarget ? this.weekGridTarget : null, getWeekDays(this.cursor), byDate)
    this.renderTimeGrid(this.hasDayGridTarget ? this.dayGridTarget : null, [this.cursor], byDate)
    this.renderAgenda(lessons)
    this.renderSelectedDay(byDate)
    this.syncViewVisibility()
    this.syncEmptyBanner(lessons)
    this.syncCreateLinks()
  }

  syncCreateLinks() {
    if (!this.hasCreateLinkTarget) return
    const href = this.createDialogUrl({ date: toDateKey(this.selectedDate) })
    this.createLinkTargets.forEach((link) => {
      link.href = href
    })
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
        return `<a class="calendar-page__time-slot" style="top: ${(hour - DAY_START_HOUR) * HOUR_HEIGHT}px" href="${escapeHtml(this.createDialogUrl({ date: key, start }))}" data-turbo="true" data-turbo-frame="create_lesson" aria-label="${this.t("calendar", "create_lesson")}"></a>`
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
      this.agendaListTarget.innerHTML = `<div class="calendar-page__agenda-empty"><p>${this.t("calendar", "no_lessons_scheduled")}</p><a class="calendar-page__primary-btn" href="${escapeHtml(this.createDialogUrl())}" data-turbo="true" data-turbo-frame="create_lesson">${this.t("calendar", "create_lesson")}</a></div>`
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
    this.originalLesson = this.editingId ? {
      lessonTypeId: lesson.lessonTypeId || "",
      lessonTypeName: lesson.lessonTypeName || "",
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      priceCents: lesson.priceCents,
      currency: lesson.currency
    } : null
    this.priceTouched = lesson.priceCents != null
    this.lessonType = lesson.type === "group" ? "group" : "individual"
    this.customWeekdays = Array.isArray(lesson.customWeekdays) ? [...lesson.customWeekdays] : []
    this.studentIds = uniqueIds(lesson.studentIds || [lesson.studentId].filter(Boolean))
    this.teacherChoice = null
    if (this.hasDraftDateTarget) this.draftDateTarget.value = lesson.date || toDateKey(this.selectedDate)
    if (this.hasDraftStartTarget) this.draftStartTarget.value = lesson.startTime || "10:00"
    if (this.hasDraftEndTarget) this.draftEndTarget.value = lesson.endTime || "11:00"
    if (this.hasDraftTypeTarget) this.draftTypeTarget.value = this.lessonType
    if (this.hasDraftLocationTarget) this.draftLocationTarget.value = lesson.location || "online"
    if (this.hasDraftMeetingTarget) this.draftMeetingTarget.value = lesson.meetingLink || ""
    if (this.hasDraftPlaceTarget) this.draftPlaceTarget.value = lesson.locationText || ""
    if (this.hasDraftRepeatTarget) this.draftRepeatTarget.value = "none"
    if (this.hasDraftNotesTarget) this.draftNotesTarget.value = lesson.notes || ""
    if (this.hasAssignPermanentTarget) this.assignPermanentTarget.checked = false
    if (this.hasOverrideConflictTarget) this.overrideConflictTarget.checked = false
    if (this.hasSkipConflictTarget) this.skipConflictTarget.checked = false
    let teacherId = lesson.teacherId || ""
    if (this.lockTeacherValue && this.currentTeacherIdValue) teacherId = this.currentTeacherIdValue
    if (this.hasDraftTeacherTarget) this.draftTeacherTarget.value = teacherId
    this.rebuildSubjects(this.teacherRecord(teacherId))
    if (this.hasDraftSubjectTarget) this.draftSubjectTarget.value = lesson.subject || this.draftSubjectTarget.value
    const selected = this.rebuildLessonTypeSelect(lesson.lessonTypeId)
    if (this.hasDraftPriceTarget && lesson.priceCents != null) {
      this.draftPriceTarget.value = formatPriceInput(lesson.priceCents)
    } else if (selected && !this.priceTouched) {
      this.applyLessonTypeDefaults(selected)
    }
    if (this.hasDraftCurrencyTarget && lesson.currency) this.draftCurrencyTarget.value = lesson.currency
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
    if (this.hasDraftLessonTypeTarget) this.draftLessonTypeTarget.disabled = mode === "edit" && !this.showPriceValue
    this.syncDrawerFields()
  }

  showDrawer() {
    this.loadCreateFrame()
  }

  hideDrawer() {
    this.closeCreate()
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
