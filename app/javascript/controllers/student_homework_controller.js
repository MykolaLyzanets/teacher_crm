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
    "subject",
    "teacher",
    "filters",
    "filtersToggle",
    "card",
    "count",
    "list",
    "toast",
    "drawer",
    "drawerTitle",
    "drawerStatus",
    "drawerInstructions",
    "drawerFeedback",
    "drawerResponse",
    "drawerSubmit",
  ];

  connect() {
    this.tabValue = "todo";
    this.filter();
  }

  toggleFilters() {
    if (!this.hasFiltersTarget) return;
    const open = this.filtersTarget.classList.toggle("is-open");
    if (this.hasFiltersToggleTarget) {
      this.filtersToggleTarget.setAttribute("aria-expanded", String(open));
    }
  }

  setTab(event) {
    this.tabValue = event.currentTarget.dataset.tab;
    this.tabTargets.forEach((tab) => {
      const active = tab.dataset.tab === this.tabValue;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    if (this.hasEmptyTarget) {
      this.emptyTarget.id = `homework-panel-${this.tabValue}`;
      this.emptyTarget.setAttribute("aria-labelledby", `homework-tab-${this.tabValue}`);
    }
    this.filter();
  }

  filter() {
    const search = this.hasSearchTarget ? this.searchTarget.value.trim().toLowerCase() : "";
    const subject = this.hasSubjectTarget ? this.subjectTarget.value : "";
    const teacher = this.hasTeacherTarget ? this.teacherTarget.value : "";
    const due = this.hasDueTarget ? this.dueTarget.value : "";
    const searching = Boolean(search || subject || teacher || due);
    const counts = { todo: 0, submitted: 0, reviewed: 0 };
    let visible = 0;

    this.cardTargets.forEach((card) => {
      const tab = card.dataset.tab;
      const haystack = (card.dataset.search || "").toLowerCase();
      const matchSearch = !search || haystack.includes(search);
      const matchSubject = !subject || card.dataset.subject === subject;
      const matchTeacher = !teacher || card.dataset.teacher === teacher;
      const matchDue = !due || card.dataset.due === due;
      const matchTab = tab === this.tabValue;
      const show = matchSearch && matchSubject && matchTeacher && matchDue && matchTab;
      card.hidden = !show;
      if (matchSearch && matchSubject && matchTeacher && matchDue && counts[tab] !== undefined) {
        counts[tab] += 1;
      }
      if (show) visible += 1;
    });

    this.countTargets.forEach((node) => {
      node.textContent = String(counts[node.dataset.tab] || 0);
    });

    if (this.hasEmptyTarget) {
      this.emptyTarget.classList.toggle("is-hidden", visible > 0);
      if (this.hasEmptyTitleTarget) {
        this.emptyTitleTarget.textContent = searching
          ? this.emptyTitleTarget.dataset.search
          : this.emptyTitleTarget.dataset[this.tabValue];
      }
      if (this.hasEmptyTextTarget) {
        this.emptyTextTarget.hidden = searching || this.tabValue !== "todo";
      }
      if (this.hasEmptyIconTarget) this.emptyIconTarget.hidden = searching;
      if (this.hasSearchIconTarget) this.searchIconTarget.hidden = !searching;
    }
  }

  openDetails(event) {
    const card = event.currentTarget.closest("[data-student-homework-target='card']");
    if (!card || !this.hasDrawerTarget) return;
    this.drawerTitleTarget.textContent = card.dataset.title || "";
    this.drawerStatusTarget.textContent = card.dataset.status || "";
    this.drawerInstructionsTarget.textContent = card.dataset.instructions || "";
    this.drawerFeedbackTarget.textContent = card.dataset.feedback || "";
    this.drawerResponseTarget.value = card.dataset.response || "";
    this.activeCard = card;
    this.drawerTarget.classList.remove("sp-drawer--hidden");
  }

  closeDetails() {
    if (this.hasDrawerTarget) this.drawerTarget.classList.add("sp-drawer--hidden");
    this.activeCard = null;
  }

  submitWork() {
    this.showToast(this.drawerSubmitTarget?.dataset.message || "Submitted.");
    if (this.activeCard) {
      this.activeCard.dataset.tab = "submitted";
      this.activeCard.dataset.status = "submitted";
    }
    this.closeDetails();
    this.filter();
  }

  showToast(message) {
    if (!this.hasToastTarget) return;
    this.toastTarget.textContent = message;
    this.toastTarget.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastTarget.hidden = true;
    }, 3200);
  }
}
