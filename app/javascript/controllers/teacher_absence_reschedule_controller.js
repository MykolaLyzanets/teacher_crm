import { Controller } from "@hotwired/stimulus"
import { closeModal, openModal } from "../lib/modal"

export default class extends Controller {
  static targets = ["date", "startTime", "endTime", "teacher", "hint", "error", "confirm"]

  static values = {
    submitUrl: String,
    checkUrl: String,
    dialogUrl: String,
  }

  connect() {
    this.element.classList.add("is-open")
    openModal(this.element, { onClose: () => this.close() })
    this.checkTimer = null
    this.scheduleChanged()
  }

  disconnect() {
    this.clearCheckTimer()
  }

  close(event) {
    if (event) event.preventDefault()
    this.element.classList.remove("is-open")
    closeModal(this.element)
    const frame = document.getElementById("affected_lesson_reschedule")
    if (frame) {
      frame.removeAttribute("src")
      frame.innerHTML = ""
    }
    this.restoreParentOverflow()
  }

  scheduleChanged() {
    this.clearError()
    this.clearCheckTimer()
    this.checkTimer = window.setTimeout(() => this.fetchCheck(), 200)
  }

  fetchCheck() {
    const params = this.formParams()
    if (!params.teacher_id || !params.date || !params.start_time || !params.end_time) {
      this.hideHint()
      return
    }

    const url = new URL(this.checkUrlValue, window.location.origin)
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

    fetch(url.toString(), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => this.renderHint(data))
      .catch(() => this.hideHint())
  }

  renderHint(data) {
    if (!this.hasHintTarget || !data?.message) {
      this.hideHint()
      return
    }

    this.hintTarget.hidden = false
    this.hintTarget.textContent = data.message
    this.hintTarget.classList.toggle("is-warning", data.kind !== "available")
    this.hintTarget.classList.toggle("is-ok", data.kind === "available")
  }

  hideHint() {
    if (!this.hasHintTarget) return
    this.hintTarget.hidden = true
    this.hintTarget.textContent = ""
    this.hintTarget.classList.remove("is-warning", "is-ok")
  }

  confirm() {
    if (!this.hasConfirmTarget) return
    this.confirmTarget.disabled = true
    this.clearError()

    const token = document.querySelector('meta[name="csrf-token"]')?.content
    const body = this.formParams()

    fetch(this.submitUrlValue, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {}),
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.ok) throw new Error(data?.message || "reschedule failed")
        this.close()
        this.reloadAffectedDialog()
      })
      .catch((error) => {
        this.showError(error.message)
        this.confirmTarget.disabled = false
      })
  }

  reloadAffectedDialog() {
    const frame = document.getElementById("affected_lessons_dialog")
    if (!frame || !this.dialogUrlValue) return
    frame.dataset.keepOpen = "true"
    frame.src = `${this.dialogUrlValue}?t=${Date.now()}`
  }

  formParams() {
    return {
      date: this.dateTarget.value,
      start_time: this.startTimeTarget.value,
      end_time: this.endTimeTarget.value,
      teacher_id: this.teacherTarget.value,
    }
  }

  showError(message) {
    if (!this.hasErrorTarget) return
    this.errorTarget.hidden = false
    this.errorTarget.textContent = message
  }

  clearError() {
    if (!this.hasErrorTarget) return
    this.errorTarget.hidden = true
    this.errorTarget.textContent = ""
  }

  clearCheckTimer() {
    if (this.checkTimer) {
      window.clearTimeout(this.checkTimer)
      this.checkTimer = null
    }
  }

  restoreParentOverflow() {
    const main = document.getElementById("teacher-affected-lessons-dialog")
    if (main?.classList.contains("is-open")) {
      openModal(main)
    }
  }
}
