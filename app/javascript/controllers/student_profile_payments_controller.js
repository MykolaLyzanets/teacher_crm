import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["row", "filterEmpty", "tablePanel"]

  connect() {
    this.activeFilter = "all"
  }

  pickFilter(event) {
    const button = event.currentTarget
    this.activeFilter = button.dataset.filter || "all"
    this.element.querySelectorAll("[data-filter-btn]").forEach((chip) => {
      const selected = chip === button
      chip.classList.toggle("is-active", selected)
      chip.setAttribute("aria-selected", selected ? "true" : "false")
    })
    this.applyFilter()
  }

  applyFilter() {
    let visible = 0
    this.rowTargets.forEach((row) => {
      const category = row.dataset.category || ""
      const show = this.activeFilter === "all" || category === this.activeFilter
      row.hidden = !show
      if (show) visible += 1
    })
    if (this.hasTablePanelTarget) {
      this.tablePanelTarget.hidden = visible === 0
    }
    if (this.hasFilterEmptyTarget) {
      this.filterEmptyTarget.hidden = visible > 0
    }
  }
}
