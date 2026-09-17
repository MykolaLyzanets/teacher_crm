import { Controller } from "@hotwired/stimulus"
import { closeModal, openModal } from "../lib/modal"

const STATUS_TONE = {
  reviewed: "olive",
  submitted: "amber",
  needs_revision: "amber",
  overdue: "rose",
  assigned: "neutral"
}

const STATUS_TAB = {
  submitted: "to_review",
  assigned: "active",
  needs_revision: "active",
  overdue: "overdue",
  reviewed: "reviewed"
}

export default class extends Controller {
  static targets = [
    "toast",
    "tab",
    "search",
    "student",
    "subject",
    "status",
    "catalogEmpty",
    "filterEmpty",
    "table",
    "list",
    "row",
    "stat",
    "statValue",
    "rowTemplate",
    "selectModal",
    "lessonSearch",
    "lessonList",
    "lessonEmpty",
    "lessonNone",
    "lessonOption",
    "formModal",
    "formTitle",
    "formDesc",
    "formSummary",
    "formName",
    "formTitleHint",
    "formStudent",
    "formStudentLabel",
    "formStudentsWrap",
    "formStudents",
    "formStudentsCount",
    "formSubject",
    "formDueDate",
    "formDueTime",
    "formInstructions",
    "formSubmittedNote",
    "formNote",
    "formError",
    "formSubmit",
    "videoInput",
    "fileInput",
    "linkForm",
    "linkUrl",
    "linkTitle",
    "linkError",
    "dropzone",
    "materialsError",
    "attachmentList",
    "library",
    "libraryList",
    "detailsModal",
    "detailsTitle",
    "detailsDesc",
    "detailsInstructionsWrap",
    "detailsInstructions",
    "detailsMaterials",
    "detailsMaterialsEmpty",
    "detailsNoSubmission",
    "detailsWrittenWrap",
    "detailsSubmission",
    "detailsSubmissionList",
    "detailsSubmissionEmpty",
    "reviewModal",
    "reviewDesc",
    "reviewTitle",
    "reviewMeta",
    "reviewInstructions",
    "reviewOriginalWrap",
    "reviewOriginalList",
    "reviewSubmittedAt",
    "reviewLate",
    "reviewWrittenWrap",
    "reviewResponse",
    "reviewSubmissionList",
    "reviewSubmissionEmpty",
    "reviewFeedback",
    "reviewError",
    "reviewVideoInput",
    "reviewFileInput",
    "reviewLinkForm",
    "reviewLinkUrl",
    "reviewLinkTitle",
    "reviewLinkError",
    "reviewDropzone",
    "reviewMaterialsError",
    "reviewAttachmentList",
    "reviewLibrary",
    "reviewLibraryList"
  ]

  static values = {
    i18n: Object,
    tab: { type: String, default: "all" },
    locale: { type: String, default: "en" },
    library: { type: Object, default: {} }
  }

  connect() {
    this.activeRow = null
    this.editing = false
    this.pickedLesson = null
    this.titleTouched = false
    this.materialsKind = "form"
    this.formAttachments = []
    this.reviewAttachments = []
    if (this.hasTabTarget) this.filter()
  }

  disconnect() {
    this.closeAllModals()
    window.clearTimeout(this.toastTimer)
  }

  get strings() {
    return this.i18nValue?.homework || {}
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
    const student = this.hasStudentTarget ? this.studentTarget.value : "all"
    const subject = this.hasSubjectTarget ? this.subjectTarget.value : "all"
    const status = this.hasStatusTarget ? this.statusTarget.value : "all"
    const rows = this.rowTargets.filter((row) => !row.closest("template"))
    const hasRows = rows.length > 0
    let visible = 0

    rows.forEach((row) => {
      const ids = (row.dataset.studentIds || "").split(",").filter(Boolean)
      const matchTab = this.tabValue === "all" || row.dataset.tab === this.tabValue
      const matchStatus = status === "all" || row.dataset.status === status
      const matchStudent = student === "all" || ids.includes(student)
      const matchSubject = subject === "all" || row.dataset.subject === subject
      const matchQuery = !query || (row.dataset.search || "").includes(query)
      const show = matchTab && matchStatus && matchStudent && matchSubject && matchQuery
      row.hidden = !show
      if (show) visible += 1
    })

    if (this.hasCatalogEmptyTarget) this.catalogEmptyTarget.hidden = hasRows
    if (this.hasTableTarget) this.tableTarget.hidden = !hasRows || visible === 0
    if (this.hasFilterEmptyTarget) this.filterEmptyTarget.hidden = !hasRows || visible > 0
  }

  clearFilters() {
    if (this.hasSearchTarget) this.searchTarget.value = ""
    if (this.hasStudentTarget) this.studentTarget.value = "all"
    if (this.hasSubjectTarget) this.subjectTarget.value = "all"
    if (this.hasStatusTarget) this.statusTarget.value = "all"
    this.filter()
  }

