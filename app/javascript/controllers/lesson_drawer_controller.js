import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]

  connect() {
    this.boundPointer = (event) => {
      if (!this.element.contains(event.target)) this.closeMenu()
    }
    document.addEventListener("mousedown", this.boundPointer)
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
  }

  toggleMenu(event) {
    event.preventDefault()
    event.stopPropagation()
    if (!this.hasMenuTarget) return
    this.menuTarget.classList.toggle("lessons-page__menu--hidden")
    event.currentTarget.setAttribute("aria-expanded", this.menuTarget.classList.contains("lessons-page__menu--hidden") ? "false" : "true")
  }

  closeMenu() {
    if (!this.hasMenuTarget) return
    this.menuTarget.classList.add("lessons-page__menu--hidden")
  }
}
