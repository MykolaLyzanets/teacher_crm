import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["filter", "attention", "toast"]

  filter(event) {
    const id = event.currentTarget.dataset.filter
    this.filterTargets.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.filter === id)
    })
    this.attentionTargets.forEach((item) => {
      item.hidden = id !== "all" && item.dataset.category !== id
    })
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