  openAdd() {
    this.editing = false
    this.activeRow = null
    this.pickedLesson = null
    if (this.hasLessonSearchTarget) this.lessonSearchTarget.value = ""
    this.filterLessons()
    this.openTarget("selectModal")
  }

  closeSelect() {
    this.closeTarget("selectModal")
  }

  filterLessons() {
    const options = this.hasLessonOptionTarget ? this.lessonOptionTargets : []
    if (!options.length) {
      if (this.hasLessonEmptyTarget) this.lessonEmptyTarget.hidden = false
      if (this.hasLessonListTarget) this.lessonListTarget.hidden = true
      if (this.hasLessonNoneTarget) this.lessonNoneTarget.hidden = true
      return
    }

    const query = (this.hasLessonSearchTarget ? this.lessonSearchTarget.value : "").trim().toLowerCase()
    let visible = 0
    options.forEach((option) => {
      const show = !query || (option.dataset.search || "").includes(query)
      option.hidden = !show
      if (show) visible += 1
    })
    if (this.hasLessonEmptyTarget) this.lessonEmptyTarget.hidden = true
    if (this.hasLessonListTarget) this.lessonListTarget.hidden = visible === 0
    if (this.hasLessonNoneTarget) this.lessonNoneTarget.hidden = visible !== 0
  }

  pickLesson(event) {
    const lesson = this.parseJson(event.currentTarget.dataset.lesson)
    if (!lesson) return
    this.closeSelect()
    this.editing = false
    this.activeRow = null
    this.pickedLesson = lesson
    this.useFormMaterials()
    this.fillFormFromLesson(lesson)
    this.openTarget("formModal")
  }

  openEdit(event) {
    const row = event.currentTarget.closest("[data-homework-target='row']")
    if (!row) return
    this.editing = true
    this.activeRow = row
    this.pickedLesson = null
    this.useFormMaterials()
    this.fillFormFromRow(row)
    this.openTarget("formModal")
  }

  closeForm() {
    this.closeTarget("formModal")
    this.editing = false
    this.activeRow = null
    this.pickedLesson = null
  }

  saveForm() {
    const title = this.hasFormNameTarget ? this.formNameTarget.value.trim() : ""
    const instructions = this.hasFormInstructionsTarget ? this.formInstructionsTarget.value.trim() : ""
    const dueDate = this.hasFormDueDateTarget ? this.formDueDateTarget.value : ""
    if (!instructions) {
      this.setFormError(this.strings.instructions_required)
      return
    }
    if (!dueDate) {
      this.setFormError(this.strings.due_required)
      return
    }

    if (this.editing && this.activeRow) {
      this.applyFormToRow(this.activeRow, { title, instructions, dueDate })
      this.showToast(this.strings.updated_toast)
      this.closeForm()
      this.filter()
      return
    }

    const row = this.buildRowFromForm({ title, instructions, dueDate })
    if (row && this.hasListTarget) this.listTarget.prepend(row)
    this.adjustStat("active", 1)
    this.maybeAddStudentOption()
    this.maybeAddSubjectOption()
    this.showToast(this.strings.assigned_toast)
    this.closeForm()
    this.filter()
  }

  openView(event) {
    const row = event.currentTarget.closest("[data-homework-target='row']")
    if (!row) return
    this.fillDetails(row)
    this.openTarget("detailsModal")
  }

  closeDetails() {
    this.closeTarget("detailsModal")
  }

  openReview(event) {
    const row = event.currentTarget.closest("[data-homework-target='row']")
    if (!row) return
    this.activeRow = row
    this.useReviewMaterials()
    this.fillReview(row)
    this.openTarget("reviewModal")
  }

  closeReview() {
    this.closeTarget("reviewModal")
    this.activeRow = null
  }

  clearReviewError() {
    if (this.hasReviewErrorTarget) this.reviewErrorTarget.hidden = true
  }

  requestRevision() {
    const feedback = this.hasReviewFeedbackTarget ? this.reviewFeedbackTarget.value.trim() : ""
    if (!feedback) {
      this.setReviewError(this.strings.feedback_required_error)
      return
    }
    this.persistReview(this.activeRow)
    this.updateRowStatus(this.activeRow, "needs_revision")
    this.adjustStat("toReview", -1)
    this.adjustStat("active", 1)
    this.showToast(this.strings.revision_toast)
    this.closeReview()
    this.filter()
  }

  markReviewed() {
    this.persistReview(this.activeRow)
    this.updateRowStatus(this.activeRow, "reviewed")
    this.adjustStat("toReview", -1)
    this.adjustStat("reviewedThisMonth", 1)
    this.showToast(this.strings.reviewed_toast)
    this.closeReview()
    this.filter()
  }

