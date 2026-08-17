import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["trigger", "panel"];

  connect() {
    this.closeOnOutside = this.closeOnOutside.bind(this);
    this.closeOnEscape = this.closeOnEscape.bind(this);
    document.addEventListener("mousedown", this.closeOnOutside);
    document.addEventListener("keydown", this.closeOnEscape);
  }

  disconnect() {
    document.removeEventListener("mousedown", this.closeOnOutside);
    document.removeEventListener("keydown", this.closeOnEscape);
  }

  toggle() {
    const open = this.panelTarget.hidden;
    this.panelTarget.hidden = !open;
    this.triggerTarget.setAttribute("aria-expanded", open ? "true" : "false");
  }

  close() {
    this.panelTarget.hidden = true;
    this.triggerTarget.setAttribute("aria-expanded", "false");
  }

  closeOnOutside(event) {
    if (!this.element.contains(event.target)) this.close();
  }

  closeOnEscape(event) {
    if (event.key === "Escape") this.close();
  }
}
