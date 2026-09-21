import { Controller } from "@hotwired/stimulus"
import { formatLessonMoney, formatMoney } from "../lib/money"

const CHARGE_DEFAULTS = {
  student_advance: "no_charge",
  student_late: "charge",
  student_no_show: "charge",
  teacher_cancelled: "no_charge",
  technical: "no_charge",
  emergency: "no_charge",
  other: "no_charge"
}

export default class extends Controller {
  static targets = [
    "attendance",
    "attendancePills",
    "groupAttendance",
    "duration",
    "teacherNote",
    "progressNote",
    "homeworkBtn",
    "financeBox",
    "financeAttendance",
    "financeCharge",
    "financeChargeNote",
    "financeBalanceWrap",
    "financeCurrent",
    "financeAfter",
    "financeEarns",
    "financeNegative",
    "negativeCheckWrap",
    "confirmNegative",
    "cancelReason",
    "cancelOtherWrap",
    "cancelOther",
    "cancelNote",
    "chargeCard",
    "chargeYesHint",
    "chargeSummaryText",
    "formError",
    "submit"
  ]

  static values = {
    lesson: Object,
    url: String,
    homeworkUrl: String,
    i18n: Object,
    showFinance: { type: Boolean, default: false },
    canManagePayments: { type: Boolean, default: false },
    charge: { type: String, default: "no_charge" }
  }

  connect() {
    this.homeworkIntent = "skip"
    this.chargeDecision = this.chargeValue || "no_charge"
    this.groupAttendance = {}
    this.saving = false
    this.onHomeworkCompleteRequest = (event) => {
      if (!this.hasDurationTarget || !this.urlValue) return
      event.detail.completer = () => this.persistCompletedForHomework()
    }
    window.addEventListener("homework:request-lesson-completion", this.onHomeworkCompleteRequest)
    const students = Array.isArray(this.lesson.students) ? this.lesson.students : []
    const current = this.hasAttendanceTarget ? this.attendanceTarget.value : "attended"
    students.forEach((student) => {
      if (student?.id) this.groupAttendance[String(student.id)] = current
    })
    this.syncCancelReasonFields()
    this.syncCompleteFinance()
  }

  disconnect() {
    window.removeEventListener("homework:request-lesson-completion", this.onHomeworkCompleteRequest)
  }