  fillFormFromLesson(lesson) {
    const students = Array.isArray(lesson.students) ? lesson.students : []
    const names = students.map((item) => item.name).filter(Boolean)
    const primary = names[0] || lesson.student || this.strings.student_fallback
    const subject = lesson.subject || lesson.title || ""
    const suggested = this.suggestTitle(subject)
    const dateLabel = this.formatDate(lesson.date)
    const typeLabel = lesson.lessonTypeName || lesson.typeLabel || lesson.type || ""

    this.titleTouched = false
    if (this.hasFormTitleTarget) this.formTitleTarget.textContent = this.strings.add
    if (this.hasFormDescTarget) {
      this.formDescTarget.textContent = this.interpolate(this.strings.add_desc, { name: primary })
    }
    if (this.hasFormSummaryTarget) {
      this.formSummaryTarget.innerHTML = `<p class="homework-page__summary-title">${this.escape(primary)}${names.length > 1 ? ` +${names.length - 1}` : ""}</p><p class="homework-page__muted">${this.escape([subject, dateLabel, typeLabel, lesson.teacher].filter(Boolean).join(" · "))}</p>`
    }
    if (this.hasFormNameTarget) this.formNameTarget.value = suggested
    if (this.hasFormTitleHintTarget) this.formTitleHintTarget.hidden = false
    if (this.hasFormStudentTarget) {
      this.formStudentTarget.value = names.join(", ") || primary
      this.formStudentTarget.closest("label").hidden = names.length > 1
    }
    if (this.hasFormStudentsWrapTarget) this.formStudentsWrapTarget.hidden = names.length <= 1
    if (this.hasFormStudentsTarget && names.length > 1) {
      this.formStudentsTarget.innerHTML = students.map((item) => (
        `<li><label class="homework-page__check"><input type="checkbox" checked value="${this.escape(String(item.id || ""))}">${this.escape(item.name)}</label></li>`
      )).join("")
      this.updateSelectedCount()
    }
    if (this.hasFormSubjectTarget) this.formSubjectTarget.value = subject || "—"
    if (this.hasFormDueDateTarget) {
      const due = this.plusDays(7)
      this.formDueDateTarget.value = due
      this.formDueDateTarget.min = this.todayKey()
    }
    if (this.hasFormDueTimeTarget) this.formDueTimeTarget.value = ""
    if (this.hasFormInstructionsTarget) this.formInstructionsTarget.value = ""
    if (this.hasFormNoteTarget) this.formNoteTarget.value = ""
    if (this.hasFormSubmittedNoteTarget) this.formSubmittedNoteTarget.hidden = true
    if (this.hasFormSubmitTarget) this.formSubmitTarget.textContent = this.strings.assign
    this.setFormError("")
    this.resetAttachments([])
    this.pickedLesson = { ...lesson, studentName: primary, studentIds: students.map((item) => String(item.id || "")), subject }
  }

  fillFormFromRow(row) {
    const name = row.dataset.studentName || this.strings.student_fallback
    this.titleTouched = true
    if (this.hasFormTitleTarget) this.formTitleTarget.textContent = this.strings.edit_title
    if (this.hasFormDescTarget) {
      this.formDescTarget.textContent = this.interpolate(this.strings.edit_desc, { name })
    }
    if (this.hasFormSummaryTarget) {
      this.formSummaryTarget.innerHTML = `<p class="homework-page__summary-title">${this.escape(row.dataset.studentLabel || name)}</p><p class="homework-page__muted">${this.escape([row.dataset.subject, row.dataset.lessonTitle, row.dataset.teacher].filter(Boolean).join(" · "))}</p>`
    }
    if (this.hasFormNameTarget) this.formNameTarget.value = row.dataset.title || ""
    if (this.hasFormTitleHintTarget) this.formTitleHintTarget.hidden = true
    if (this.hasFormStudentTarget) {
      this.formStudentTarget.value = row.dataset.studentLabel || name
      this.formStudentTarget.closest("label").hidden = false
    }
    if (this.hasFormStudentsWrapTarget) this.formStudentsWrapTarget.hidden = true
    if (this.hasFormSubjectTarget) this.formSubjectTarget.value = row.dataset.subject || "—"
    if (this.hasFormDueDateTarget) this.formDueDateTarget.value = row.dataset.dueDate || ""
    if (this.hasFormDueTimeTarget) this.formDueTimeTarget.value = row.dataset.dueTime || ""
    if (this.hasFormInstructionsTarget) this.formInstructionsTarget.value = row.dataset.instructions || ""
    if (this.hasFormNoteTarget) this.formNoteTarget.value = row.dataset.privateNote || ""
    if (this.hasFormSubmittedNoteTarget) this.formSubmittedNoteTarget.hidden = !row.dataset.submittedAt
    if (this.hasFormSubmitTarget) this.formSubmitTarget.textContent = this.strings.save
    this.setFormError("")
    this.resetAttachments(this.attachmentsFromRow(row))
  }

