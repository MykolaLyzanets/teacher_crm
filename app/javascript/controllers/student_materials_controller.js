import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["filters", "filtersToggle", "viewBtn", "library", "empty"];

  connect() {
    const compact = window.matchMedia("(max-width: 767px)").matches;
    this.setViewMode(compact ? "list" : "grid");
  }

  toggleFilters() {
    const open = this.filtersTarget.classList.toggle("is-open");
    this.filtersToggleTarget.setAttribute("aria-expanded", String(open));
  }

  setView(event) {
    this.setViewMode(event.currentTarget.dataset.view);
  }

  setViewMode(view) {
    this.viewBtnTargets.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (this.hasLibraryTarget) {
      this.libraryTarget.dataset.view = view;
    }
  }
}