  t(key, vars = {}) {
    let text = this.i18nValue?.lessons?.[key] || this.i18nValue?.common?.[key] || key
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`%{${name}}`, String(value))
    })
    return text
  }

  get lesson() {
    return this.lessonValue || {}
  }

  chooseAttendance(event) {
    const status = event.currentTarget.dataset.attendance || "attended"
    const studentId = event.currentTarget.dataset.studentId
    if (studentId) {
      this.groupAttendance[String(studentId)] = status
      event.currentTarget.parentElement?.querySelectorAll(".lessons-page__attendance-pill").forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.attendance === status)
      })
      if (this.hasAttendanceTarget) this.attendanceTarget.value = this.resolvedAttendance()
    } else {
      if (this.hasAttendanceTarget) this.attendanceTarget.value = status
      if (this.hasAttendancePillsTarget) {
        this.attendancePillsTarget.querySelectorAll("[data-attendance]").forEach((button) => {
          button.classList.toggle("is-selected", button.dataset.attendance === status)
        })
      }
    }
    this.syncCompleteFinance()
  }

  chooseHomework(event) {
    this.homeworkIntent = event.currentTarget.dataset.homework || "skip"
    this.homeworkBtnTargets.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.homework === this.homeworkIntent)
    })
    if (this.homeworkIntent === "create") {
      window.dispatchEvent(new CustomEvent("homework:open-from-lesson", {
        detail: { lesson: this.lesson, completeBeforeAssign: true },
        bubbles: true
      }))
    }
  }

  resolvedAttendance() {
    const values = Object.values(this.groupAttendance)
    if (!values.length) return this.hasAttendanceTarget ? this.attendanceTarget.value : "attended"
    if (values.every((item) => item === values[0])) return values[0]
    if (values.includes("absent")) return "absent"
    if (values.includes("late")) return "late"
    if (values.includes("attended")) return "attended"
    return "excused"
  }

  previewCharge(attendance) {
    const cents = Number(this.lesson.priceCents) || 0
    const currency = this.lesson.currency || "UAH"
    if (attendance === "excused") {
      return { shouldCharge: false, cents: 0, currency, note: this.t("excused_no_charge"), label: this.t("no_charge") }
    }
    const label = formatMoney(cents, currency)
    if (attendance === "absent") {
      return { shouldCharge: true, cents, currency, note: this.t("absent_charge_policy"), label }
    }
    return { shouldCharge: true, cents, currency, note: this.t("full_lesson_price"), label }
  }

  formatBalance(cents, currency) {
    const amount = formatMoney(Math.abs(cents), currency)
    if (cents > 0) return this.t("balance_credit", { amount })
    if (cents < 0) return this.t("balance_due", { amount })
    return amount
  }

  syncCompleteFinance() {
    if (!this.hasFinanceBoxTarget) return
    const attendance = this.resolvedAttendance()
    const billing = this.previewCharge(attendance)
    const students = Array.isArray(this.lesson.students) ? this.lesson.students : []
    const currentBalance = students[0]?.balanceCents
    const hasBalance = currentBalance != null && currentBalance !== ""
    const percent = Number(this.lesson.compensationPercent)
    const earnCents = Number.isFinite(percent) ? Math.round(billing.cents * (percent / 100)) : 0
    const statusLabel = this.t(`attendance_${attendance}`)
    if (this.hasFinanceAttendanceTarget) this.financeAttendanceTarget.textContent = this.t("attendance_status", { status: statusLabel })
    if (this.hasFinanceChargeTarget) this.financeChargeTarget.textContent = billing.label
    if (this.hasFinanceChargeNoteTarget) this.financeChargeNoteTarget.textContent = billing.note
    if (this.hasFinanceEarnsTarget) this.financeEarnsTarget.textContent = this.t("teacher_earns", { amount: formatMoney(earnCents, billing.currency) })
    const balanceAfter = hasBalance ? Number(currentBalance) - (billing.shouldCharge ? billing.cents : 0) : null
    if (this.hasFinanceBalanceWrapTarget) this.financeBalanceWrapTarget.hidden = !hasBalance
    if (hasBalance) {
      if (this.hasFinanceCurrentTarget) this.financeCurrentTarget.textContent = this.formatBalance(Number(currentBalance), billing.currency)
      if (this.hasFinanceAfterTarget) this.financeAfterTarget.textContent = this.formatBalance(balanceAfter, billing.currency)
    }
    const goesNegative = billing.shouldCharge && hasBalance && balanceAfter < 0
    if (this.hasFinanceNegativeTarget) this.financeNegativeTarget.hidden = !goesNegative
    if (this.hasNegativeCheckWrapTarget) this.negativeCheckWrapTarget.hidden = !goesNegative || !this.canManagePaymentsValue
    this.financeBoxTarget.hidden = !this.showFinanceValue
    if (this.hasSubmitTarget && this.hasDurationTarget) {
      const blocked = goesNegative && this.showFinanceValue && this.canManagePaymentsValue && !(this.hasConfirmNegativeTarget && this.confirmNegativeTarget.checked)
      this.submitTarget.disabled = blocked
      this.submitTarget.textContent = billing.shouldCharge
        ? this.t("complete_and_charge", { amount: billing.label })
        : this.t("complete_lesson")
    }
  }

  syncCancelReasonFields() {
    if (!this.hasCancelReasonTarget) return
    const other = this.cancelReasonTarget.value === "other"
    if (this.hasCancelOtherWrapTarget) this.cancelOtherWrapTarget.hidden = !other
    if (!other && this.hasCancelOtherTarget) this.cancelOtherTarget.value = ""
    this.chargeDecision = CHARGE_DEFAULTS[this.cancelReasonTarget.value] || "no_charge"
    this.syncChargeFields()
  }

  chooseCharge(event) {
    this.chargeDecision = event.currentTarget.dataset.charge || "no_charge"
    this.syncChargeFields()
  }

  syncChargeFields() {
    if (!this.hasChargeCardTarget) return
    const charging = this.chargeDecision === "charge"
    const amount = formatLessonMoney(this.lesson)
    const zero = formatLessonMoney({ currency: this.lesson.currency }, 0)
    this.chargeCardTargets.forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.charge === (this.chargeDecision || "no_charge"))
    })
    if (this.hasChargeYesHintTarget) this.chargeYesHintTarget.textContent = amount
    if (this.hasChargeSummaryTextTarget) {
      this.chargeSummaryTextTarget.textContent = charging
        ? this.t("amount_charged", { amount })
        : `${this.t("balance_unchanged")}\n${this.t("amount_charged", { amount: zero })}`
    }
    if (this.hasSubmitTarget) {
      this.submitTarget.textContent = charging
        ? this.t("cancel_and_charge", { amount })
        : this.t("cancel_without_charge")
    }
  }

  submitComplete() {
    const duration = this.hasDurationTarget ? Number(this.durationTarget.value) : 0
    if (!Number.isInteger(duration) || duration <= 0) {
      this.showError(this.t("duration_blank"))
      this.durationTarget?.focus()
      return
    }
    this.persist("completed")
  }

  async persistCompletedForHomework() {
    const duration = this.hasDurationTarget ? Number(this.durationTarget.value) : 0
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new Error(this.t("duration_blank"))
    }
    if (!this.urlValue || this.saving) {
      throw new Error(this.t("save_failed"))
    }
    this.saving = true
    this.showError("")
    try {
      const response = await fetch(this.urlValue, {
        method: "PATCH",
        credentials: "same-origin",
        headers: this.apiHeaders(),
        body: JSON.stringify(this.outcomePayload("completed"))
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = Array.isArray(data.errors) ? data.errors.filter(Boolean).join(" ") : (data.error || this.t("save_failed"))
        throw new Error(message || this.t("save_failed"))
      }
      this.homeworkIntent = "skip"
      return data
    } finally {
      this.saving = false
      if (this.hasSubmitTarget) this.syncCompleteFinance()
    }
  }

  submitCancel() {
    const reason = this.cancelReasonLabel()
    if (!reason) {
      const other = this.hasCancelReasonTarget && this.cancelReasonTarget.value === "other"
      this.showError(this.t(other ? "describe_reason_blank" : "cancel_reason_blank"))
      if (other) this.cancelOtherTarget?.focus()
      else this.cancelReasonTarget?.focus()
      return
    }
    this.persist("cancelled")
  }

  cancelReasonLabel() {
    if (!this.hasCancelReasonTarget) return ""
    if (this.cancelReasonTarget.value === "other") return this.hasCancelOtherTarget ? this.cancelOtherTarget.value.trim() : ""
    return (this.cancelReasonTarget.selectedOptions?.[0]?.text || "").trim()
  }

  outcomePayload(outcome) {
    const payload = { outcome }
    if (outcome === "cancelled") {
      const notes = [this.cancelReasonLabel(), this.hasCancelNoteTarget ? this.cancelNoteTarget.value.trim() : ""].filter(Boolean).join("\n\n")
      if (notes) payload.notes = notes
      if (this.hasCancelReasonTarget) payload.reasonCode = this.cancelReasonTarget.value
      if (this.hasCancelOtherTarget) payload.otherReasonText = this.cancelOtherTarget.value.trim()
      if (this.hasCancelNoteTarget) payload.cancellationNote = this.cancelNoteTarget.value.trim()
      payload.chargeDecision = this.chargeDecision || "no_charge"
    }
    if (outcome !== "completed") return payload
    if (this.hasAttendanceTarget) payload.attendance = this.attendanceTarget.value
    if (this.hasDurationTarget) payload.actualDurationMinutes = Number(this.durationTarget.value)
    if (this.hasTeacherNoteTarget) payload.teacherNote = this.teacherNoteTarget.value
    if (this.hasProgressNoteTarget) payload.studentProgressNote = this.progressNoteTarget.value
    return payload
  }

  async persist(outcome) {
    if (!this.urlValue || this.saving) return
    this.saving = true
    if (this.hasSubmitTarget) {
      this.submitTarget.disabled = true
      if (outcome === "completed") this.submitTarget.textContent = this.t("complete_saving")
    }
    this.showError("")
    try {
      const response = await fetch(this.urlValue, {
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
      window.location.reload()
    } catch (error) {
      this.showError(error.message || this.t("save_failed"))
      this.saving = false
      if (outcome === "completed") this.syncCompleteFinance()
      else this.syncChargeFields()
      if (this.hasSubmitTarget) this.submitTarget.disabled = false
    }
  }

  showError(message) {
    if (!this.hasFormErrorTarget) return
    this.formErrorTarget.hidden = !message
    this.formErrorTarget.textContent = message || ""
  }

  apiHeaders() {
    const headers = { Accept: "application/json", "Content-Type": "application/json" }
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (token) headers["X-CSRF-Token"] = token
    return headers
  }
}