  applyFormToRow(row, { title, instructions, dueDate }) {
    const nextTitle = title || row.dataset.title
    row.dataset.title = nextTitle
    row.dataset.instructions = instructions
    row.dataset.dueDate = dueDate
    if (this.hasFormDueTimeTarget) row.dataset.dueTime = this.formDueTimeTarget.value
    if (this.hasFormNoteTarget) row.dataset.privateNote = this.formNoteTarget.value
    row.dataset.search = `${nextTitle} ${row.dataset.studentLabel || ""}`.toLowerCase()
    row.querySelectorAll(".homework-page__card-title").forEach((node) => {
      node.textContent = nextTitle
    })
    this.refreshDueLabels(row, dueDate)
    this.persistAttachments(row)
  }

  buildRowFromForm({ title, instructions, dueDate }) {
    if (!this.hasRowTemplateTarget) return null
    const row = this.rowTemplateTarget.cloneNode(true)
    row.hidden = false
    row.setAttribute("data-homework-target", "row")
    const lesson = this.pickedLesson || {}
    const studentIds = this.selectedStudentIds(lesson)
    const studentName = lesson.studentName || lesson.student || this.strings.student_fallback
    const extra = Math.max(studentIds.length - 1, 0)
    const studentLabel = extra > 0 ? `${studentName} +${extra}` : studentName
    const subject = lesson.subject || ""
    const assigned = this.todayKey()
    const nextTitle = title || this.suggestTitle(subject)
    const id = `hw-demo-${Date.now()}`

    row.hidden = false
    row.dataset.id = id
    row.dataset.tab = "active"
    row.dataset.status = "assigned"
    row.dataset.subject = subject
    row.dataset.studentIds = studentIds.join(",")
    row.dataset.title = nextTitle
    row.dataset.studentName = studentName
    row.dataset.studentLabel = studentLabel
    row.dataset.studentInitials = this.initials(studentName)
    row.dataset.assignedDate = assigned
    row.dataset.dueDate = dueDate
    row.dataset.dueTime = this.hasFormDueTimeTarget ? this.formDueTimeTarget.value : ""
    row.dataset.submittedAt = ""
    row.dataset.instructions = instructions
    row.dataset.feedback = ""
    row.dataset.response = ""
    row.dataset.privateNote = this.hasFormNoteTarget ? this.formNoteTarget.value : ""
    row.dataset.lessonTitle = lesson.title || subject || ""
    row.dataset.teacher = lesson.teacher || ""
    row.dataset.submissionIds = ""
    row.dataset.reviewIds = ""
    row.dataset.hasSubmission = "false"
    this.persistAttachments(row)
    row.dataset.late = "false"
    row.dataset.canReview = "false"
    row.dataset.search = `${nextTitle} ${studentLabel}`.toLowerCase()

    row.querySelectorAll(".homework-page__card-title").forEach((node) => { node.textContent = nextTitle })
    row.querySelectorAll(".homework-page__person .homework-page__muted, .homework-page__person p.homework-page__muted").forEach((node) => {
      node.textContent = studentLabel
    })
    row.querySelectorAll(".homework-page__avatar").forEach((node) => { node.textContent = this.initials(studentName) })
    this.updateStatusBadge(row, "assigned")
    this.setReviewAction(row, false)
    this.refreshDueLabels(row, dueDate)
    const lessonCell = row.querySelector(".homework-page__desktop p.homework-page__cell")
    if (lessonCell) lessonCell.textContent = row.dataset.lessonTitle || "—"
    const subjectCells = row.querySelectorAll(".homework-page__desktop p.homework-page__cell")
    if (subjectCells[1]) subjectCells[1].textContent = subject || "—"

    return row
  }

  fillDetails(row) {
    const due = this.formatDate(row.dataset.dueDate)
    const teacher = row.dataset.teacher || ""
    if (this.hasDetailsTitleTarget) this.detailsTitleTarget.textContent = row.dataset.title || ""
    if (this.hasDetailsDescTarget) {
      this.detailsDescTarget.textContent = [this.interpolate(this.strings.due_on, { date: due }), teacher].filter(Boolean).join(" · ")
    }
    const instructions = row.dataset.instructions || ""
    if (this.hasDetailsInstructionsWrapTarget) this.detailsInstructionsWrapTarget.hidden = !instructions
    if (this.hasDetailsInstructionsTarget) this.detailsInstructionsTarget.textContent = instructions
    this.renderReadOnlyList(
      this.hasDetailsMaterialsTarget ? this.detailsMaterialsTarget : null,
      this.attachmentsFromRow(row),
      this.hasDetailsMaterialsEmptyTarget ? this.detailsMaterialsEmptyTarget : null
    )
    this.fillSubmissionPanel(row, {
      empty: this.hasDetailsNoSubmissionTarget ? this.detailsNoSubmissionTarget : null,
      wrap: this.hasDetailsWrittenWrapTarget ? this.detailsWrittenWrapTarget : null,
      response: this.hasDetailsSubmissionTarget ? this.detailsSubmissionTarget : null,
      list: this.hasDetailsSubmissionListTarget ? this.detailsSubmissionListTarget : null,
      listEmpty: this.hasDetailsSubmissionEmptyTarget ? this.detailsSubmissionEmptyTarget : null
    })
  }

