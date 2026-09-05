import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "panel"]

  connect() {
    this.boundPointer = this.onPointer.bind(this)
    this.boundKey = this.onKey.bind(this)
    document.addEventListener("mousedown", this.boundPointer)
    document.addEventListener("keydown", this.boundKey)
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    document.removeEventListener("keydown", this.boundKey)
  }

  toggle() {
    const open = this.panelTarget.hidden
    this.panelTarget.hidden = !open
    this.buttonTarget.setAttribute("aria-expanded", open ? "true" : "false")
  }

  close() {
    if (!this.hasPanelTarget || this.panelTarget.hidden) return
    this.panelTarget.hidden = true
    this.buttonTarget.setAttribute("aria-expanded", "false")
  }

  onPointer(event) {
    if (this.element.contains(event.target)) return
    this.close()
  }

  onKey(event) {
    if (event.key === "Escape") this.close()
  }
}
