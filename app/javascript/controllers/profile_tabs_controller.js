import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tab", "panel"]

  connect() {
    const requested = new URLSearchParams(window.location.search).get("tab")
    const match = this.tabTargets.find((tab) => tab.dataset.tab === requested)
    this.apply(match?.dataset.tab || this.activeId() || "overview", { syncUrl: false })
  }

  select(event) {
    const id = event.currentTarget.dataset.tab
    if (!id) return
    event.preventDefault()
    this.apply(id)
  }

  openTab(event) {
    const id = event.currentTarget.dataset.tab
    if (!id) return
    event.preventDefault()
    this.apply(id)
  }

  keydown(event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const tabs = this.tabTargets
    const index = tabs.indexOf(event.currentTarget)
    if (index < 0) return
    const next =
      event.key === "ArrowRight"
        ? tabs[(index + 1) % tabs.length]
        : tabs[(index - 1 + tabs.length) % tabs.length]
    this.apply(next.dataset.tab)
    next.focus()
  }

  activeId() {
    const selected = this.tabTargets.find((tab) => tab.getAttribute("aria-selected") === "true")
    return selected?.dataset.tab
  }

  apply(id, { syncUrl = true } = {}) {
    if (!id) return
    this.tabTargets.forEach((tab) => {
      const selected = tab.dataset.tab === id
      tab.classList.toggle("is-active", selected)
      tab.setAttribute("aria-selected", selected ? "true" : "false")
      tab.tabIndex = selected ? 0 : -1
    })
    this.panelTargets.forEach((panel) => {
      const selected = panel.dataset.tab === id
      panel.hidden = !selected
      panel.classList.toggle("is-hidden", !selected)
    })
    if (!syncUrl) return
    const url = new URL(window.location.href)
    if (id === "overview") url.searchParams.delete("tab")
    else url.searchParams.set("tab", id)
    window.history.replaceState({}, "", url)
  }
}
