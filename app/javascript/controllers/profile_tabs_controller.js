import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tab", "panel"]

  connect() {
    const requested = new URLSearchParams(window.location.search).get("tab")
    if (!requested) return
    const match = this.tabTargets.find((tab) => tab.dataset.tab === requested)
    if (match) this.select({ currentTarget: match })
  }

  select(event) {
    const id = event.currentTarget.dataset.tab
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === id ? "true" : "false")
    })
    this.panelTargets.forEach((panel) => {
      panel.hidden = panel.dataset.tab !== id
    })
  }
}
