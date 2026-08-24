import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["root", "button", "panel"]

  connect() {
    this.bound = this.onPointer.bind(this)
    document.addEventListener("mousedown", this.bound)
  }

  disconnect() {
    document.removeEventListener("mousedown", this.bound)
  }

  toggle() {
    const open = this.panelTarget.hidden
    this.panelTarget.hidden = !open
    this.buttonTarget.setAttribute("aria-expanded", open ? "true" : "false")
  }

  onPointer(event) {
    if (this.panelTarget.hidden) return
    if (this.rootTarget.contains(event.target)) return
    this.panelTarget.hidden = true
    this.buttonTarget.setAttribute("aria-expanded", "false")
  }
}