  fillReview(row) {
    const due = this.formatDate(row.dataset.dueDate)
    if (this.hasReviewDescTarget) {
      this.reviewDescTarget.textContent = [row.dataset.title, row.dataset.teacher].filter(Boolean).join(" · ")
    }
    if (this.hasReviewTitleTarget) this.reviewTitleTarget.textContent = row.dataset.title || ""
    if (this.hasReviewMetaTarget) {
      this.reviewMetaTarget.textContent = [this.interpolate(this.strings.due_on, { date: due }), row.dataset.subject].filter(Boolean).join(" · ")
    }
    if (this.hasReviewInstructionsTarget) this.reviewInstructionsTarget.textContent = row.dataset.instructions || ""
    const original = this.attachmentsFromRow(row)
    if (this.hasReviewOriginalWrapTarget) this.reviewOriginalWrapTarget.hidden = original.length === 0
    this.renderReadOnlyList(this.hasReviewOriginalListTarget ? this.reviewOriginalListTarget : null, original)
    if (this.hasReviewSubmittedAtTarget) {
      this.reviewSubmittedAtTarget.textContent = row.dataset.submittedAt
        ? this.formatDate(row.dataset.submittedAt.slice(0, 10))
        : ""
    }
    if (this.hasReviewLateTarget) this.reviewLateTarget.hidden = row.dataset.late !== "true"
    this.fillSubmissionPanel(row, {
      wrap: this.hasReviewWrittenWrapTarget ? this.reviewWrittenWrapTarget : null,
      response: this.hasReviewResponseTarget ? this.reviewResponseTarget : null,
      list: this.hasReviewSubmissionListTarget ? this.reviewSubmissionListTarget : null,
      listEmpty: this.hasReviewSubmissionEmptyTarget ? this.reviewSubmissionEmptyTarget : null
    })
    if (this.hasReviewFeedbackTarget) this.reviewFeedbackTarget.value = row.dataset.feedback || ""
    this.resetAttachments(this.reviewAttachmentsFromRow(row))
    this.setReviewError("")
  }

  fillSubmissionPanel(row, targets = {}) {
    const response = row.dataset.response || ""
    const submitted = row.dataset.hasSubmission === "true" || Boolean(response) || Boolean(row.dataset.submittedAt)
    if (targets.empty) targets.empty.hidden = submitted
    if (targets.wrap) targets.wrap.hidden = !response
    if (targets.response) targets.response.textContent = response
    this.renderReadOnlyList(targets.list, this.submissionAttachmentsFromRow(row), targets.listEmpty)
  }

  updateRowStatus(row, status) {
    if (!row) return
    row.dataset.status = status
    row.dataset.tab = STATUS_TAB[status] || "all"
    row.dataset.canReview = status === "submitted" ? "true" : "false"
    this.updateStatusBadge(row, status)
    this.setReviewAction(row, status === "submitted")
  }

  updateStatusBadge(row, status) {
    const label = this.strings.statuses?.[status] || status
    const tone = STATUS_TONE[status] || "neutral"
    row.querySelectorAll("[data-homework-badge]").forEach((badge) => {
      badge.className = `status-badge status-badge--${tone}`
      badge.textContent = label
    })
  }

  setReviewAction(row, canReview) {
    row.querySelectorAll("[data-review-action]").forEach((button) => {
      button.hidden = !canReview
    })
    row.querySelectorAll("[data-action='homework#openView']").forEach((button) => {
      button.classList.toggle("homework-page__action--muted", canReview)
    })
  }

  refreshDueLabels(row, dueDate) {
    const assigned = this.formatDate(row.dataset.assignedDate)
    const due = this.formatDate(dueDate)
    const meta = row.querySelector(".homework-page__card-meta")
    if (meta) {
      const spans = meta.querySelectorAll("span")
      if (spans[0]) spans[0].textContent = this.interpolate(this.strings.assigned_on, { date: assigned })
      if (spans[1]) spans[1].textContent = this.interpolate(this.strings.due_on, { date: due })
    }
    const desktopDates = row.querySelectorAll(".homework-page__desktop > p.homework-page__muted")
    if (desktopDates[0]) desktopDates[0].textContent = assigned
    if (desktopDates[1]) desktopDates[1].textContent = due
  }

