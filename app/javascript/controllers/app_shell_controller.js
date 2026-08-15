import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["drawer"]

  open() {
    this.drawerTarget.hidden = false
    document.body.classList.add("nav-open")
  }

  close() {
    this.drawerTarget.hidden = true
    document.body.classList.remove("nav-open")
  }
}
