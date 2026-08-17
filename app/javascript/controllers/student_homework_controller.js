import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "tab",
    "empty",
    "emptyTitle",
    "emptyText",
    "emptyIcon",
    "searchIcon",
    "search",
    "due",
    "filters",
    "filtersToggle",
  ];

  connect() {
    this.tabValue = "todo";
    this.syncEmpty();
  }

  toggleFilters() {
    const open = this.filtersTarget.classList.toggle("is-open");
    this.filtersToggleTarget.setAttribute("aria-expanded", String(open));
  }

  setTab(event) {
    this.tabValue = event.currentTarget.dataset.tab;
    this.tabTargets.forEach((tab) => {
      const active = tab.dataset.tab === this.tabValue;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    this.emptyTarget.id = `homework-panel-${this.tabValue}`;
    this.emptyTarget.setAttribute(
      "aria-labelledby",
      `homework-tab-${this.tabValue}`
    );
    this.syncEmpty();
  }

  syncEmpty() {
    const searching = Boolean(
      this.searchTarget.value.trim() || (this.hasDueTarget && this.dueTarget.value)
    );
    const title = this.emptyTitleTarget;
    title.textContent = searching
      ? title.dataset.search
      : title.dataset[this.tabValue];
    this.emptyTextTarget.hidden = searching || this.tabValue !== "todo";
    this.emptyIconTarget.hidden = searching;
    this.searchIconTarget.hidden = !searching;
  }
}
