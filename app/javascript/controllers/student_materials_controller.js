import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "filters",
    "filtersToggle",
    "viewBtn",
    "library",
    "empty",
    "emptyTitle",
    "emptyText",
    "clearFilters",
    "search",
    "type",
    "subject",
    "teacher",
    "sort",
    "card",
    "group",
    "drawer",
    "drawerTitle",
    "drawerMeta",
    "drawerSource",
    "drawerDescription",
    "drawerLink",
  ];

  connect() {
    const compact = window.matchMedia("(max-width: 767px)").matches;
    this.setViewMode(compact ? "list" : "grid");
    this.filter();
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
    if (this.hasLibraryTarget) this.libraryTarget.dataset.view = view;
  }

  syncMobileSort(event) {
    if (this.hasSortTarget) this.sortTarget.value = event.currentTarget.value;
    this.filter();
  }

  clearFilters() {
    if (this.hasSearchTarget) this.searchTarget.value = "";
    if (this.hasTypeTarget) this.typeTarget.value = "";
    if (this.hasSubjectTarget) this.subjectTarget.value = "";
    if (this.hasTeacherTarget) this.teacherTarget.value = "";
    this.filter();
  }

  filter() {
    const search = this.hasSearchTarget ? this.searchTarget.value.trim().toLowerCase() : "";
    const type = this.hasTypeTarget ? this.typeTarget.value : "";
    const subject = this.hasSubjectTarget ? this.subjectTarget.value : "";
    const teacher = this.hasTeacherTarget ? this.teacherTarget.value : "";
    const sort = this.hasSortTarget ? this.sortTarget.value : "newest";
    const filtering = Boolean(search || type || subject || teacher);
    let visible = 0;

    this.cardTargets.forEach((card) => {
      const haystack = (card.dataset.search || "").toLowerCase();
      const show =
        (!search || haystack.includes(search)) &&
        (!type || card.dataset.type === type) &&
        (!subject || card.dataset.subject === subject) &&
        (!teacher || card.dataset.teacher === teacher);
      card.hidden = !show;
      if (show) visible += 1;
    });

    this.groupTargets.forEach((group) => {
      const any = [...group.querySelectorAll("[data-student-materials-target='card']")].some(
        (card) => !card.hidden
      );
      group.hidden = !any;
    });

    this.sortCards(sort);

    const hasLibrary = this.cardTargets.length > 0;
    if (this.hasEmptyTarget) {
      this.emptyTarget.classList.toggle("is-hidden", visible > 0);
      if (this.hasEmptyTitleTarget) {
        this.emptyTitleTarget.textContent = filtering
          ? this.emptyTitleTarget.dataset.filter
          : this.emptyTitleTarget.dataset.none;
      }
      if (this.hasEmptyTextTarget) this.emptyTextTarget.hidden = filtering;
      if (this.hasClearFiltersTarget) this.clearFiltersTarget.hidden = !filtering;
    }
    if (this.hasLibraryTarget) this.libraryTarget.classList.toggle("is-hidden", !hasLibrary || visible === 0);
  }

  sortCards(sort) {
    this.groupTargets.forEach((group) => {
      ["grid", "list"].forEach((view) => {
        const container = group.querySelector(view === "grid" ? ".sp-mat-grid" : ".sp-mat-list");
        if (!container) return;
        const cards = [...container.querySelectorAll("[data-student-materials-target='card']")];
        cards.sort((a, b) => {
          if (sort === "name") return (a.dataset.name || "").localeCompare(b.dataset.name || "");
          const aTime = a.dataset.shared || "";
          const bTime = b.dataset.shared || "";
          return sort === "oldest" ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime);
        });
        cards.forEach((card) => container.append(card));
      });
    });
  }

  openDetails(event) {
    const card = event.currentTarget.closest("[data-student-materials-target='card']");
    if (!card || !this.hasDrawerTarget) return;
    this.drawerTitleTarget.textContent = card.dataset.name || "";
    this.drawerMetaTarget.textContent = card.querySelector(".sp-mat-card__meta, .sp-mat-row__meta")?.textContent || "";
    this.drawerSourceTarget.textContent = card.dataset.source || "";
    this.drawerDescriptionTarget.textContent = card.dataset.description || "";
    if (this.hasDrawerLinkTarget) {
      const url = card.dataset.url;
      this.drawerLinkTarget.hidden = !url;
      this.drawerLinkTarget.href = url || "#";
    }
    this.drawerTarget.classList.remove("sp-drawer--hidden");
  }

  closeDetails() {
    if (this.hasDrawerTarget) this.drawerTarget.classList.add("sp-drawer--hidden");
  }
}
