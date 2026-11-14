import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "type",
    "reasonDetailWrap",
    "reasonDetail",
    "startsOn",
    "endsOn",
    "summaryWrap",
    "summaryReason",
    "summaryPeriod",
    "summaryLessons",
    "summaryStudents",
    "submit",
    "overlapError",
  ]

  static values = {
    teacherName: String,
    previewUrl: String,
    existingPeriods: Array,
    reviewLabel: String,
    saveLabel: String,
    editing: Boolean,
  }

  connect() {
    this.previewRequest = 0
    this.lessonCount = 0
    this.syncReasonDetail()
    this.syncEndDate()
    this.updateSummary()
  }

  syncReasonDetail() {
    if (!this.hasTypeTarget || !this.hasReasonDetailWrapTarget) return
    const other = this.typeTarget.value === "other"
    this.reasonDetailWrapTarget.hidden = !other
    if (this.hasReasonDetailTarget) {
      this.reasonDetailTarget.required = other
      if (!other) this.reasonDetailTarget.value = ""
    }
  }

  syncEndDate() {
    if (!this.hasStartsOnTarget || !this.hasEndsOnTarget) return
    const start = this.startsOnTarget.value
    if (!start) return
    this.endsOnTarget.min = start
    if (!this.endsOnTarget.value) this.endsOnTarget.value = start
  }

  startsOnChanged() {
    this.syncEndDate()
    this.updateSummary()
  }

  updateSummary() {
    const start = this.hasStartsOnTarget ? this.startsOnTarget.value : ""
    const end = this.hasEndsOnTarget ? this.endsOnTarget.value : ""
    const datesReady = Boolean(start && end)
    const rangeValid = datesReady && end >= start
    const overlaps = rangeValid && this.periodOverlapsExisting(start, end)
    const otherReady = this.otherReasonReady()

    if (this.hasOverlapErrorTarget) {
      this.overlapErrorTarget.hidden = !overlaps
    }

    this.syncSubmitButton(rangeValid, overlaps, otherReady)

    if (!this.hasSummaryWrapTarget) return

    if (!rangeValid) {
      this.summaryWrapTarget.hidden = true
      return
    }

    this.summaryWrapTarget.hidden = false

    if (this.hasSummaryReasonTarget) {
      this.summaryReasonTarget.textContent = this.reasonLabel()
    }
    if (this.hasSummaryPeriodTarget) {
      this.summaryPeriodTarget.textContent = `${start} – ${end}`
    }

    if (!overlaps) {
      this.fetchPreview(start, end)
      return
    }

    this.lessonCount = 0
    if (this.hasSummaryLessonsTarget) this.summaryLessonsTarget.textContent = "0"
    if (this.hasSummaryStudentsTarget) this.summaryStudentsTarget.textContent = "0"
    this.syncSubmitButton(rangeValid, overlaps, otherReady)
  }

  refreshSubmitAfterPreview() {
    const start = this.hasStartsOnTarget ? this.startsOnTarget.value : ""
    const end = this.hasEndsOnTarget ? this.endsOnTarget.value : ""
    const rangeValid = Boolean(start && end && end >= start)
    const overlaps = rangeValid && this.periodOverlapsExisting(start, end)
    this.syncSubmitButton(rangeValid, overlaps, this.otherReasonReady())
  }

  syncSubmitButton(rangeValid, overlaps, otherReady) {
    if (!this.hasSubmitTarget) return
  const ready = rangeValid && !overlaps && otherReady
    this.submitTarget.disabled = !ready
    if (!ready) return

    if (this.editingValue) {
      this.submitTarget.removeAttribute("name")
      this.submitTarget.removeAttribute("value")
      this.submitTarget.textContent = this.saveLabelValue || this.submitTarget.textContent
      if (this.lessonCount > 0) {
        this.submitTarget.disabled = true
      }
      return
    }

    const hasLessons = this.lessonCount > 0
    if (hasLessons) {
      this.submitTarget.name = "review_lessons"
      this.submitTarget.value = "1"
      this.submitTarget.textContent = this.reviewLabelValue || this.submitTarget.textContent
      return
    }

    this.submitTarget.removeAttribute("name")
    this.submitTarget.value = ""
    this.submitTarget.textContent = this.saveLabelValue || this.submitTarget.textContent
  }

  periodOverlapsExisting(startOn, endOn) {
    const periods = this.existingPeriodsValue || []
    return periods.some((row) => {
      const existingStart = row.startsOn || row.starts_on
      const existingEnd = row.endsOn || row.ends_on
      if (!existingStart || !existingEnd) return false
      return startOn <= existingEnd && endOn >= existingStart
    })
  }

  otherReasonReady() {
    if (!this.hasTypeTarget || this.typeTarget.value !== "other") return true
    if (!this.hasReasonDetailTarget) return false
    return this.reasonDetailTarget.value.trim().length > 0
  }

  reasonLabel() {
    if (!this.hasTypeTarget) return "—"
    if (this.typeTarget.value === "other") {
      const detail = this.hasReasonDetailTarget ? this.reasonDetailTarget.value.trim() : ""
      return detail || "—"
    }
    const option = this.typeTarget.selectedOptions[0]
    return option ? option.textContent.trim() : "—"
  }

  fetchPreview(startsOn, endsOn) {
    if (!this.hasPreviewUrlValue) return

    const requestId = ++this.previewRequest
    const url = new URL(this.previewUrlValue, window.location.origin)
    url.searchParams.set("starts_on", startsOn)
    url.searchParams.set("ends_on", endsOn)

    fetch(url.toString(), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) throw new Error("preview failed")
        return response.json()
      })
      .then((data) => {
        if (requestId !== this.previewRequest) return
        this.lessonCount = Number(data.lessons) || 0
        if (this.hasSummaryLessonsTarget) {
          this.summaryLessonsTarget.textContent = String(this.lessonCount)
        }
        if (this.hasSummaryStudentsTarget) {
          this.summaryStudentsTarget.textContent = String(data.students ?? 0)
        }
        this.refreshSubmitAfterPreview()
      })
      .catch(() => {
        if (requestId !== this.previewRequest) return
        this.lessonCount = 0
        if (this.hasSummaryLessonsTarget) this.summaryLessonsTarget.textContent = "0"
        if (this.hasSummaryStudentsTarget) this.summaryStudentsTarget.textContent = "0"
        this.refreshSubmitAfterPreview()
      })
  }

  reset() {
    const form = this.element.querySelector("form")
    if (form) form.reset()
    this.previewRequest += 1
    this.syncReasonDetail()
    this.syncEndDate()
    this.updateSummary()
  }
}
