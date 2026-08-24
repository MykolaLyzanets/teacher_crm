import { Controller } from "@hotwired/stimulus";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const HOUR_HEIGHT = 64;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, index) => DAY_START_HOUR + index
);

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function startOfWeek(date) {
  return addDays(startOfDay(date), -mondayIndex(date));
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getWeekDays(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function shiftPeriod(date, view, direction) {
  if (view === "month" || view === "agenda") return addMonths(date, direction);
  if (view === "week") return addDays(date, direction * 7);
  return addDays(date, direction);
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || "0:0").split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(value, locale) {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  if (locale === "en") {
    const period = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default class extends Controller {
  static targets = [
    "title",
    "month",
    "monthGrid",
    "week",
    "weekGrid",
    "agenda",
    "dayAgenda",
    "dayAgendaTitle",
    "dayAgendaEmpty",
    "emptyChip",
    "viewTab",
    "viewSelect",
    "upcoming",
    "upcomingTitle",
    "upcomingWhen",
    "upcomingWho",
    "upcomingJoin",
    "drawer",
    "drawerTitle",
    "drawerWhen",
    "drawerWho",
    "drawerPlace",
    "drawerNotes",
    "drawerJoin",
  ];

  static values = {
    labels: Object,
    lessons: Array,
    view: { type: String, default: "month" },
  };

  get labels() {
    return {
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ],
      monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      weekdaysFull: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      locale: "en",
      noLessonsOn: "No lessons on %{date}.",
      emptyTitle: "No lessons scheduled",
      emptyText: "Your upcoming lessons will appear here when they are scheduled.",
      join: "Join lesson",
      viewDetails: "View details",
      withTeacher: "With %{name}",
      ...this.labelsValue,
    };
  }

  get lessons() {
    return Array.isArray(this.lessonsValue) ? this.lessonsValue : [];
  }

  connect() {
    this.today = startOfDay(new Date());
    this.cursor = new Date(this.today);
    this.selected = new Date(this.today);
    this.mobileDefaultApplied = false;
    this.compact = window.matchMedia("(max-width: 767px)");
    this.onCompactChange = () => {
      if (!this.mobileDefaultApplied) {
        this.viewValue = this.compact.matches ? "agenda" : "month";
        this.mobileDefaultApplied = true;
      }
      this.render();
    };
    this.compact.addEventListener("change", this.onCompactChange);
    this.onCompactChange();
  }

  disconnect() {
    this.compact.removeEventListener("change", this.onCompactChange);
  }

  previous() {
    this.cursor = shiftPeriod(this.cursor, this.viewValue, -1);
    this.render();
  }

  next() {
    this.cursor = shiftPeriod(this.cursor, this.viewValue, 1);
    this.render();
  }

  today() {
    this.cursor = new Date(this.today);
    this.selected = new Date(this.today);
    this.render();
  }

  setView(event) {
    const view = event.currentTarget.dataset.view || event.currentTarget.value;
    if (!["month", "week", "agenda"].includes(view)) return;
    this.viewValue = view;
    this.render();
  }

  selectDate(event) {
    this.selected = new Date(`${event.currentTarget.dataset.date}T00:00:00`);
    this.render();
  }

  lessonsOn(key) {
    return this.lessons
      .filter((lesson) => lesson.date === key && lesson.status !== "cancelled")
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  nextLesson() {
    const todayKey = toDateKey(this.today);
    return this.lessons
      .filter((lesson) => lesson.date >= todayKey && ["confirmed", "pending"].includes(lesson.status))
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0] || null;
  }

  render() {
    this.titleTarget.textContent = this.periodTitle(this.cursor, this.viewValue);
    this.renderUpcoming();

    this.viewTabTargets.forEach((tab) => {
      const active = tab.dataset.view === this.viewValue;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    if (this.hasViewSelectTarget) this.viewSelectTarget.value = this.viewValue;

    this.monthTarget.hidden = this.viewValue !== "month";
    this.weekTarget.hidden = this.viewValue !== "week";
    this.agendaTarget.hidden = this.viewValue !== "agenda";

    const showDayAgenda = this.viewValue === "month" && this.compact.matches;
    this.dayAgendaTarget.hidden = !showDayAgenda;
    this.emptyChipTarget.hidden = this.viewValue === "agenda" || this.lessons.length > 0;

    if (this.viewValue === "month") this.renderMonth();
    if (this.viewValue === "week") this.renderWeek();
    if (this.viewValue === "agenda") this.renderAgenda();
    if (showDayAgenda) this.renderDayAgenda();
  }

  renderUpcoming() {
    if (!this.hasUpcomingTarget) return;
    const lesson = this.nextLesson();
    this.upcomingTarget.hidden = !lesson;
    if (!lesson) return;
    if (this.hasUpcomingTitleTarget) this.upcomingTitleTarget.textContent = lesson.title;
    if (this.hasUpcomingWhenTarget) {
      this.upcomingWhenTarget.textContent = `${lesson.date} · ${formatTime(lesson.startTime, this.labels.locale)} – ${formatTime(lesson.endTime, this.labels.locale)}`;
    }
    if (this.hasUpcomingWhoTarget) this.upcomingWhoTarget.textContent = lesson.teacher;
    if (this.hasUpcomingJoinTarget) {
      const joinable = lesson.location === "online" && lesson.meetingLink;
      this.upcomingJoinTarget.hidden = !joinable;
      if (joinable) this.upcomingJoinTarget.href = lesson.meetingLink;
    }
    this.upcomingLesson = lesson;
  }

  openUpcoming() {
    if (this.upcomingLesson) this.openLesson(this.upcomingLesson);
  }

  openLesson(lesson) {
    if (!this.hasDrawerTarget) return;
    this.drawerTitleTarget.textContent = lesson.title;
    this.drawerWhenTarget.textContent = `${lesson.date} · ${formatTime(lesson.startTime, this.labels.locale)} – ${formatTime(lesson.endTime, this.labels.locale)}`;
    this.drawerWhoTarget.textContent = (this.labels.withTeacher || "With %{name}").replace("%{name}", lesson.teacher);
    this.drawerPlaceTarget.textContent = lesson.location === "online" ? "Online" : (lesson.locationText || "In person");
    this.drawerNotesTarget.textContent = lesson.notes || "";
    if (this.hasDrawerJoinTarget) {
      const joinable = lesson.location === "online" && lesson.meetingLink;
      this.drawerJoinTarget.hidden = !joinable;
      if (joinable) this.drawerJoinTarget.href = lesson.meetingLink;
    }
    this.drawerTarget.classList.remove("sp-drawer--hidden");
  }

  closeDetails() {
    if (this.hasDrawerTarget) this.drawerTarget.classList.add("sp-drawer--hidden");
  }

  periodTitle(date, view) {
    const { months, monthsShort } = this.labels;
    if (view === "month" || view === "agenda") {
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${monthsShort[start.getMonth()]} ${start.getDate()} – ${monthsShort[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  renderMonth() {
    const { weekdaysFull } = this.labels;
    const days = getMonthGrid(this.cursor);

    this.monthGridTarget.replaceChildren(
      ...days.map((day) => {
        const key = toDateKey(day);
        const inMonth = isSameMonth(day, this.cursor);
        const isToday = isSameDay(day, this.today);
        const isSelected = isSameDay(day, this.selected);
        const weekend = day.getDay() === 0 || day.getDay() === 6;
        const weekday = weekdaysFull[(day.getDay() + 6) % 7];
        const list = this.lessonsOn(key);

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.date = key;
        button.dataset.action = "student-calendar#selectDate";
        button.setAttribute(
          "aria-label",
          `${weekday}, ${day.getMonth() + 1}/${day.getDate()}/${day.getFullYear()}`
        );
        if (isToday) button.setAttribute("aria-current", "date");
        button.setAttribute("aria-pressed", String(isSelected));
        button.className = [
          "sp-cal__day",
          isSelected ? "is-selected" : "",
          inMonth ? "" : "is-outside",
          weekend && inMonth ? "is-weekend" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const number = document.createElement("span");
        number.className = `sp-cal__num${isToday ? " is-today" : ""}`;
        number.textContent = String(day.getDate());
        button.append(number);

        if (list.length) {
          const events = document.createElement("div");
          events.className = "sp-cal__events";
          list.slice(0, 2).forEach((lesson) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "sp-cal__chip-event";
            chip.textContent = lesson.title;
            chip.addEventListener("click", (event) => {
              event.stopPropagation();
              this.openLesson(lesson);
            });
            events.append(chip);
          });
          if (list.length > 2) {
            const more = document.createElement("span");
            more.className = "sp-cal__more";
            more.textContent = `+${list.length - 2}`;
            events.append(more);
          }
          button.append(events);
        }
        return button;
      })
    );
  }

  renderWeek() {
    const { weekdays } = this.labels;
    const days = getWeekDays(this.cursor);
    const nowTop = this.currentTimeTop();
    const showNow = days.some((day) => isSameDay(day, this.today));

    const grid = document.createElement("div");
    grid.className = "sp-cal__week-inner";

    const corner = document.createElement("div");
    corner.className = "sp-cal__week-corner";
    grid.append(corner);

    days.forEach((day, index) => {
      const isToday = isSameDay(day, this.today);
      const header = document.createElement("div");
      header.className = "sp-cal__week-head";
      const label = document.createElement("p");
      label.className = "sp-cal__week-label";
      label.textContent = weekdays[index];
      const num = document.createElement("p");
      num.className = `sp-cal__week-num${isToday ? " is-today" : ""}`;
      num.textContent = String(day.getDate());
      header.append(label, num);
      grid.append(header);
    });

    const times = document.createElement("div");
    times.className = "sp-cal__week-times";
    HOURS.forEach((hour) => {
      const row = document.createElement("div");
      row.className = "sp-cal__week-time";
      row.style.height = `${HOUR_HEIGHT}px`;
      const stamp = document.createElement("span");
      stamp.textContent = this.formatHour(hour);
      row.append(stamp);
      times.append(row);
    });
    grid.append(times);

    days.forEach((day) => {
      const column = document.createElement("div");
      column.className = "sp-cal__week-col";
      column.style.height = `${HOURS.length * HOUR_HEIGHT}px`;
      HOURS.forEach((hour) => {
        const slot = document.createElement("div");
        slot.className = "sp-cal__week-slot";
        slot.style.top = `${(hour - DAY_START_HOUR) * HOUR_HEIGHT}px`;
        slot.style.height = `${HOUR_HEIGHT}px`;
        column.append(slot);
      });
      if (showNow && isSameDay(day, this.today) && nowTop !== null) {
        const now = document.createElement("div");
        now.className = "sp-cal__now";
        now.style.top = `${nowTop}px`;
        column.append(now);
      }
      this.lessonsOn(toDateKey(day)).forEach((lesson) => {
        const start = timeToMinutes(lesson.startTime);
        const end = timeToMinutes(lesson.endTime);
        const event = document.createElement("button");
        event.type = "button";
        event.className = "sp-cal__week-event";
        event.style.top = `${((start - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT}px`;
        event.style.height = `${Math.max(((end - start) / 60) * HOUR_HEIGHT, 28)}px`;
        event.textContent = lesson.title;
        event.addEventListener("click", () => this.openLesson(lesson));
        column.append(event);
      });
      grid.append(column);
    });

    this.weekGridTarget.replaceChildren(grid);
  }

  renderAgenda() {
    const monthKey = `${this.cursor.getFullYear()}-${this.cursor.getMonth()}`;
    const monthLessons = this.lessons
      .filter((lesson) => {
        const [year, month] = lesson.date.split("-").map(Number);
        return `${year}-${month - 1}` === monthKey && lesson.status !== "cancelled";
      })
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

    if (!monthLessons.length) {
      this.agendaTarget.innerHTML = `<div class="sp-cal__agenda-empty"><div class="sp-cal__agenda-icon"></div><h3>${this.labels.emptyTitle}</h3><p>${this.labels.emptyText}</p></div>`;
      return;
    }

    const list = document.createElement("div");
    list.className = "sp-cal__agenda-list";
    monthLessons.forEach((lesson) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sp-cal__agenda-row";
      row.innerHTML = `<strong>${lesson.title}</strong><span>${lesson.date} · ${formatTime(lesson.startTime, this.labels.locale)} – ${formatTime(lesson.endTime, this.labels.locale)}</span><span>${lesson.teacher}</span>`;
      row.addEventListener("click", () => this.openLesson(lesson));
      list.append(row);
    });
    this.agendaTarget.replaceChildren(list);
  }

  renderDayAgenda() {
    const { weekdaysFull, months, noLessonsOn } = this.labels;
    const weekday = weekdaysFull[(this.selected.getDay() + 6) % 7];
    this.dayAgendaTitleTarget.textContent = `${weekday}, ${months[this.selected.getMonth()]} ${this.selected.getDate()}`;
    const list = this.lessonsOn(toDateKey(this.selected));
    this.dayAgendaEmptyTarget.hidden = list.length > 0;
    this.dayAgendaEmptyTarget.textContent = noLessonsOn.replace("%{date}", toDateKey(this.selected));
    this.dayAgendaTarget.querySelectorAll(".sp-cal__agenda-row").forEach((node) => node.remove());
    list.forEach((lesson) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sp-cal__agenda-row";
      row.textContent = `${formatTime(lesson.startTime, this.labels.locale)} · ${lesson.title}`;
      row.addEventListener("click", () => this.openLesson(lesson));
      this.dayAgendaTarget.append(row);
    });
  }

  currentTimeTop() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = DAY_START_HOUR * 60;
    const end = DAY_END_HOUR * 60;
    if (minutes < start || minutes > end) return null;
    return ((minutes - start) / 60) * HOUR_HEIGHT;
  }

  formatHour(hour) {
    if (this.labels.locale === "en") {
      const period = hour >= 12 ? "PM" : "AM";
      return `${hour % 12 || 12} ${period}`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  }
}
