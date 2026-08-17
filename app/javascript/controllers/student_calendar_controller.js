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
  ];

  static values = {
    labels: Object,
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
      ...this.labelsValue,
    };
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

  render() {
    this.titleTarget.textContent = this.periodTitle(this.cursor, this.viewValue);

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
    this.emptyChipTarget.hidden = this.viewValue === "agenda";

    if (this.viewValue === "month") this.renderMonth();
    if (this.viewValue === "week") this.renderWeek();
    if (showDayAgenda) this.renderDayAgenda();
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
      grid.append(column);
    });

    this.weekGridTarget.replaceChildren(grid);
  }

  renderDayAgenda() {
    const { weekdaysFull, months, noLessonsOn } = this.labels;
    const weekday = weekdaysFull[(this.selected.getDay() + 6) % 7];
    this.dayAgendaTitleTarget.textContent = `${weekday}, ${months[this.selected.getMonth()]} ${this.selected.getDate()}`;
    this.dayAgendaEmptyTarget.textContent = noLessonsOn.replace(
      "%{date}",
      toDateKey(this.selected)
    );
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
