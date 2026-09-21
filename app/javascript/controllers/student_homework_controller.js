import { Controller } from "@hotwired/stimulus";

const EDITABLE_FACING = new Set(["assigned", "in_progress", "overdue", "resubmission_requested"]);

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
    "drawerBadgeWrap",
    "drawerBadge",
    "drawerTitle",
    "drawerSubtitle",
    "drawerMeta",
    "drawerInstructionsSection",
    "drawerInstructions",
    "drawerMaterialsList",
    "drawerMaterialsEmpty",
    "drawerLessonSection",
    "drawerLessonTitle",
    "drawerLessonFacts",
    "drawerFeedbackSection",
    "drawerFeedbackTitle",
    "drawerFeedback",
    "drawerResubmissionDue",
    "drawerReviewMeta",
    "drawerReviewedSection",
    "drawerScore",
    "drawerReviewedFeedback",
    "drawerReviewedMeta",
    "drawerEditableSection",
    "drawerResponse",
    "drawerLateNotice",
    "drawerSaveStatus",
    "drawerFootConfirm",
    "drawerFootDefault",
    "drawerReadonlySection",
    "drawerSubmittedBanner",
    "drawerReadonlyAnswer",
    "drawerReadonlyText",
    "drawerNoSubmission",
    "drawerFootActions",
    "drawerSaveDraft",
    "drawerSubmit",
    "todoStat",
    "submittedStat",
    "attentionStat",
    "scratchCard",
  ];

  static values = {
    assignmentUrl: { type: String, default: "/student/homework/assignments/:id" },
    responseUrl: { type: String, default: "/homework_responses/:id" },
    submitUrl: { type: String, default: "/homework_responses/:id/submit" },
    labels: { type: Object, default: {} },
  };

  connect() {
    this.tabValue = "todo";
    this.activeItem = null;
    this.filter();
  }

  get strings() {
    return this.labelsValue || {};
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

  async openFromLessonHomework(event) {
    const raw = event.currentTarget.dataset.homeworkItem;
    if (!raw || !this.hasScratchCardTarget || !this.hasDrawerTarget) return;
    let item;
    try {
      item = JSON.parse(raw);
    } catch (_) {
      return;
    }
    const card = this.scratchCardTarget;
    this.syncCardFromPortalItem(card, item);
    this.activeCard = card;
    await this.refreshAssignmentAndOpen();
  }

  async openDetails(event) {
    const card = event.currentTarget.closest("[data-student-homework-target='card']");
    if (!card || !this.hasDrawerTarget) return;
    this.activeCard = card;
    this.activeItem = this.parsePortalItem(card);
    await this.refreshAssignmentAndOpen();
  }

  async refreshAssignmentAndOpen() {
    try {
      const data = await this.fetchAssignment(this.activeCard.dataset.homeworkStudentId);
      if (data.item) {
        this.activeItem = data.item;
        this.applyCardPayload(this.activeCard, data.item);
      }
      if (data.summary) this.refreshSummary(data.summary);
    } catch (_) {
      /* use card payload */
    }
    if (!this.activeItem) this.activeItem = this.parsePortalItem(this.activeCard);
    this.renderDrawer(this.activeItem);
    this.drawerTarget.classList.remove("sp-drawer--hidden");
  }

  closeDetails() {
    if (this.hasDrawerTarget) this.drawerTarget.classList.add("sp-drawer--hidden");
    this.activeCard = null;
    this.activeItem = null;
    this.hideFootConfirm();
    this.setSaveStatus("");
  }

  async saveDraft() {
    if (!this.activeCard || !this.activeItem?.editable) return;
    const responseId = this.activeCard.dataset.homeworkResponseId;
    const text = this.hasDrawerResponseTarget ? this.drawerResponseTarget.value : "";
    this.setSaveStatus("saving");
    try {
      await this.patchDraft(responseId, text);
      this.setSaveStatus("saved");
      this.showToast(this.strings.draftSaved || "Saved.");
    } catch (error) {
      this.setSaveStatus("error");
      this.showToast(error.message);
    }
  }

  requestSubmit() {
    this.syncActiveItem();
    if (!this.isEditable()) {
      this.showToast(this.strings.notEditable || "You cannot edit this submission.");
      return;
    }
    const late = this.latePolicy(this.activeItem);
    if (!late.allowed) {
      this.showToast(late.message);
      return;
    }
    const text = this.hasDrawerResponseTarget ? this.drawerResponseTarget.value.trim() : "";
    if (!text) {
      this.showToast(this.strings.answerRequired || "Please enter your answer.");
      if (this.hasDrawerResponseTarget) this.drawerResponseTarget.focus();
      return;
    }
    this.showFootConfirm();
  }

  cancelConfirm() {
    this.hideFootConfirm();
  }

  async confirmSubmit() {
    if (!this.activeCard) return;
    this.syncActiveItem();
    const responseId = this.activeCard.dataset.homeworkResponseId;
    if (!responseId) {
      this.showToast(this.strings.submitFailed || "Could not submit. Try again.");
      return;
    }
    const text = this.hasDrawerResponseTarget ? this.drawerResponseTarget.value.trim() : "";
    if (!text) {
      this.showToast(this.strings.answerRequired || "Please enter your answer.");
      return;
    }
    this.hideFootConfirm();
    try {
      await this.patchSubmit(responseId, text);
      this.showToast(this.strings.submittedToast || "Submitted.");
      this.closeDetails();
      this.filter();
    } catch (error) {
      this.showToast(error.message);
    }
  }

  syncActiveItem() {
    if (this.activeItem) return;
    if (this.activeCard) this.activeItem = this.parsePortalItem(this.activeCard);
  }

  isEditable() {
    const item = this.activeItem || (this.activeCard ? this.parsePortalItem(this.activeCard) : null);
    if (!item) return false;
    if (typeof item.editable === "boolean") return item.editable;
    return EDITABLE_FACING.has(item.facing);
  }

  showFootConfirm() {
    if (this.hasDrawerFootConfirmTarget) this.drawerFootConfirmTarget.hidden = false;
    if (this.hasDrawerFootDefaultTarget) this.drawerFootDefaultTarget.hidden = true;
  }

  hideFootConfirm() {
    if (this.hasDrawerFootConfirmTarget) this.drawerFootConfirmTarget.hidden = true;
    if (this.hasDrawerFootDefaultTarget) this.drawerFootDefaultTarget.hidden = false;
  }

  renderDrawer(item) {
    if (!item) return;
    const facing = item.facing || "";
    const tone = item.facingTone || "neutral";
    const editable = Boolean(item.editable);

    if (this.hasDrawerBadgeTarget) {
      this.drawerBadgeTarget.className = `status-badge status-badge--${tone}`;
      this.drawerBadgeTarget.textContent = item.facingLabel || facing;
    }
    if (this.hasDrawerTitleTarget) this.drawerTitleTarget.textContent = item.title || "";
    if (this.hasDrawerSubtitleTarget) {
      this.drawerSubtitleTarget.textContent = [item.subject, item.teacher].filter(Boolean).join(" · ");
    }

    this.renderMeta(item);

    const instructions = (item.instructions || "").trim();
    if (this.hasDrawerInstructionsSectionTarget) {
      this.drawerInstructionsSectionTarget.hidden = !instructions;
    }
    if (this.hasDrawerInstructionsTarget) this.drawerInstructionsTarget.textContent = instructions;

    this.renderMaterials(item);

    const lesson = item.lesson;
    if (this.hasDrawerLessonSectionTarget) this.drawerLessonSectionTarget.hidden = !lesson;
    if (lesson) {
      if (this.hasDrawerLessonTitleTarget) this.drawerLessonTitleTarget.textContent = lesson.title || "";
      if (this.hasDrawerLessonFactsTarget) {
        this.drawerLessonFactsTarget.replaceChildren(
          this.factRow("calendar", this.formatLessonAgendaDate(lesson.date)),
          this.factRow("clock", this.formatTimeRange(lesson.startTime, lesson.endTime)),
          this.factRow("user", lesson.teacher || item.teacher || "")
        );
      }
    }

    const showFeedbackBanner = facing === "resubmission_requested" || Boolean(item.feedback);
    if (this.hasDrawerFeedbackSectionTarget) {
      this.drawerFeedbackSectionTarget.hidden = !showFeedbackBanner || facing === "reviewed";
    }
    if (showFeedbackBanner && facing !== "reviewed") {
      if (this.hasDrawerFeedbackTitleTarget) {
        this.drawerFeedbackTitleTarget.textContent = facing === "resubmission_requested"
          ? (this.strings.changesRequested || "")
          : (this.strings.teacherFeedback || "");
      }
      if (this.hasDrawerFeedbackTarget) this.drawerFeedbackTarget.textContent = item.feedback || "";
      if (this.hasDrawerResubmissionDueTarget) {
        const due = item.resubmissionDueDate;
        this.drawerResubmissionDueTarget.hidden = !due;
        if (due) {
          this.drawerResubmissionDueTarget.textContent = `${this.strings.newDueDate || ""} ${this.formatPortalDate(due)}`;
        }
      }
      if (this.hasDrawerReviewMetaTarget) {
        const meta = [item.reviewedBy, this.formatDateTime(item.reviewedAt)].filter(Boolean).join(" · ");
        this.drawerReviewMetaTarget.hidden = !meta;
        this.drawerReviewMetaTarget.textContent = meta;
      }
    }

    const reviewed = facing === "reviewed";
    if (this.hasDrawerReviewedSectionTarget) this.drawerReviewedSectionTarget.hidden = !reviewed;
    if (reviewed) {
      if (this.hasDrawerScoreTarget) {
        this.drawerScoreTarget.hidden = !item.score;
        this.drawerScoreTarget.textContent = item.score
          ? `${this.strings.score || "Score"} ${item.score}`
          : "";
      }
      if (this.hasDrawerReviewedFeedbackTarget) {
        this.drawerReviewedFeedbackTarget.textContent = item.feedback || (this.strings.noWrittenFeedback || "");
      }
      if (this.hasDrawerReviewedMetaTarget) {
        this.drawerReviewedMetaTarget.textContent = [item.reviewedBy, this.formatDateTime(item.reviewedAt)]
          .filter(Boolean)
          .join(" · ");
      }
    }

    if (this.hasDrawerEditableSectionTarget) this.drawerEditableSectionTarget.hidden = !editable;
    if (this.hasDrawerReadonlySectionTarget) {
      this.drawerReadonlySectionTarget.hidden = editable || reviewed;
    }
    if (this.hasDrawerFootActionsTarget) this.drawerFootActionsTarget.hidden = !editable;

    if (editable) {
      if (this.hasDrawerResponseTarget) this.drawerResponseTarget.value = item.writtenResponse || "";
      const late = this.latePolicy(item);
      if (this.hasDrawerLateNoticeTarget) {
        this.drawerLateNoticeTarget.hidden = !late.overdue;
        this.drawerLateNoticeTarget.className = `sp-hw-drawer__late${late.allowed ? " is-warn" : " is-blocked"}`;
        this.drawerLateNoticeTarget.textContent = late.message || "";
      }
      if (this.hasDrawerSubmitTarget) this.drawerSubmitTarget.disabled = !late.allowed;
      this.hideFootConfirm();
      this.setSaveStatus("");
    } else if (!reviewed) {
      const submittedAt = item.submittedAt;
      const response = (item.writtenResponse || "").trim();
      if (this.hasDrawerSubmittedBannerTarget) {
        this.drawerSubmittedBannerTarget.hidden = !submittedAt;
        if (submittedAt) {
          this.drawerSubmittedBannerTarget.textContent = `${this.strings.submittedBanner || ""} ${this.formatDateTime(submittedAt)}`;
        }
      }
      if (this.hasDrawerReadonlyAnswerTarget) this.drawerReadonlyAnswerTarget.hidden = !response;
      if (this.hasDrawerReadonlyTextTarget) this.drawerReadonlyTextTarget.textContent = response;
      if (this.hasDrawerNoSubmissionTarget) {
        this.drawerNoSubmissionTarget.hidden = Boolean(submittedAt || response);
      }
    }
  }

  renderMeta(item) {
    if (!this.hasDrawerMetaTarget) return;
    const lesson = item.lesson;
    const rows = [];
    if (lesson?.title) {
      rows.push(this.metaLine(this.strings.relatedLessonPrefix || "", `${lesson.title} · ${this.formatPortalDate(lesson.date)}`));
    }
    rows.push(this.metaLine(this.strings.assigned || "", this.formatPortalDate(item.assignedDate)));
    const dueUrgent = item.dueContext?.urgent;
    const dueText = `${this.formatPortalDate(item.dueDisplayDate || item.dueDate)}${dueUrgent && item.dueContext?.label_key ? ` · ${this.dueContextLabel(item.dueContext)}` : ""}`;
    rows.push(this.metaLine(this.strings.due || "", dueText, dueUrgent));
    if (item.submittedAt) {
      rows.push(this.metaLine(this.strings.submitted || "", this.formatDateTime(item.submittedAt)));
    }
    this.drawerMetaTarget.replaceChildren(...rows);
  }

  metaLine(label, value, urgent = false) {
    const row = document.createElement("p");
    row.className = "sp-hw-drawer__meta-row";
    const labelNode = document.createElement("span");
    labelNode.textContent = `${label} `;
    const valueNode = document.createElement("span");
    valueNode.className = `sp-hw-drawer__meta-value${urgent ? " is-urgent" : ""}`;
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    return row;
  }

  factRow(icon, text) {
    const row = document.createElement("p");
    row.className = "sp-hw-drawer__lesson-fact";
    row.textContent = text;
    row.dataset.icon = icon;
    return row;
  }

  renderMaterials(item) {
    const materials = Array.isArray(item.materials) ? item.materials : [];
    const ids = Array.isArray(item.materialIds) ? item.materialIds : [];
    const hasMaterials = materials.length > 0 || ids.length > 0;
    if (this.hasDrawerMaterialsEmptyTarget) this.drawerMaterialsEmptyTarget.hidden = hasMaterials;
    if (!this.hasDrawerMaterialsListTarget) return;
    if (!hasMaterials) {
      this.drawerMaterialsListTarget.replaceChildren();
      return;
    }
    const nodes = materials.length
      ? materials.map((mat) => {
          const li = document.createElement("li");
          li.textContent = mat.title || mat.name || mat.id;
          return li;
        })
      : ids.map((id) => {
          const li = document.createElement("li");
          li.textContent = id;
          return li;
        });
    this.drawerMaterialsListTarget.replaceChildren(...nodes);
  }

  latePolicy(item) {
    const overdue = item.facing === "overdue" || item.dueContext?.overdue;
    if (!overdue) return { overdue: false, allowed: true, message: "" };
    if (item.allowLateSubmission === false) {
      return {
        overdue: true,
        allowed: false,
        message: this.strings.lateBlocked || "The submission deadline has passed.",
      };
    }
    return {
      overdue: true,
      allowed: true,
      message: this.strings.lateWarning || "Your submission will be marked as late.",
    };
  }

  dueContextLabel(due) {
    const key = due.label_key;
    const count = due.count;
    if (key === "overdue_days") return this.interpolate(this.pluralOverdue(count), { count });
    if (key === "due_today") return this.strings.dueToday || "Due today";
    if (key === "due_tomorrow") return this.strings.dueTomorrow || "Due tomorrow";
    if (key === "due_in_days") return this.interpolate(this.strings.dueInDays || "Due in %{count} days", { count });
    return "";
  }

  pluralOverdue(count) {
    return count === 1
      ? (this.strings.overdueOne || "Overdue by 1 day")
      : (this.strings.overdueOther || "Overdue by %{count} days");
  }

  formatPortalDate(dateKey) {
    if (!dateKey) return "";
    const date = new Date(`${String(dateKey).slice(0, 10)}T12:00:00`);
    const months = this.strings.monthsShort || [];
    const weekdays = this.strings.weekdaysFull || [];
    const weekday = weekdays[(date.getDay() + 6) % 7] || "";
    const month = months[date.getMonth()] || "";
    if (this.strings.locale === "en") {
      return `${weekday}, ${month} ${date.getDate()}`;
    }
    return `${date.getDate()} ${month}`;
  }

  formatLessonAgendaDate(dateKey) {
    return this.formatPortalDate(dateKey);
  }

  formatDateTime(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${this.formatPortalDate(iso.slice(0, 10))} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  formatTimeRange(start, end) {
    return [start, end].filter(Boolean).join(" – ");
  }

  interpolate(template, vars) {
    return String(template || "").replace(/%\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
  }

  parsePortalItem(card) {
    const raw = card?.dataset?.portalItem;
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (_) {
        /* fall through */
      }
    }
    return {
      title: card.dataset.title,
      subject: card.dataset.subject,
      teacher: card.dataset.teacher,
      facing: card.dataset.facing,
      facingLabel: card.dataset.facingLabel,
      facingTone: card.dataset.facingTone,
      instructions: card.dataset.instructions,
      feedback: card.dataset.feedback,
      score: card.dataset.score,
      writtenResponse: card.dataset.response,
      homeworkStudentId: card.dataset.homeworkStudentId,
      homeworkResponseId: card.dataset.homeworkResponseId,
      action: card.dataset.portalAction,
      editable: EDITABLE_FACING.has(card.dataset.facing),
    };
  }

  syncCardFromPortalItem(card, item) {
    const data = item || {};
    card.dataset.tab = data.tab || "";
    card.dataset.subject = data.subject || "";
    card.dataset.teacher = data.teacher || "";
    card.dataset.due = data.dueBucket || "";
    card.dataset.search = [data.title, data.subject, data.teacher, data.instructions].filter(Boolean).join(" ");
    card.dataset.id = data.id || "";
    card.dataset.homeworkStudentId = data.homeworkStudentId || "";
    card.dataset.homeworkResponseId = data.homeworkResponseId || "";
    card.dataset.title = data.title || "";
    card.dataset.facing = data.facing || "";
    card.dataset.facingLabel = data.facingLabel || "";
    card.dataset.facingTone = data.facingTone || "";
    card.dataset.portalAction = data.action || "";
    card.dataset.instructions = data.instructions || "";
    card.dataset.feedback = data.feedback || "";
    card.dataset.score = data.score || "";
    card.dataset.response = data.writtenResponse || "";
    card.dataset.portalItem = JSON.stringify(data);
  }

  applyCardPayload(card, item) {
    this.syncCardFromPortalItem(card, item);
    const data = item || {};
    const badge = card.querySelector(".status-badge");
    if (badge && data.facing) {
      const tone = data.facingTone || "neutral";
      badge.className = `status-badge status-badge--${tone}`;
      badge.textContent = data.facingLabel || data.facing;
    }
  }

  refreshSummary(summary) {
    if (!summary) return;
    if (this.hasTodoStatTarget) this.todoStatTarget.textContent = String(summary.todo ?? 0);
    if (this.hasSubmittedStatTarget) this.submittedStatTarget.textContent = String(summary.submitted ?? 0);
    if (this.hasAttentionStatTarget) this.attentionStatTarget.textContent = String(summary.needsAttention ?? 0);
  }

  async fetchAssignment(homeworkStudentId) {
    const url = this.expandUrl(this.assignmentUrlValue, homeworkStudentId);
    const response = await fetch(url, { credentials: "same-origin", headers: this.apiHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async patchDraft(responseId, writtenResponse) {
    const url = this.expandUrl(this.responseUrlValue, responseId);
    const response = await fetch(url, {
      method: "PATCH",
      credentials: "same-origin",
      headers: this.apiHeaders(true),
      body: JSON.stringify({ writtenResponse }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(data.errors) ? data.errors.join(" ") : (data.error || "Request failed");
      throw new Error(message);
    }
    if (data.item) {
      this.activeItem = data.item;
      if (this.activeCard) this.applyCardPayload(this.activeCard, data.item);
      this.renderDrawer(data.item);
    }
    if (data.summary) this.refreshSummary(data.summary);
    return data;
  }

  async patchSubmit(responseId, writtenResponse) {
    const url = this.expandUrl(this.submitUrlValue, responseId);
    const response = await fetch(url, {
      method: "PATCH",
      credentials: "same-origin",
      headers: this.apiHeaders(true),
      body: JSON.stringify({ writtenResponse }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(data.errors) ? data.errors.join(" ") : (data.error || "Request failed");
      throw new Error(message);
    }
    if (data.item && this.activeCard) this.applyCardPayload(this.activeCard, data.item);
    if (data.summary) this.refreshSummary(data.summary);
    return data;
  }

  expandUrl(template, id) {
    return String(template || "").replace(":id", encodeURIComponent(String(id || "")));
  }

  apiHeaders(jsonBody = false) {
    const headers = { Accept: "application/json" };
    if (jsonBody) headers["Content-Type"] = "application/json";
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    if (token) headers["X-CSRF-Token"] = token;
    return headers;
  }

  setSaveStatus(state) {
    if (!this.hasDrawerSaveStatusTarget) return;
    const map = {
      saving: "",
      saved: this.strings.draftSaved,
      error: "",
    };
    const message = map[state] || "";
    this.drawerSaveStatusTarget.hidden = !message;
    this.drawerSaveStatusTarget.textContent = message || "";
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
