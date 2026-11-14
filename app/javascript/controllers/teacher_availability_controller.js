import { Controller } from "@hotwired/stimulus"
import {
  WEEK_DAYS,
  describeSlot,
  formatMinutes,
  initialSlots,
  lessonTypeLabelMap,
  mergeSubjectCatalogs,
  newSlotId,
  normalizeAvailabilitySlot,
  parseLessonCatalog,
  slotsForDay,
  sortSlots,
  suggestSlot,
  timelineBounds,
  totalSlotMinutes,
  validateSlots
} from "../lib/teacher_availability"

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const FORMAT_CLASS = {
  online: "ta-timeline__seg--online",
  in_person: "ta-timeline__seg--in-person",
  any: "ta-timeline__seg--any"
}

export default class extends Controller {
  static targets = ["editor", "payload", "summaryError"]

  static values = {
    initial: Object,
    i18n: Object,
    catalogUrl: String
  }

  connect() {
    this.slots = initialSlots(this.initialValue || {})
    this.workspaceSubjects = []
    this.lessonTypeLabels = {}
    this.copyFrom = null
    this.copyTargets = []
    this.errors = {}
    this.onCatalogChange = this.onCatalogChange.bind(this)
    this.catalogInput = document.querySelector('[data-lesson-types-target="draftPayload"]')
    document.addEventListener("lesson-catalog:change", this.onCatalogChange)
    this.boundClick = this.onClick.bind(this)
    this.boundInput = this.onInput.bind(this)
    this.boundChange = this.onChange.bind(this)
    this.element.addEventListener("click", this.boundClick)
    this.element.addEventListener("input", this.boundInput)
    this.element.addEventListener("change", this.boundChange)
    this.refreshLessonTypeOptions()
    this.render()
    this.loadWorkspaceCatalog()
  }

  disconnect() {
    document.removeEventListener("lesson-catalog:change", this.onCatalogChange)
    this.element.removeEventListener("click", this.boundClick)
    this.element.removeEventListener("input", this.boundInput)
    this.element.removeEventListener("change", this.boundChange)
  }

