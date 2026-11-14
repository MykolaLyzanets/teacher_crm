import { Controller } from "@hotwired/stimulus"
import { openModal } from "../lib/modal"

export default class extends Controller {
  static targets = ["tab", "row", "bulkBar", "bulkCount", "bulkSelect", "bulkConfirm", "bulkHint"]

  static values = {
    dialogUrl: String,
    assignUrl: String,
    restoreUrl: String,
    cancelUrl: String,
    cancelConfirm: String,
    rescheduleDialogUrl: String,
  }

  connect() {
    this.activeTab = "all"
    this.selected = new Set()
    this.keepOpenIfNeeded()
    if (this.rowTargets.length === 0) return

    this.applyFilter()
    this.syncBulk()
  }

  dismissWhenEmpty() {
    const page = this.element.closest(".teachers-page")
    const teachers = this.application.getControllerForElementAndIdentifier(page, "teachers")
    if (teachers?.closeAffectedLessons) {
      teachers.closeAffectedLessons()
    }
  }

  keepOpenIfNeeded() {
    const frame = document.getElementById("affected_lessons_dialog")
    if (frame?.dataset?.keepOpen !== "true") return
    this.showDialog()
  }

  showDialog() {
    this.element.classList.add("is-open")
    this.element.removeAttribute("hidden")
    openModal(this.element)
  }

  selectTab(event) {
    this.activeTab = event.currentTarget.dataset.tab || "all"
    this.tabTargets.forEach((button) => {
      const active = button.dataset.tab === this.activeTab
      button.classList.toggle("is-active", active)
      button.setAttribute("aria-selected", active ? "true" : "false")
    })
    this.applyFilter()
  }

  applyFilter() {
    this.rowTargets.forEach((row) => {
      const status = row.dataset.status
      const rawStatus = row.dataset.rawStatus
      let visible = false
      switch (this.activeTab) {
        case "all":
          visible = true
          break
        case "needs_replacement":
          visible = rawStatus === "needs_replacement" || status === "reschedule_required"
          break
        default:
          visible = status === this.activeTab
          break
      }
      row.hidden = !visible
    })
  }

  toggleRow(event) {
    const lessonId = event.currentTarget.dataset.lessonId
    if (!lessonId) return
    if (event.currentTarget.checked) {
      this.selected.add(lessonId)
    } else {
      this.selected.delete(lessonId)
    }
    this.syncBulk()
  }

  clearSelection() {
    this.selected.clear()
    this.element.querySelectorAll(".teachers-page__affected-check").forEach((input) => {
      input.checked = false
    })
    if (this.hasBulkSelectTarget) this.bulkSelectTarget.value = ""
    this.syncBulk()
  }

  syncBulk() {
    if (!this.hasBulkBarTarget) return
    const count = this.selected.size
    this.bulkBarTarget.hidden = count === 0
    if (this.hasBulkCountTarget) {
      this.bulkCountTarget.textContent = `${count} selected`
    }
    this.updateBulkControls()
  }

  bulkSelectChanged() {
    this.updateBulkControls()
  }

  updateBulkControls() {
    if (!this.hasBulkSelectTarget || !this.hasBulkConfirmTarget) return
    const substituteId = this.bulkSelectTarget.value
    const commonIds = this.commonCandidateIds()
    const hasCommon = commonIds.size > 0
    if (this.hasBulkHintTarget) {
      const showHint = this.selected.size > 0 && !hasCommon
      this.bulkHintTarget.hidden = !showHint
    }
    if (substituteId && commonIds.has(substituteId)) {
      this.bulkConfirmTarget.disabled = false
      return
    }
    this.bulkConfirmTarget.disabled = true
  }

  commonCandidateIds() {
    const rows = this.selectedRows()
    if (rows.length === 0) return new Set()

    let shared = null
    rows.forEach((row) => {
      const ids = (row.dataset.candidateIds || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
      const current = new Set(ids)
      if (shared === null) {
        shared = current
        return
      }
      shared = new Set([...shared].filter((id) => current.has(id)))
    })
    return shared || new Set()
  }

  selectedRows() {
    return this.rowTargets.filter((row) => this.selected.has(row.dataset.lessonId))
  }

  bulkAssign() {
    const substituteId = this.hasBulkSelectTarget ? this.bulkSelectTarget.value : ""
    if (!substituteId) return
    const lessonIds = [...this.selected]
    const promises = lessonIds.map((lessonId) =>
      this.patchAction(this.assignUrlValue, {
        lesson_id: lessonId,
        substitute_teacher_id: substituteId,
      })
    )
    Promise.all(promises)
      .then((results) => {
        const failed = results.find((data) => !data?.ok)
        if (failed) throw new Error(failed.message || "assign failed")
        this.clearSelection()
        this.reloadDialog()
      })
      .catch((error) => window.alert(error.message))
  }

  assign(event) {
    const select = event.currentTarget
    const lessonId = select.dataset.lessonId
    const substituteId = select.value
    if (!lessonId || !substituteId) return

    this.patchAction(this.assignUrlValue, { lesson_id: lessonId, substitute_teacher_id: substituteId })
      .then((data) => {
        if (!data?.ok) throw new Error(data?.message || "assign failed")
        select.value = ""
        this.reloadDialog()
      })
      .catch((error) => {
        window.alert(error.message)
        select.value = ""
      })
  }

  cancel(event) {
    const lessonId = event.currentTarget.dataset.lessonId
    if (!lessonId) return

    const message = this.cancelConfirmValue || "Cancel this lesson?"
    if (!window.confirm(message)) return

    this.patchAction(this.cancelUrlValue, { lesson_id: lessonId })
      .then((data) => {
        if (!data?.ok) throw new Error(data?.message || "cancel failed")
        this.reloadDialog()
      })
      .catch((error) => window.alert(error.message))
  }

  restore(event) {
    const lessonId = event.currentTarget.dataset.lessonId
    if (!lessonId) return

    this.patchAction(this.restoreUrlValue, { lesson_id: lessonId })
      .then((data) => {
        if (!data?.ok) throw new Error(data?.message || "restore failed")
        this.reloadDialog()
      })
      .catch((error) => window.alert(error.message))
  }

  reschedule(event) {
    const lessonId = event.currentTarget.dataset.lessonId
    if (!lessonId) return

    const frame = document.getElementById("affected_lesson_reschedule")
    if (!frame) return

    const url = this.rescheduleDialogUrlValue.replace("__LESSON__", encodeURIComponent(lessonId))
    frame.src = `${url}?t=${Date.now()}`
  }

  reloadDialog() {
    const frame = document.getElementById("affected_lessons_dialog")
    if (!frame) return
    frame.dataset.keepOpen = "true"
    frame.src = `${this.dialogUrlValue}?t=${Date.now()}`
  }

  patchAction(url, body) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content
    return fetch(url, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {}),
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    }).then((response) => response.json())
  }
}
