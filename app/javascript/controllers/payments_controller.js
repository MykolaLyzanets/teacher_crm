import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "tab", "panel", "toast", "from", "to", "type", "status", "student", "currency",
    "row", "empty", "paymentDialog", "payoutDialog", "amount", "payDate", "method",
    "reference", "note", "payoutAmount", "payoutDate", "payoutMethod", "payoutNote",
    "payoutRemaining"
  ]

  selectTab(event) {
    const id = event.currentTarget.dataset.tab
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === id ? "true" : "false")
    })
    this.panelTargets.forEach((panel) => {
      panel.hidden = panel.dataset.tab !== id
    })
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
      const matchStudent = student === "all" || row.dataset.party === student
      const matchCurrency = currency === "all" || row.dataset.currency === currency
      const show = matchDate && matchType && matchStatus && matchStudent && matchCurrency
      row.hidden = !show
      if (show) visible += 1
    })
    if (this.hasEmptyTarget) this.emptyTarget.hidden = visible > 0
  }

  openPayment() {
    if (this.hasPayDateTarget) this.payDateTarget.value = new Date().toISOString().slice(0, 10)
    if (this.hasPaymentDialogTarget) this.paymentDialogTarget.hidden = false
  }

  openPayout(event) {
    const remaining = Number(event.currentTarget.dataset.remaining || 0)
    const currency = event.currentTarget.dataset.currency || "EUR"
    if (this.hasPayoutAmountTarget) this.payoutAmountTarget.value = remaining > 0 ? remaining / 100 : ""
    if (this.hasPayoutDateTarget) this.payoutDateTarget.value = new Date().toISOString().slice(0, 10)
    if (this.hasPayoutRemainingTarget) this.payoutRemainingTarget.textContent = event.currentTarget.dataset.message || `${currency} ${remaining / 100}`
    if (this.hasPayoutDialogTarget) this.payoutDialogTarget.hidden = false
  }

  closeDialogs() {
    if (this.hasPaymentDialogTarget) this.paymentDialogTarget.hidden = true
    if (this.hasPayoutDialogTarget) this.payoutDialogTarget.hidden = true
  }

  savePayment() {
    this.closeDialogs()
    this.toast({ currentTarget: { dataset: { message: this.element.dataset.paymentAdded || "Payment recorded." } } })
  }

  savePayout() {
    this.closeDialogs()
    this.toast({ currentTarget: { dataset: { message: this.element.dataset.payoutRecorded || "Payout recorded." } } })
  }

  toast(event) {
    if (!this.hasToastTarget) return
    this.toastTarget.textContent = event.currentTarget.dataset.message || ""
    this.toastTarget.hidden = false
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.toastTarget.hidden = true
    }, 3200)
  }
}