  async loadWorkspaceCatalog() {
    if (!this.hasCatalogUrlValue) return
    try {
      const url = new URL(this.catalogUrlValue, window.location.origin)
      url.searchParams.set("include_inactive", "0")
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } })
      if (!response.ok) throw new Error("catalog")
      const data = await response.json()
      this.workspaceSubjects = Array.isArray(data) ? data : []
    } catch {
      this.workspaceSubjects = []
    }
    this.refreshLessonTypeOptions()
    this.render()
  }

  onCatalogChange() {
    this.refreshLessonTypeOptions()
    this.render()
  }

  refreshLessonTypeOptions() {
    const draft = parseLessonCatalog(this.catalogInput?.value || "[]")
    const merged = mergeSubjectCatalogs(this.workspaceSubjects, draft)
    this.lessonTypeLabels = lessonTypeLabelMap(merged)
  }

  t(key, fallback) {
    return (
      this.i18nValue?.availability_slots?.[key] ||
      this.i18nValue?.teachers?.[key] ||
      this.i18nValue?.[key] ||
      fallback ||
      key
    )
  }

  lessonTypeSelectOptions() {
    const options = {
      any: this.t("slot_lesson_any", "Any lesson type")
    }
    Object.entries(this.lessonTypeLabels || {}).forEach(([id, label]) => {
      options[id] = label
    })
    this.slots.forEach((slot) => {
      const id = slot.lessonTypeId || "any"
      if (id !== "any" && !options[id]) {
        options[id] = this.t("slot_lesson_removed", "Removed lesson type")
      }
    })
    return options
  }

  labels() {
    return {
      lessonTypes: this.lessonTypeLabels,
      anyLessonType: this.t("slot_lesson_any", "Any lesson type"),
      format: {
        any: this.t("slot_format_any", "Online or in person"),
        online: this.t("slot_format_online", "Online"),
        in_person: this.t("slot_format_in_person", "In person")
      },
      anyLesson: this.t("slot_use_any", "Any lesson"),
      invalidTime: this.t("slot_error_time", "Enter a start and end time."),
      invalidOrder: this.t("slot_error_order", "End time must be later than start time."),
      overlap: this.t("slot_error_overlap", "Overlaps with %{other}. Slots on the same day can't overlap.")
    }
  }

  syncPayload() {
    if (!this.hasPayloadTarget) return
    this.slots = sortSlots(this.slots)
    this.payloadTarget.value = JSON.stringify(this.slots)
  }

  validate() {
    this.errors = validateSlots(this.slots, this.labels())
    this.renderSummaryError()
    return this.errors
  }

  renderSummaryError() {
    if (!this.hasSummaryErrorTarget) return
    const hasErrors = Object.keys(this.errors).length > 0
    this.summaryErrorTarget.hidden = !hasErrors
    if (hasErrors) {
      this.summaryErrorTarget.textContent = this.t("slots_summary_error", "Fix the highlighted time slots.")
    }
  }

  onClick(event) {
    const add = event.target.closest("[data-ta-add]")
    if (add) {
      event.preventDefault()
      const day = add.dataset.taAdd
      this.slots = [...this.slots, suggestSlot(day, slotsForDay(this.slots, day))]
      this.render()
      return
    }
    const remove = event.target.closest("[data-ta-remove]")
    if (remove) {
      event.preventDefault()
      this.slots = this.slots.filter((slot) => slot.id !== remove.dataset.taRemove)
      this.render()
      return
    }
    const copyToggle = event.target.closest("[data-ta-copy-toggle]")
    if (copyToggle) {
      event.preventDefault()
      const day = copyToggle.dataset.taCopyToggle
      if (this.copyFrom === day) {
        this.copyFrom = null
        this.copyTargets = []
      } else {
        this.copyFrom = day
        this.copyTargets = []
      }
      this.render()
      return
    }
    const copyCancel = event.target.closest("[data-ta-copy-cancel]")
    if (copyCancel) {
      event.preventDefault()
      this.copyFrom = null
      this.copyTargets = []
      this.render()
      return
    }
    const copyWeekdays = event.target.closest("[data-ta-copy-weekdays]")
    if (copyWeekdays) {
      event.preventDefault()
      this.copyTargets = ["Tuesday", "Wednesday", "Thursday", "Friday"]
      this.render()
      return
    }
    const copyDayPick = event.target.closest("[data-ta-copy-day]")
    if (copyDayPick) {
      event.preventDefault()
      const day = copyDayPick.dataset.taCopyDay
      if (this.copyTargets.includes(day)) {
        this.copyTargets = this.copyTargets.filter((item) => item !== day)
      } else {
        this.copyTargets = [...this.copyTargets, day]
      }
      this.render()
      return
    }
    const copyApply = event.target.closest("[data-ta-copy-apply]")
    if (copyApply) {
      event.preventDefault()
      const from = copyApply.dataset.taCopyApply
      if (!this.copyTargets.length) return
      this.copyDay(from, this.copyTargets)
    }
  }

  copyDay(from, targets) {
    const source = slotsForDay(this.slots, from)
    const kept = this.slots.filter((slot) => !targets.includes(slot.day))
    const copies = targets.flatMap((day) =>
      source.map((slot) => ({ ...slot, id: newSlotId(), day }))
    )
    this.slots = [...kept, ...copies]
    this.copyFrom = null
    this.copyTargets = []
    this.render()
  }

  onInput(event) {
    const rate = event.target.closest("[data-ta-field]")
    if (!rate) return
    const id = rate.dataset.taField
    const field = rate.dataset.taFieldName
    const slot = this.slots.find((item) => item.id === id)
    if (!slot) return
    slot[field] = rate.value
    if (field === "startTime" || field === "endTime") {
      this.errors = validateSlots(this.slots, this.labels())
      this.renderSummaryError()
      this.updateSlotRow(id)
      this.syncPayload()
    }
  }

  onChange(event) {
    const select = event.target.closest("[data-ta-select]")
    if (!select) return
    const slot = this.slots.find((item) => item.id === select.dataset.taSelect)
    if (!slot) return
    const field = select.dataset.taSelectField
    slot[field] = select.value
    if (field === "lessonTypeId") slot.lessonType = "any"
    this.syncPayload()
    this.updateSlotRow(slot.id)
  }

  updateSlotRow(id) {
    const row = this.editorTarget.querySelector(`[data-ta-slot="${id}"]`)
    if (!row) return
    const slot = this.slots.find((item) => item.id === id)
    if (!slot) return
    const err = this.errors[id]
    row.classList.toggle("ta-slot--error", Boolean(err))
    const errNode = row.querySelector(".ta-slot__error")
    if (errNode) {
      errNode.textContent = err || ""
      errNode.hidden = !err
    }

    const duration = minutesOf(slot.endTime) - minutesOf(slot.startTime)
    let durationEl = row.querySelector(".ta-slot__duration")
    if (duration > 0) {
      if (!durationEl) {
        durationEl = document.createElement("span")
        durationEl.className = "ta-slot__duration"
        row.querySelector(".ta-slot__times")?.appendChild(durationEl)
      }
      durationEl.textContent = formatMinutes(duration)
      durationEl.hidden = false
    } else if (durationEl) {
      durationEl.remove()
    }

    const dayEl = row.closest(".ta-day")
    if (!dayEl) return
    const daySlots = slotsForDay(this.slots, slot.day)
    const bounds = timelineBounds(this.slots)
    const timeline = dayEl.querySelector(".ta-timeline")
    if (timeline) timeline.outerHTML = this.timelineHtml(daySlots, bounds)

    const meta = dayEl.querySelector(".ta-day__meta")
    if (meta) {
      meta.textContent = this.t("day_slots_stats", "%{count} slots · %{total}")
        .replace("%{count}", String(daySlots.length))
        .replace("%{total}", formatMinutes(totalSlotMinutes(daySlots)))
    }

    this.updateHeadStats()
  }

  updateHeadStats() {
    const statsWrap = this.editorTarget.querySelector(".ta-head__stats")
    if (!statsWrap) return
    const statsEl = statsWrap.querySelector(".ta-head__numbers")
    if (!statsEl || this.slots.length === 0) return

    const activeDays = WEEK_DAYS.filter((day) => this.slots.some((item) => item.day === day))
    statsEl.textContent = this.t("slots_stats", "%{days} days · %{count} slots · %{total} a week")
      .replace("%{days}", String(activeDays.length))
      .replace("%{count}", String(this.slots.length))
      .replace("%{total}", formatMinutes(totalSlotMinutes(this.slots)))
  }

  render() {
    if (!this.hasEditorTarget) return
    this.errors = validateSlots(this.slots, this.labels())
    const activeDays = WEEK_DAYS.filter((day) => this.slots.some((slot) => slot.day === day))
    const bounds = timelineBounds(this.slots)
    const stats =
      this.slots.length === 0
        ? ""
        : this.t("slots_stats", "%{days} days · %{count} slots · %{total} a week")
            .replace("%{days}", String(activeDays.length))
            .replace("%{count}", String(this.slots.length))
            .replace("%{total}", formatMinutes(totalSlotMinutes(this.slots)))

    const emptyWarn =
      this.slots.length === 0
        ? `<p class="ta-empty-warn">${esc(this.t("slots_empty_warn", "No availability set. Lessons can be booked at any time until you add slots."))}</p>`
        : ""

    const rows = WEEK_DAYS.map((day) => this.dayRowHtml(day, bounds)).join("")

    this.editorTarget.innerHTML = `
      <div class="ta-head">
        <div class="ta-head__copy">
          <p class="ta-head__title">${esc(this.t("weekly_title", "Weekly availability"))}</p>
          <p class="ta-head__sub">${esc(this.t("weekly_sub", "Add one or more time slots per day, each for a lesson type and format. Time between slots is unavailable."))}</p>
        </div>
        ${stats ? `<div class="ta-head__stats"><p class="ta-head__numbers">${esc(stats)}</p>${this.legendHtml()}</div>` : ""}
      </div>
      ${emptyWarn}
      <ul class="ta-week">${rows}</ul>`

    this.syncPayload()
    this.renderSummaryError()
  }

  legendHtml() {
    return `<div class="ta-legend" aria-hidden="true">
      <span><i class="ta-legend__dot ta-legend__dot--online"></i>${esc(this.t("legend_online", "Online"))}</span>
      <span><i class="ta-legend__dot ta-legend__dot--in-person"></i>${esc(this.t("legend_in_person", "In person"))}</span>
      <span><i class="ta-legend__dot ta-legend__dot--any"></i>${esc(this.t("legend_either", "Either"))}</span>
    </div>`
  }

  dayRowHtml(day, bounds) {
    const daySlots = slotsForDay(this.slots, day)
    const empty = daySlots.length === 0
    const dayLabel = this.t(`day_${day}`, day)
    const dayStats = empty
      ? this.t("day_unavailable", "Unavailable")
      : this.t("day_slots_stats", "%{count} slots · %{total}")
          .replace("%{count}", String(daySlots.length))
          .replace("%{total}", formatMinutes(totalSlotMinutes(daySlots)))

    const body = empty
      ? `<div class="ta-day__empty">
          <span class="ta-day__badge">${esc(this.t("no_availability", "No availability"))}</span>
          ${this.addBtnHtml(day)}
        </div>`
      : `${this.timelineHtml(daySlots, bounds)}
         <ul class="ta-slots">${daySlots.map((slot) => this.slotRowHtml(slot)).join("")}</ul>
         <div class="ta-day__actions">
           ${this.addBtnHtml(day)}
           <button type="button" class="ta-text-btn" data-ta-copy-toggle="${esc(day)}" aria-expanded="${this.copyFrom === day}">
             ${esc(this.t("copy_to", "Copy to…"))}
           </button>
         </div>
         ${this.copyFrom === day ? this.copyPanelHtml(day) : ""}`

    return `<li class="ta-day${empty ? " ta-day--empty" : ""}">
      <div class="ta-day__label">
        <p class="ta-day__name">${esc(dayLabel)}</p>
        <p class="ta-day__meta">${esc(dayStats)}</p>
      </div>
      <div class="ta-day__body">${body}</div>
    </li>`
  }

  timelineHtml(daySlots, bounds) {
    const span = bounds.end - bounds.start
    const hours = []
    for (let h = Math.ceil(bounds.start / 60); h * 60 <= bounds.end; h += 2) hours.push(h)
    const segments = daySlots
      .map((slot) => {
        const s = minutesOf(slot.startTime)
        const e = minutesOf(slot.endTime)
        if (e <= s) return ""
        const err = this.errors[slot.id]
        return `<span class="ta-timeline__seg ${FORMAT_CLASS[slot.format] || FORMAT_CLASS.any}${err ? " ta-timeline__seg--error" : ""}" style="left:${((s - bounds.start) / span) * 100}%;width:${((e - s) / span) * 100}%" title="${esc(describeSlot(slot, this.labels()))}"></span>`
      })
      .join("")
    const ticks = hours
      .map((h) => `<span style="left:${((h * 60 - bounds.start) / span) * 100}%">${String(h).padStart(2, "0")}</span>`)
      .join("")
    return `<div class="ta-timeline" aria-hidden="true">
      <div class="ta-timeline__track">${segments}</div>
      <div class="ta-timeline__hours">${ticks}</div>
    </div>`
  }

  slotRowHtml(slot) {
    const err = this.errors[slot.id]
    const duration = minutesOf(slot.endTime) - minutesOf(slot.startTime)
    const labels = this.labels()
    return `<li class="ta-slot${err ? " ta-slot--error" : ""}" data-ta-slot="${esc(slot.id)}">
      <div class="ta-slot__row">
        <div class="ta-slot__times">
          <input type="time" class="ta-time" value="${esc(slot.startTime)}" data-ta-field="${esc(slot.id)}" data-ta-field-name="startTime" aria-label="${esc(slot.day)} start">
          <span>–</span>
          <input type="time" class="ta-time" value="${esc(slot.endTime)}" data-ta-field="${esc(slot.id)}" data-ta-field-name="endTime" aria-label="${esc(slot.day)} end">
          ${duration > 0 ? `<span class="ta-slot__duration">${esc(formatMinutes(duration))}</span>` : ""}
        </div>
        <div class="ta-slot__scopes">
          ${this.chipSelectHtml(slot, "lessonTypeId", this.lessonTypeSelectOptions())}
          ${this.chipSelectHtml(slot, "format", labels.format)}
        </div>
        <button type="button" class="ta-slot__remove" data-ta-remove="${esc(slot.id)}" aria-label="${esc(this.t("remove_slot", "Remove time slot"))}">×</button>
      </div>
      <p class="ta-slot__error" role="alert"${err ? "" : ' hidden="hidden"'}>${esc(err || "")}</p>
    </li>`
  }

  chipSelectHtml(slot, field, options) {
    const current = field === "lessonTypeId" ? slot.lessonTypeId || "any" : slot[field]
    const opts = Object.entries(options)
      .map(([value, label]) => `<option value="${esc(value)}"${current === value ? " selected" : ""}>${esc(label)}</option>`)
      .join("")
    return `<label class="ta-chip-select">
      <select data-ta-select="${esc(slot.id)}" data-ta-select-field="${field}" aria-label="${esc(field)}">${opts}</select>
    </label>`
  }

  addBtnHtml(day) {
    return `<button type="button" class="ta-add-btn" data-ta-add="${esc(day)}">+ ${esc(this.t("add_slot", "Add time slot"))}</button>`
  }

  copyPanelHtml(from) {
    const others = WEEK_DAYS.filter((day) => day !== from)
    const weekdays = others.filter((day) => day !== "Saturday" && day !== "Sunday")
    const pills = others
      .map((day) => {
        const short = day.slice(0, 3)
        const active = this.copyTargets.includes(day)
        return `<button type="button" class="ta-copy-pill${active ? " is-active" : ""}" data-ta-copy-day="${esc(day)}">${esc(short)}</button>`
      })
      .join("")
    return `<div class="ta-copy-panel" data-ta-copy-panel="${esc(from)}">
      <p class="ta-copy-panel__title">${esc(this.t("copy_from", "Copy %{day}'s slots to").replace("%{day}", this.t(`day_${from}`, from)))}</p>
      <div class="ta-copy-panel__pills">${pills}
        <button type="button" class="ta-copy-link" data-ta-copy-weekdays>${esc(this.t("copy_weekdays", "Weekdays"))}</button>
      </div>
      <p class="ta-copy-panel__hint">${esc(this.t("copy_hint", "Replaces any slots already on the selected days."))}</p>
      <div class="ta-copy-panel__actions">
        <button type="button" class="ta-copy-apply" data-ta-copy-apply="${esc(from)}">${esc(this.t("copy_apply", "Copy"))}</button>
        <button type="button" class="ta-copy-cancel" data-ta-copy-cancel>${esc(this.t("copy_cancel", "Cancel"))}</button>
      </div>
    </div>`
  }
}

function minutesOf(time) {
  const [h, m] = String(time || "").split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
