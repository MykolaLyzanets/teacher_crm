import { Controller } from "@hotwired/stimulus"
import { closeModal, openModal } from "../lib/modal"

export default class extends Controller {
  static targets = [
    "tab", "panel", "toast", "from", "to", "type", "status", "student", "currency",
    "row", "empty", "transactionBody",
    "paymentModal", "paymentTitle", "paymentDesc", "paymentStudentName",
    "paymentFormStep", "paymentReviewStep", "paymentAmount",
    "paymentDate", "paymentMethod", "paymentReference", "paymentNote",
    "paymentError", "paymentReviewBefore", "paymentReviewAfter", "paymentReviewChange",
    "paymentReviewAlert", "paymentReviewStudent", "paymentReviewDate", "paymentReviewMethod",
    "paymentReviewReferenceRow", "paymentReviewReference", "paymentReviewNoteRow",
    "paymentReviewNote", "paymentReviewError", "paymentBack", "paymentSubmit",
    "paymentStatusBtn", "paymentPendingHint",
    "refundModal", "refundDesc", "refundPaymentSummary", "refundRemaining", "refundAmount",
    "refundNote", "refundError",
    "adjustmentModal", "adjustmentTitle", "adjustmentDesc", "adjustmentStudentName",
    "adjustmentFormStep", "adjustmentReviewStep", "adjustmentDirectionBtn",
    "adjustmentAmountLabel", "adjustmentAmount", "adjustmentAmountHint",
    "adjustmentDate", "adjustmentReason", "adjustmentNote",
    "adjustmentError", "adjustmentReviewBefore", "adjustmentReviewAfter",
    "adjustmentReviewChange", "adjustmentReviewAlert", "adjustmentReviewStudent",
    "adjustmentReviewDate", "adjustmentReviewReason", "adjustmentReviewNoteRow",
    "adjustmentReviewNote", "adjustmentReviewError", "adjustmentBack", "adjustmentSubmit",
    "payoutModal", "payoutDesc", "payoutAmount", "payoutCurrency", "payoutDate", "payoutMethod",
    "payoutNote", "payoutError"
  ]

  static values = {
    i18n: Object,
    canManage: Boolean,
    paths: Object,
    modalsUrl: String
  }

  connect() {
    this.paymentStep = "form"
    this.adjustmentStep = "form"
    this.adjustmentDirection = "credit"
    this.paymentContext = null
    this.adjustmentContext = null
    this.payoutContext = null
    this.refundContext = null
    this.paymentSaveStatus = "pending"
    this.submitting = false
    this.modalsLoading = null
  }

  async ensureModalsLoaded() {
    if (this.hasPaymentModalTarget) return true
    if (!this.hasModalsUrlValue) return false
    const frame = document.getElementById("payments_modals")
    if (!frame) return false
    if (this.modalsLoading) return this.modalsLoading
    this.modalsLoading = new Promise((resolve) => {
      const done = () => {
        this.modalsLoading = null
        resolve(this.hasPaymentModalTarget)
      }
      if (frame.dataset.loaded === "1") {
        window.requestAnimationFrame(done)
        return
      }
      const onLoad = (event) => {
        if (event.target !== frame) return
        frame.dataset.loaded = "1"
        done()
      }
      frame.addEventListener("turbo:frame-load", onLoad, { once: true })
      frame.src = this.modalsUrlValue
    })
    return this.modalsLoading
  }

  csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
  }

  async postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      body: JSON.stringify(body)
    })
    const payload = await response.json().catch(() => ({}))
    return { ok: response.ok, payload }
  }

  phrase(key, fallback = "") {
    const value = this.i18nValue?.payments?.[key] ?? this.i18nValue?.common?.[key]
    return value == null || value === "" ? fallback : value
  }

  formatLedgerDate(dateKey) {
    if (!dateKey) return ""
    const date = new Date(`${dateKey}T12:00:00`)
    const locale = document.documentElement.lang || "en"
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date)
  }

  balanceStateClass(cents, referencePriceCents = null) {
    if (cents < 0) return "pay-balance--debt"
    if (referencePriceCents > 0 && cents < referencePriceCents) return "pay-balance--low"
    return "pay-balance--ok"
  }

  applyBalanceConfirm({ beforeEl, afterEl, changeEl, alertEl, beforeCents, afterCents, changeCents, currency, referencePriceCents }) {
    if (beforeEl) {
      beforeEl.textContent = this.formatBalance(beforeCents, currency)
      beforeEl.className = `pay__balance-amount ${this.balanceStateClass(beforeCents, referencePriceCents)}`
    }
    if (afterEl) {
      afterEl.textContent = this.formatBalance(afterCents, currency)
      afterEl.className = `pay__balance-amount ${this.balanceStateClass(afterCents, referencePriceCents)}`
    }
    if (changeEl) {
      changeEl.textContent = this.formatSignedMoney(changeCents, currency)
      changeEl.className = changeCents < 0 ? "pay__delta-neg" : "pay__delta-pos"
    }
    if (!alertEl) return
    if (afterCents < 0) {
      const owed = this.formatMoney(-afterCents, currency)
      const label = this.phrase("status_debt", "Debt")
      const hint = this.phrase("balance_owed_hint", "%{amount} owed").replace("%{amount}", owed)
      alertEl.textContent = this.phrase("balance_negative_alert", "%{label}. %{hint}.")
        .replace("%{label}", label)
        .replace("%{hint}", hint)
      alertEl.hidden = false
    } else {
      alertEl.hidden = true
    }
  }

  toggleReviewRow(rowTarget, valueTarget, value) {
    if (!rowTarget || !valueTarget) return
    const text = value.trim()
    if (text) {
      valueTarget.textContent = text
      rowTarget.hidden = false
    } else {
      rowTarget.hidden = true
    }
  }

  selectTab(event) {
    const id = event?.currentTarget?.dataset?.tab
    if (!id) return
    this.showTab(id)
  }

  showTab(id) {
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === id ? "true" : "false")
    })
    this.panelTargets.forEach((panel) => {
      panel.hidden = panel.dataset.tab !== id
    })
  }

  focusStudentTransactions(event) {
    const studentId = event.currentTarget.dataset.studentId
    if (!studentId) return
    this.showTab("transactions")
    if (this.hasStudentTarget) {
      this.studentTarget.value = studentId
    }
    this.filter()
    this.panelTargets
      .filter((panel) => panel.dataset.tab === "transactions")
      .forEach((panel) => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }))
  }

  filter() {
    const from = this.hasFromTarget ? this.fromTarget.value : ""
    const to = this.hasToTarget ? this.toTarget.value : ""
    const type = this.hasTypeTarget ? this.typeTarget.value : "all"
    const status = this.hasStatusTarget ? this.statusTarget.value : "all"
    const student = this.hasStudentTarget ? this.studentTarget.value : "all"
    const currency = this.hasCurrencyTarget ? this.currencyTarget.value : "all"
    let visible = 0
    this.rowTargets.forEach((row) => {
      const date = row.dataset.date || ""
      const matchDate = (!from || date >= from) && (!to || date <= to)
      const matchType = type === "all" || row.dataset.type === type
      const matchStatus = status === "all" || row.dataset.status === status
      const matchStudent = student === "all" || row.dataset.studentId === student
      const matchCurrency = currency === "all" || row.dataset.currency === currency
      const show = matchDate && matchType && matchStatus && matchStudent && matchCurrency
      row.hidden = !show
      if (show) visible += 1
    })
    if (this.hasEmptyTarget) this.emptyTarget.hidden = visible > 0
  }

  formatMoney(cents, currency = "UAH") {
    const amount = (Math.abs(Number(cents) || 0) / 100).toFixed(0)
    const prefix = currency === "EUR" ? "€" : `${currency} `
    return `${prefix}${amount}`
  }

  formatSignedMoney(cents, currency = "UAH") {
    const label = this.formatMoney(cents, currency)
    if (cents > 0) return `+${label}`
    if (cents < 0) return `−${label}`
    return label
  }

  formatBalance(cents, currency) {
    return this.formatSignedMoney(cents, currency)
  }

  todayKey() {
    return new Date().toISOString().slice(0, 10)
  }

  methodLabel(method) {
    return this.i18nValue?.payments?.methods?.[method] || method
  }

  openModalTarget(target) {
    if (!target) return
    target.removeAttribute("hidden")
    openModal(target, {
      onClose: () => this.closeModalTarget(target),
      focus: target.querySelector("[data-modal-focus]")
    })
  }

  closeModalTarget(target) {
    if (!target) return
    closeModal(target)
    target.setAttribute("hidden", "hidden")
  }

  async openPayment(event) {
    if (!(await this.ensureModalsLoaded())) return
    const button = event.currentTarget
    this.paymentContext = {
      studentId: button.dataset.studentId,
      studentName: button.dataset.studentName,
      currency: button.dataset.currency || "UAH",
      balanceCents: Number(button.dataset.balanceCents || 0),
      referencePriceCents: Number(button.dataset.referencePriceCents || 0) || null
    }
    this.paymentStep = "form"
    if (this.hasPaymentStudentNameTarget) this.paymentStudentNameTarget.textContent = this.paymentContext.studentName
    if (this.hasPaymentAmountTarget) this.paymentAmountTarget.value = ""
    if (this.hasPaymentDateTarget) this.paymentDateTarget.value = this.todayKey()
    if (this.hasPaymentMethodTarget) this.paymentMethodTarget.value = "bank_transfer"
    if (this.hasPaymentReferenceTarget) this.paymentReferenceTarget.value = ""
    if (this.hasPaymentNoteTarget) this.paymentNoteTarget.value = ""
    this.paymentSaveStatus = "pending"
    this.syncPaymentStatusButtons()
    this.syncPaymentSteps()
    this.openModalTarget(this.paymentModalTarget)
  }

  pickPaymentStatus(event) {
    this.paymentSaveStatus = event.currentTarget.dataset.status === "confirmed" ? "confirmed" : "pending"
    this.syncPaymentStatusButtons()
    this.clearPaymentError()
  }

  syncPaymentStatusButtons() {
    if (!this.hasPaymentStatusBtnTarget) return
    this.paymentStatusBtnTargets.forEach((button) => {
      const selected = button.dataset.status === this.paymentSaveStatus
      button.setAttribute("aria-checked", selected ? "true" : "false")
      button.classList.toggle("is-selected", selected)
    })
  }

  closePaymentModal() {
    this.paymentStep = "form"
    this.syncPaymentSteps()
    this.closeModalTarget(this.paymentModalTarget)
  }

  syncPaymentSteps() {
    const review = this.paymentStep === "review"
    if (this.hasPaymentFormStepTarget) this.paymentFormStepTarget.hidden = review
    if (this.hasPaymentReviewStepTarget) this.paymentReviewStepTarget.hidden = !review
    if (this.hasPaymentTitleTarget) {
      this.paymentTitleTarget.textContent = review
        ? this.phrase("confirm_top_up_title", "Confirm top-up")
        : this.phrase("add_funds_title", "Add funds")
    }
    if (this.hasPaymentDescTarget) {
      this.paymentDescTarget.textContent = review
        ? this.phrase("confirm_top_up_desc", "Check the amount and the resulting balance before saving.")
        : this.phrase("add_funds_desc", "Record money received from this student.")
    }
    if (this.hasPaymentBackTarget) {
      this.paymentBackTarget.textContent = review ? this.phrase("back", "Back") : this.phrase("cancel", "Cancel")
    }
    if (this.hasPaymentSubmitTarget) {
      if (review && this.paymentContext) {
        const cents = this.paymentAmountCents()
        const amount = this.formatMoney(cents, this.paymentContext.currency)
        this.paymentSubmitTarget.textContent = this.phrase("confirm_add_amount", "Add %{amount}").replace("%{amount}", amount)
      } else {
        this.paymentSubmitTarget.textContent = this.phrase("review", "Review")
      }
    }
  }

  paymentBackOrCancel() {
    if (this.paymentStep === "review") {
      this.paymentStep = "form"
      this.syncPaymentSteps()
      return
    }
    this.closePaymentModal()
  }

  paymentPrimaryAction() {
    if (this.paymentStep === "form") {
      const error = this.validatePaymentForm()
      if (error) {
        this.showPaymentError(error)
        return
      }
      this.renderPaymentReview()
      this.paymentStep = "review"
      this.syncPaymentSteps()
      return
    }
    this.savePayment()
  }

  validatePaymentForm() {
    const cents = Math.round(Number(this.paymentAmountTarget.value) * 100)
    if (!Number.isFinite(cents) || cents <= 0) return this.phrase("invalid_amount", "Enter a valid payment amount.")
    if (!this.paymentDateTarget.value) return this.phrase("invalid_date", "Choose a payment date.")
    return null
  }

  showPaymentError(message) {
    if (!this.hasPaymentErrorTarget) return
    this.paymentErrorTarget.textContent = message
    this.paymentErrorTarget.hidden = false
  }

  clearPaymentError() {
    if (this.hasPaymentErrorTarget) this.paymentErrorTarget.hidden = true
  }

  paymentAmountCents() {
    return Math.round(Number(this.paymentAmountTarget.value) * 100)
  }

  renderPaymentReview() {
    const ctx = this.paymentContext
    const change = this.paymentAmountCents()
    const confirmNow = this.paymentSaveStatus === "confirmed"
    const after = confirmNow ? ctx.balanceCents + change : ctx.balanceCents
    const refPrice = ctx.referencePriceCents || null
    if (this.hasPaymentPendingHintTarget) {
      this.paymentPendingHintTarget.hidden = confirmNow
    }
    this.applyBalanceConfirm({
      beforeEl: this.hasPaymentReviewBeforeTarget ? this.paymentReviewBeforeTarget : null,
      afterEl: this.hasPaymentReviewAfterTarget ? this.paymentReviewAfterTarget : null,
      changeEl: this.hasPaymentReviewChangeTarget ? this.paymentReviewChangeTarget : null,
      alertEl: this.hasPaymentReviewAlertTarget ? this.paymentReviewAlertTarget : null,
      beforeCents: ctx.balanceCents,
      afterCents: after,
      changeCents: change,
      currency: ctx.currency,
      referencePriceCents: refPrice
    })
    if (this.hasPaymentReviewStudentTarget) this.paymentReviewStudentTarget.textContent = ctx.studentName
    if (this.hasPaymentReviewDateTarget) {
      this.paymentReviewDateTarget.textContent = this.formatLedgerDate(this.paymentDateTarget.value)
    }
    if (this.hasPaymentReviewMethodTarget) {
      this.paymentReviewMethodTarget.textContent = this.methodLabel(this.paymentMethodTarget.value)
    }
    this.toggleReviewRow(
      this.hasPaymentReviewReferenceRowTarget ? this.paymentReviewReferenceRowTarget : null,
      this.hasPaymentReviewReferenceTarget ? this.paymentReviewReferenceTarget : null,
      this.paymentReferenceTarget.value
    )
    this.toggleReviewRow(
      this.hasPaymentReviewNoteRowTarget ? this.paymentReviewNoteRowTarget : null,
      this.hasPaymentReviewNoteTarget ? this.paymentReviewNoteTarget : null,
      this.paymentNoteTarget.value
    )
    if (this.hasPaymentReviewErrorTarget) this.paymentReviewErrorTarget.hidden = true
    this.syncPaymentSteps()
  }

  async savePayment() {
    if (this.submitting) return
    this.submitting = true
    const cents = this.paymentAmountCents()
    const currency = this.paymentContext.currency
    const url = this.pathsValue?.studentPayment
    if (!url) {
      this.submitting = false
      return
    }
    const { ok, payload } = await this.postJson(url, {
      student_profile_id: this.paymentContext.studentId,
      amount_cents: cents,
      method: this.paymentMethodTarget.value,
      reference: this.paymentReferenceTarget.value,
      internal_note: this.paymentNoteTarget.value,
      confirm: this.paymentSaveStatus === "confirmed"
    })
    this.submitting = false
    if (!ok) {
      this.paymentStep = "review"
      this.syncPaymentSteps()
      const message = Array.isArray(payload.errors) ? payload.errors.join(" ") : this.phrase("save_failed", "Save failed.")
      if (this.hasPaymentReviewErrorTarget) {
        this.paymentReviewErrorTarget.textContent = message
        this.paymentReviewErrorTarget.hidden = false
      }
      return
    }
    const message = this.phrase("payment_added_detail", "%{amount} added to %{name}'s balance.")
      .replace("%{amount}", this.formatMoney(cents, currency))
      .replace("%{name}", this.paymentContext.studentName)
    this.closePaymentModal()
    this.toastMessage(message)
    window.setTimeout(() => window.location.reload(), 600)
  }

  async openAdjustment(event) {
    if (!(await this.ensureModalsLoaded())) return
    const button = event.currentTarget
    this.adjustmentContext = {
      studentId: button.dataset.studentId,
      studentName: button.dataset.studentName,
      currency: button.dataset.currency || "UAH",
      balanceCents: Number(button.dataset.balanceCents || 0)
    }
    this.adjustmentStep = "form"
    if (this.hasAdjustmentStudentNameTarget) this.adjustmentStudentNameTarget.textContent = this.adjustmentContext.studentName
    if (this.hasAdjustmentAmountTarget) this.adjustmentAmountTarget.value = ""
    if (this.hasAdjustmentDateTarget) this.adjustmentDateTarget.value = this.todayKey()
    if (this.hasAdjustmentReasonTarget) this.adjustmentReasonTarget.value = ""
    if (this.hasAdjustmentNoteTarget) this.adjustmentNoteTarget.value = ""
    this.adjustmentDirection = "credit"
    this.syncAdjustmentDirectionButtons()
    this.updateAdjustmentAmountLabel()
    this.updateAdjustmentAmountHint()
    this.syncAdjustmentSteps()
    this.openModalTarget(this.adjustmentModalTarget)
  }

  pickAdjustmentDirection(event) {
    this.adjustmentDirection = event.currentTarget.dataset.direction === "debit" ? "debit" : "credit"
    this.syncAdjustmentDirectionButtons()
    this.updateAdjustmentAmountHint()
    this.clearAdjustmentError()
  }

  syncAdjustmentDirectionButtons() {
    if (!this.hasAdjustmentDirectionBtnTarget) return
    this.adjustmentDirectionBtnTargets.forEach((button) => {
      const selected = button.dataset.direction === this.adjustmentDirection
      button.setAttribute("aria-checked", selected ? "true" : "false")
      button.classList.toggle("is-selected", selected)
    })
  }

  updateAdjustmentAmountLabel() {
    if (!this.hasAdjustmentAmountLabelTarget || !this.adjustmentContext) return
    this.adjustmentAmountLabelTarget.textContent = this.phrase("amount_with_currency", "Amount (%{currency})")
      .replace("%{currency}", this.adjustmentContext.currency)
  }

  adjustmentAmountInput() {
    this.updateAdjustmentAmountHint()
    this.clearAdjustmentError()
  }

  updateAdjustmentAmountHint() {
    if (!this.hasAdjustmentAmountHintTarget) return
    const cents = Math.round(Number(this.adjustmentAmountTarget.value) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      this.adjustmentAmountHintTarget.hidden = true
      return
    }
    const currency = this.adjustmentContext?.currency || "UAH"
    const amount = this.formatMoney(cents, currency)
    const text = this.selectedAdjustmentDirection() === "debit"
      ? this.phrase("adjust_deducts", "Deducts %{amount}").replace("%{amount}", amount)
      : this.phrase("adjust_adds", "Adds %{amount}").replace("%{amount}", amount)
    this.adjustmentAmountHintTarget.textContent = text
    this.adjustmentAmountHintTarget.hidden = false
  }

  closeAdjustmentModal() {
    this.adjustmentStep = "form"
    this.syncAdjustmentSteps()
    this.closeModalTarget(this.adjustmentModalTarget)
  }

  syncAdjustmentSteps() {
    const review = this.adjustmentStep === "review"
    if (this.hasAdjustmentFormStepTarget) this.adjustmentFormStepTarget.hidden = review
    if (this.hasAdjustmentReviewStepTarget) this.adjustmentReviewStepTarget.hidden = !review
    if (this.hasAdjustmentTitleTarget) {
      this.adjustmentTitleTarget.textContent = review
        ? this.phrase("confirm_adjust_title", "Confirm adjustment")
        : this.phrase("adjust_title", "Adjust balance")
    }
    if (this.hasAdjustmentDescTarget) {
      this.adjustmentDescTarget.textContent = review
        ? this.phrase("adjust_review_desc", "Check the change and the resulting balance before saving.")
        : this.phrase("adjust_desc", "For corrections only. Every adjustment is kept in the history.")
    }
    if (this.hasAdjustmentBackTarget) {
      this.adjustmentBackTarget.textContent = review ? this.phrase("back", "Back") : this.phrase("cancel", "Cancel")
    }
    if (this.hasAdjustmentSubmitTarget) {
      this.adjustmentSubmitTarget.textContent = review
        ? this.phrase("confirm_save_adjustment", "Save adjustment")
        : this.phrase("review", "Review")
    }
  }

  adjustmentBackOrCancel() {
    if (this.adjustmentStep === "review") {
      this.adjustmentStep = "form"
      this.syncAdjustmentSteps()
      return
    }
    this.closeAdjustmentModal()
  }

  adjustmentPrimaryAction() {
    if (this.adjustmentStep === "form") {
      const error = this.validateAdjustmentForm()
      if (error) {
        this.showAdjustmentError(error)
        return
      }
      this.renderAdjustmentReview()
      this.adjustmentStep = "review"
      this.syncAdjustmentSteps()
      return
    }
    this.saveAdjustment()
  }

  selectedAdjustmentDirection() {
    return this.adjustmentDirection === "debit" ? "debit" : "credit"
  }

  adjustmentSignedCents() {
    const cents = Math.round(Number(this.adjustmentAmountTarget.value) * 100)
    return this.selectedAdjustmentDirection() === "debit" ? -cents : cents
  }

  validateAdjustmentForm() {
    const cents = Math.round(Number(this.adjustmentAmountTarget.value) * 100)
    if (!Number.isFinite(cents) || cents <= 0) return this.phrase("invalid_amount", "Enter a valid amount.")
    if (!this.adjustmentDateTarget.value) return this.phrase("invalid_date", "Choose a date.")
    if (!this.adjustmentReasonTarget.value.trim()) {
      return this.phrase("adjust_reason_required", "Enter a reason for this adjustment.")
    }
    return null
  }

  showAdjustmentError(message) {
    if (!this.hasAdjustmentErrorTarget) return
    this.adjustmentErrorTarget.textContent = message
    this.adjustmentErrorTarget.hidden = false
  }

  clearAdjustmentError() {
    if (this.hasAdjustmentErrorTarget) this.adjustmentErrorTarget.hidden = true
  }

  renderAdjustmentReview() {
    const ctx = this.adjustmentContext
    const change = this.adjustmentSignedCents()
    const after = ctx.balanceCents + change
    this.applyBalanceConfirm({
      beforeEl: this.hasAdjustmentReviewBeforeTarget ? this.adjustmentReviewBeforeTarget : null,
      afterEl: this.hasAdjustmentReviewAfterTarget ? this.adjustmentReviewAfterTarget : null,
      changeEl: this.hasAdjustmentReviewChangeTarget ? this.adjustmentReviewChangeTarget : null,
      alertEl: this.hasAdjustmentReviewAlertTarget ? this.adjustmentReviewAlertTarget : null,
      beforeCents: ctx.balanceCents,
      afterCents: after,
      changeCents: change,
      currency: ctx.currency,
      referencePriceCents: null
    })
    if (this.hasAdjustmentReviewStudentTarget) {
      this.adjustmentReviewStudentTarget.textContent = ctx.studentName
    }
    if (this.hasAdjustmentReviewDateTarget) {
      this.adjustmentReviewDateTarget.textContent = this.formatLedgerDate(this.adjustmentDateTarget.value)
    }
    if (this.hasAdjustmentReviewReasonTarget) {
      this.adjustmentReviewReasonTarget.textContent = this.adjustmentReasonTarget.value.trim()
    }
    this.toggleReviewRow(
      this.hasAdjustmentReviewNoteRowTarget ? this.adjustmentReviewNoteRowTarget : null,
      this.hasAdjustmentReviewNoteTarget ? this.adjustmentReviewNoteTarget : null,
      this.adjustmentNoteTarget.value
    )
    if (this.hasAdjustmentReviewErrorTarget) this.adjustmentReviewErrorTarget.hidden = true
    this.syncAdjustmentSteps()
  }

  async saveAdjustment() {
    const url = this.pathsValue?.adjustment
    if (!url) return
    const change = this.adjustmentSignedCents()
    const { ok, payload } = await this.postJson(url, {
      student_profile_id: this.adjustmentContext.studentId,
      amount_cents: change,
      reason: this.adjustmentReasonTarget.value.trim()
    })
    if (!ok) {
      const message = Array.isArray(payload.errors) ? payload.errors.join(" ") : this.phrase("save_failed", "Save failed.")
      if (this.hasAdjustmentReviewErrorTarget) {
        this.adjustmentReviewErrorTarget.textContent = message
        this.adjustmentReviewErrorTarget.hidden = false
      }
      return
    }
    const after = this.adjustmentContext.balanceCents + change
    const message = this.phrase("adjusted_detail", "Balance adjusted. New balance: %{balance}.")
      .replace("%{balance}", this.formatBalance(after, this.adjustmentContext.currency))
    this.closeAdjustmentModal()
    this.toastMessage(message)
    window.setTimeout(() => window.location.reload(), 600)
  }

  async openPayout(event) {
    if (!(await this.ensureModalsLoaded())) return
    const button = event.currentTarget
    const remaining = Number(button.dataset.remaining || 0)
    const currency = button.dataset.currency || "EUR"
    const teacherName = button.dataset.teacherName || ""
    const teacherId = button.dataset.teacherId
    this.payoutContext = { teacherId, teacherName, remaining, currency }
    if (this.hasPayoutAmountTarget) {
      this.payoutAmountTarget.value = remaining > 0 ? String(remaining / 100) : ""
    }
    if (this.hasPayoutCurrencyTarget) this.payoutCurrencyTarget.value = currency
    if (this.hasPayoutDateTarget) this.payoutDateTarget.value = this.todayKey()
    if (this.hasPayoutMethodTarget) this.payoutMethodTarget.value = "bank_transfer"
    if (this.hasPayoutNoteTarget) this.payoutNoteTarget.value = ""
    if (this.hasPayoutDescTarget) {
      this.payoutDescTarget.textContent = this.phrase("payout_desc", "%{name} · Remaining %{amount}")
        .replace("%{name}", teacherName)
        .replace("%{amount}", this.formatMoney(remaining, currency))
    }
    if (this.hasPayoutErrorTarget) this.payoutErrorTarget.hidden = true
    this.openModalTarget(this.payoutModalTarget)
  }

  closePayoutModal() {
    this.closeModalTarget(this.payoutModalTarget)
  }

  async savePayout() {
    const cents = Math.round(Number(this.payoutAmountTarget.value) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      if (this.hasPayoutErrorTarget) {
        this.payoutErrorTarget.textContent = this.phrase("invalid_payout", "Enter a valid payout amount.")
        this.payoutErrorTarget.hidden = false
      }
      return
    }
    const url = this.pathsValue?.teacherPayout
    if (!url || !this.payoutContext?.teacherId) return
    const { ok, payload } = await this.postJson(url, {
      teacher_profile_id: this.payoutContext.teacherId,
      amount_cents: cents,
      method: this.payoutMethodTarget.value,
      paid_at: this.payoutDateTarget.value,
      note: this.payoutNoteTarget.value
    })
    if (!ok) {
      const message = Array.isArray(payload.errors) ? payload.errors.join(" ") : this.phrase("save_failed", "Save failed.")
      if (this.hasPayoutErrorTarget) {
        this.payoutErrorTarget.textContent = message
        this.payoutErrorTarget.hidden = false
      }
      return
    }
    this.closePayoutModal()
    this.toastMessage(this.phrase("payout_recorded", "Payout recorded."))
    window.setTimeout(() => window.location.reload(), 600)
  }

  confirmPending(event) {
    this.resolvePending(event, this.pathsValue?.confirmPayment, "payment_confirmed", "Payment confirmed.")
  }

  rejectPending(event) {
    this.resolvePending(event, this.pathsValue?.rejectPayment, "payment_rejected", "Payment rejected.")
  }

  async openRefund(event) {
    if (!(await this.ensureModalsLoaded())) return
    const button = event.currentTarget
    const refundable = Number(button.dataset.refundableCents || 0)
    const paymentCents = Number(button.dataset.paymentCents || 0)
    const currency = button.dataset.currency || "UAH"
    const party = button.dataset.party || ""
    const paymentId = button.dataset.paymentId
    this.refundContext = { paymentId, refundable, paymentCents, currency, party }
    if (this.hasRefundPaymentSummaryTarget) {
      this.refundPaymentSummaryTarget.textContent = `${party} · ${this.formatMoney(paymentCents, currency)}`
    }
    if (this.hasRefundRemainingTarget) this.refundRemainingTarget.value = this.formatMoney(refundable, currency)
    if (this.hasRefundAmountTarget) this.refundAmountTarget.value = refundable > 0 ? String(refundable / 100) : ""
    if (this.hasRefundNoteTarget) this.refundNoteTarget.value = ""
    if (this.hasRefundDescTarget) {
      this.refundDescTarget.textContent = this.phrase("refund_desc", "%{party} · Original payment %{amount}")
        .replace("%{party}", party)
        .replace("%{amount}", this.formatMoney(paymentCents, currency))
    }
    if (this.hasRefundErrorTarget) this.refundErrorTarget.hidden = true
    this.openModalTarget(this.refundModalTarget)
  }

  closeRefundModal() {
    this.closeModalTarget(this.refundModalTarget)
  }

  async saveRefund() {
    const url = this.pathsValue?.refund
    const ctx = this.refundContext
    if (!url || !ctx?.paymentId) return
    const cents = Math.round(Number(this.refundAmountTarget.value) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      if (this.hasRefundErrorTarget) {
        this.refundErrorTarget.textContent = this.phrase("invalid_amount", "Enter a valid amount.")
        this.refundErrorTarget.hidden = false
      }
      return
    }
    if (cents > ctx.refundable) {
      if (this.hasRefundErrorTarget) {
        this.refundErrorTarget.textContent = this.phrase("refund_too_much", "Amount exceeds the remaining refundable balance.")
        this.refundErrorTarget.hidden = false
      }
      return
    }
    const { ok, payload } = await this.postJson(url, {
      payment_id: ctx.paymentId,
      amount_cents: cents,
      reason: this.refundNoteTarget?.value
    })
    if (!ok) {
      const message = Array.isArray(payload.errors) ? payload.errors.join(" ") : this.phrase("save_failed", "Save failed.")
      if (this.hasRefundErrorTarget) {
        this.refundErrorTarget.textContent = message
        this.refundErrorTarget.hidden = false
      }
      return
    }
    this.closeRefundModal()
    this.toastMessage(this.phrase("refund_recorded", "Refund recorded."))
    window.setTimeout(() => window.location.reload(), 600)
  }

  async resolvePending(event, path, messageKey, fallbackMessage) {
    const paymentId = event.currentTarget.dataset.paymentId
    if (!paymentId || !path) return
    const { ok, payload } = await this.postJson(path, { payment_id: paymentId })
    if (!ok) {
      this.toastMessage(Array.isArray(payload.errors) ? payload.errors.join(" ") : fallbackMessage)
      return
    }
    this.toastMessage(this.phrase(messageKey, fallbackMessage))
    window.setTimeout(() => window.location.reload(), 600)
  }

  toast(event) {
    const message = event?.currentTarget?.dataset?.message
    if (message) this.toastMessage(message)
  }

  toastMessage(message) {
    if (!this.hasToastTarget || !message) return
    this.toastTarget.textContent = message
    this.toastTarget.hidden = false
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toastTarget.hidden = true
    }, 3200)
  }
}