  adjustStat(key, delta) {
    this.statValueTargets.forEach((node) => {
      if (node.dataset.stat !== key) return
      const next = Math.max(0, Number(node.textContent || "0") + delta)
      node.textContent = String(next)
    })
    this.statTargets.forEach((node) => {
      if (node.dataset.stat !== key) return
      if (key === "toReview" || key === "overdue") {
        node.classList.toggle("is-warn", Number(node.querySelector("[data-homework-target='statValue']")?.textContent || "0") > 0)
      }
    })
  }

  maybeAddStudentOption() {
    if (!this.hasStudentTarget || !this.pickedLesson) return
    const students = Array.isArray(this.pickedLesson.students) ? this.pickedLesson.students : []
    students.forEach((student) => {
      if (!student?.id) return
      const exists = Array.from(this.studentTarget.options).some((option) => option.value === String(student.id))
      if (exists) return
      const option = document.createElement("option")
      option.value = String(student.id)
      option.textContent = student.name
      this.studentTarget.append(option)
    })
  }

  maybeAddSubjectOption() {
    if (!this.hasSubjectTarget || !this.pickedLesson?.subject) return
    const exists = Array.from(this.subjectTarget.options).some((option) => option.value === this.pickedLesson.subject)
    if (exists) return
    const option = document.createElement("option")
    option.value = this.pickedLesson.subject
    option.textContent = this.pickedLesson.subject
    this.subjectTarget.append(option)
  }

  selectedStudentIds(lesson) {
    if (this.hasFormStudentsTarget && !this.formStudentsWrapTarget.hidden) {
      return Array.from(this.formStudentsTarget.querySelectorAll("input:checked")).map((input) => input.value).filter(Boolean)
    }
    return Array.isArray(lesson.studentIds) ? lesson.studentIds : []
  }

  updateSelectedCount() {
    if (!this.hasFormStudentsCountTarget) return
    const count = this.formStudentsTarget.querySelectorAll("input:checked").length
    this.formStudentsCountTarget.textContent = this.interpolate(this.strings.students_selected_label, { count })
  }

  suggestTitle(subject) {
    const topic = (subject || "").trim()
    if (!topic) return this.strings.practice_fallback
    const lower = topic.toLowerCase()
    if (lower.endsWith("practice") || lower.endsWith("практика")) return topic
    return this.interpolate(this.strings.title_from_topic, { topic })
  }

