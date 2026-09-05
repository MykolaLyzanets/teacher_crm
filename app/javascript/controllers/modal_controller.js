import { Controller } from "@hotwired/stimulus"
import { closeModal, openModal } from "../lib/modal"

export default class extends Controller {
  connect() {
    this.boundClose = () => this.close()
    if (!this.element.hasAttribute("hidden")) {
      this.open()
    }
  }

  disconnect() {
    closeModal(this.element)
  }

  open() {
    const focus = this.element.querySelector("[data-modal-focus]")
    openModal(this.element, { onClose: this.boundClose, focus })
  }

  close() {
    const dismiss = this.element.querySelector("[data-modal-dismiss]")
    if (dismiss) {
      closeModal(this.element)
      if (dismiss.tagName === "A") dismiss.click()
      return
    }
    closeModal(this.element)
  }
}