  showToast(message) {
    if (!this.hasToastTarget || !message) return
    this.toastTarget.textContent = message
    this.toastTarget.hidden = false
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toastTarget.hidden = true
    }, 3200)
  }

  setFormError(message) {
    if (!this.hasFormErrorTarget) return
    this.formErrorTarget.textContent = message || ""
    this.formErrorTarget.hidden = !message
  }

  setReviewError(message) {
    if (!this.hasReviewErrorTarget) return
    this.reviewErrorTarget.textContent = message || ""
    this.reviewErrorTarget.hidden = !message
  }

  openTarget(name) {
    const el = this[`has${this.capitalize(name)}Target`] ? this[`${name}Target`] : null
    if (!el) return
    openModal(el, { onClose: () => closeModal(el), focus: el.querySelector("[data-modal-focus]") })
  }

  closeTarget(name) {
    const el = this[`has${this.capitalize(name)}Target`] ? this[`${name}Target`] : null
    if (el) closeModal(el)
  }

  closeAllModals() {
    ;["selectModal", "formModal", "detailsModal", "reviewModal"].forEach((name) => this.closeTarget(name))
  }

  pickVideo() {
    this.materialsBag().video?.click()
  }

  pickFiles() {
    this.materialsBag().file?.click()
  }

  addVideoFiles(event) {
    this.queueFiles(Array.from(event.target.files || []), "video")
    event.target.value = ""
  }

  addFiles(event) {
    this.queueFiles(Array.from(event.target.files || []), "file")
    event.target.value = ""
  }

  dragOver(event) {
    event.preventDefault()
  }

  dragEnter(event) {
    event.preventDefault()
    event.currentTarget.classList.add("is-dragging")
  }

  dragLeave(event) {
    event.preventDefault()
    event.currentTarget.classList.remove("is-dragging")
  }

  dropFiles(event) {
    event.preventDefault()
    event.currentTarget.classList.remove("is-dragging")
    this.queueFiles(Array.from(event.dataTransfer?.files || []))
  }

  toggleLink() {
    const form = this.materialsBag().linkForm
    if (!form) return
    const open = form.hidden
    form.hidden = !open
    if (open) this.materialsBag().linkUrl?.focus()
    if (!open) this.setLinkError("")
  }

  saveLink() {
    const bag = this.materialsBag()
    const url = bag.linkUrl ? bag.linkUrl.value.trim() : ""
    const title = bag.linkTitle ? bag.linkTitle.value.trim() : ""
    if (!this.validUrl(url)) {
      this.setLinkError(this.strings.link_required)
      return
    }
    if (!this.canAdd(1)) return
    bag.setItems([...bag.items, {
      id: `link-${Date.now()}`,
      kind: "link",
      name: title || url,
      meta: this.linkHost(url),
      url
    }])
    if (bag.linkUrl) bag.linkUrl.value = ""
    if (bag.linkTitle) bag.linkTitle.value = ""
    if (bag.linkForm) bag.linkForm.hidden = true
    this.setLinkError("")
    this.renderAttachments()
  }

  toggleLibrary() {
    const library = this.materialsBag().library
    if (!library) return
    const open = library.hidden
    library.hidden = !open
    if (open) this.renderLibrary()
  }

  queueFiles(files, kind) {
    if (!files.length) return
    const bag = this.materialsBag()
    const errors = []
    const next = [...bag.items]
    files.forEach((file) => {
      const isVideo = kind === "video" || /^video\//.test(file.type)
      const limit = isVideo ? 500 * 1024 * 1024 : 25 * 1024 * 1024
      if (next.length + 1 > 10) {
        errors.push(this.strings.too_many_files)
        return
      }
      if (file.size > limit) {
        errors.push(this.strings.file_too_large)
        return
      }
      next.push({
        id: `file-${Date.now()}-${next.length}`,
        kind: isVideo ? "video" : "file",
        name: file.name,
        meta: `${isVideo ? "Video" : this.fileLabel(file)} · ${this.fileSize(file.size)}`,
        size: file.size
      })
    })
    bag.setItems(next)
    this.setMaterialsError(errors[0] || "")
    this.renderAttachments()
  }

  removeAttachment(event) {
    const id = event.currentTarget.dataset.id
    const bag = this.materialsBag()
    bag.setItems(bag.items.filter((item) => item.id !== id))
    this.renderAttachments()
  }

  attachLibraryItem(event) {
    const id = event.currentTarget.dataset.id
    const item = (this.libraryValue || {})[id]
    const bag = this.materialsBag()
    if (!item || bag.items.some((entry) => entry.id === id)) return
    if (!this.canAdd(1)) return
    bag.setItems([...bag.items, {
      id,
      kind: item.type === "video" ? "video" : item.type === "link" ? "link" : "file",
      name: item.title || id,
      meta: item.type || "file"
    }])
    this.renderAttachments()
  }

  resetAttachments(items) {
    const bag = this.materialsBag()
    bag.setItems(Array.isArray(items) ? items : [])
    if (bag.linkForm) bag.linkForm.hidden = true
    if (bag.library) bag.library.hidden = true
    this.setLinkError("")
    this.setMaterialsError("")
    this.renderAttachments()
  }

  renderAttachments() {
    const bag = this.materialsBag()
    if (!bag.list) return
    bag.list.innerHTML = bag.items.map((item) => this.attachmentItemHtml(item, false)).join("")
  }

  renderReadOnlyList(list, items, empty) {
    if (!list) return
    const records = Array.isArray(items) ? items : []
    list.innerHTML = records.map((item) => this.attachmentItemHtml(item, true)).join("")
    list.hidden = records.length === 0
    if (empty) empty.hidden = records.length > 0
  }

  attachmentItemHtml(item, readOnly) {
    const icon = item.kind === "video" ? "▶" : item.kind === "link" ? "↗" : "📎"
    const remove = readOnly
      ? ""
      : `<button class="homework-page__attachment-remove" type="button" data-id="${this.escape(item.id)}" data-action="homework#removeAttachment">${this.escape(this.strings.remove_attachment || "Remove")}</button>`
    return `<li class="homework-page__attachment">
      <span class="homework-page__attachment-icon">${icon}</span>
      <div class="homework-page__attachment-copy">
        <p class="homework-page__attachment-name">${this.escape(item.name)}</p>
        <p class="homework-page__attachment-meta">${this.escape(item.meta || "")}</p>
      </div>
      ${remove}
    </li>`
  }

  renderLibrary() {
    const list = this.materialsBag().libraryList
    if (!list) return
    const items = Object.values(this.libraryValue || {})
    list.innerHTML = items.map((item) => (
      `<li class="homework-page__library-item">
        <div class="homework-page__attachment-copy">
          <p class="homework-page__attachment-name">${this.escape(item.title || item.id)}</p>
          <p class="homework-page__attachment-meta">${this.escape(item.type || "")}</p>
        </div>
        <button class="homework-page__library-pick" type="button" data-id="${this.escape(item.id)}" data-action="homework#attachLibraryItem">${this.escape(this.strings.attach_item || "Add")}</button>
      </li>`
    )).join("")
  }

  persistAttachments(row) {
    if (!row) return
    row.dataset.attachmentItems = JSON.stringify(this.formAttachments)
    row.dataset.materialIds = this.formAttachments.map((item) => item.id).join(",")
    row.dataset.attachments = String(this.formAttachments.length)
    const count = this.formAttachments.length
    row.querySelectorAll(".homework-page__files").forEach((node) => {
      const label = node.childNodes[node.childNodes.length - 1]
      if (label && label.nodeType === Node.TEXT_NODE) label.textContent = String(count)
    })
  }

  persistReview(row) {
    if (!row) return
    if (this.hasReviewFeedbackTarget) row.dataset.feedback = this.reviewFeedbackTarget.value
    row.dataset.reviewAttachmentItems = JSON.stringify(this.reviewAttachments)
    row.dataset.reviewIds = this.reviewAttachments.map((item) => item.id).join(",")
  }

  attachmentsFromRow(row) {
    const stored = this.parseJson(row.dataset.attachmentItems || "[]")
    if (Array.isArray(stored) && stored.length) return stored
    return this.attachmentsFromIds(row.dataset.materialIds)
  }

  submissionAttachmentsFromRow(row) {
    return this.attachmentsFromIds(row.dataset.submissionIds)
  }

  reviewAttachmentsFromRow(row) {
    const stored = this.parseJson(row.dataset.reviewAttachmentItems || "[]")
    if (Array.isArray(stored) && stored.length) return stored
    return this.attachmentsFromIds(row.dataset.reviewIds)
  }

  attachmentsFromIds(raw) {
    const ids = String(raw || "").split(",").filter(Boolean)
    const library = this.libraryValue || {}
    return ids.map((id) => {
      const item = library[id] || {}
      return { id, kind: item.type || "file", name: item.title || id, meta: item.domain || item.type || "" }
    })
  }

  useFormMaterials() {
    this.materialsKind = "form"
  }

  useReviewMaterials() {
    this.materialsKind = "review"
  }

  materialsBag() {
    const review = this.materialsKind === "review"
    return {
      items: review ? this.reviewAttachments : this.formAttachments,
      setItems: (items) => {
        if (review) this.reviewAttachments = items
        else this.formAttachments = items
      },
      video: this.optionalTarget(review ? "reviewVideoInput" : "videoInput"),
      file: this.optionalTarget(review ? "reviewFileInput" : "fileInput"),
      linkForm: this.optionalTarget(review ? "reviewLinkForm" : "linkForm"),
      linkUrl: this.optionalTarget(review ? "reviewLinkUrl" : "linkUrl"),
      linkTitle: this.optionalTarget(review ? "reviewLinkTitle" : "linkTitle"),
      linkError: this.optionalTarget(review ? "reviewLinkError" : "linkError"),
      error: this.optionalTarget(review ? "reviewMaterialsError" : "materialsError"),
      list: this.optionalTarget(review ? "reviewAttachmentList" : "attachmentList"),
      library: this.optionalTarget(review ? "reviewLibrary" : "library"),
      libraryList: this.optionalTarget(review ? "reviewLibraryList" : "libraryList")
    }
  }

  optionalTarget(name) {
    const flag = `has${name[0].toUpperCase()}${name.slice(1)}Target`
    if (!this[flag]) return null
    return this[`${name}Target`]
  }

  canAdd(count) {
    if (this.materialsBag().items.length + count <= 10) return true
    this.setMaterialsError(this.strings.too_many_files)
    return false
  }

  setMaterialsError(message) {
    const node = this.materialsBag().error
    if (!node) return
    node.textContent = message || ""
    node.hidden = !message
  }

  setLinkError(message) {
    const node = this.materialsBag().linkError
    if (!node) return
    node.textContent = message || ""
    node.hidden = !message
  }

  validUrl(value) {
    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  linkHost(value) {
    try {
      return new URL(value).host
    } catch {
      return value
    }
  }

  fileLabel(file) {
    if (file.type?.includes("pdf")) return "PDF"
    if (file.type?.startsWith("image/")) return "Image"
    if (file.type?.startsWith("audio/")) return "Audio"
    return "File"
  }

  fileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  formatDate(value) {
    const key = String(value || "").slice(0, 10)
    if (!key) return "—"
    const date = new Date(`${key}T00:00:00`)
    if (Number.isNaN(date.getTime())) return key
    const locale = String(this.localeValue).startsWith("ua") ? "uk-UA" : "en-US"
    return date.toLocaleDateString(locale, { month: "long", day: "numeric" })
  }

  todayKey() {
    return this.dateKey(new Date())
  }

  plusDays(days) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return this.dateKey(date)
  }

  dateKey(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  initials(name) {
    const parts = String(name || "").split(/\s+/).filter(Boolean)
    if (!parts.length) return "ST"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  interpolate(template, vars = {}) {
    return String(template || "").replace(/%\{(\w+)\}/g, (_, key) => vars[key] ?? "")
  }

  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  parseJson(raw) {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
}
