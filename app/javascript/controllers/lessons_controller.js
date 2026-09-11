import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toast", "tab", "search", "teacher", "from", "to", "catalogEmpty", "filterEmpty", "table", "row", "menu", "menuBtn", "cancelTip"]
  static values = { i18n: Object, tab: { type: String, default: "all" } }

  connect() {
    this.boundPointer = this.onPointerDown.bind(this)
    this.boundKey = this.onKeydown.bind(this)
    this.boundLessonSaved = () => window.location.reload()
    this.boundReposition = () => {
      this.closeMenus()
      this.hideCancelTip()
    }
    document.addEventListener("mousedown", this.boundPointer)
    document.addEventListener("keydown", this.boundKey)
    window.addEventListener("calendar:lesson-saved", this.boundLessonSaved)
    window.addEventListener("resize", this.boundReposition)
    window.addEventListener("scroll", this.boundReposition, true)
    this.filter()
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    document.removeEventListener("keydown", this.boundKey)
    window.removeEventListener("calendar:lesson-saved", this.boundLessonSaved)
    window.removeEventListener("resize", this.boundReposition)
    window.removeEventListener("scroll", this.boundReposition, true)
    this.hideCancelTip()
  }

  selectTab(event) {
    this.tabValue = event.currentTarget.dataset.tab
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === this.tabValue ? "true" : "false")
    })
    this.filter()
  }

  filter() {
    const query = (this.hasSearchTarget ? this.searchTarget.value : "").trim().toLowerCase()
    const teacher = this.hasTeacherTarget ? this.teacherTarget.value : "all"
    const from = this.hasFromTarget ? this.fromTarget.value : ""
    const to = this.hasToTarget ? this.toTarget.value : ""
    const hasRows = this.rowTargets.length > 0
    let visible = 0

    this.rowTargets.forEach((row) => {
      const matchTab = this.tabValue === "all" || row.dataset.tab === this.tabValue
      const matchTeacher = teacher === "all" || row.dataset.teacher === teacher
      const matchFrom = !from || row.dataset.date >= from
      const matchTo = !to || row.dataset.date <= to
      const matchQuery = !query || (row.dataset.search || "").includes(query)
      const show = matchTab && matchTeacher && matchFrom && matchTo && matchQuery
      row.hidden = !show
      if (show) visible += 1
    })

    if (this.hasCatalogEmptyTarget) this.catalogEmptyTarget.hidden = hasRows
    if (this.hasTableTarget) this.tableTarget.hidden = !hasRows || visible === 0
    if (this.hasFilterEmptyTarget) this.filterEmptyTarget.hidden = !hasRows || visible > 0
  }

  clearFilters() {
    this.tabValue = "all"
    this.tabTargets.forEach((button) => {
      button.setAttribute("aria-selected", button.dataset.tab === "all" ? "true" : "false")
    })
    if (this.hasSearchTarget) this.searchTarget.value = ""
    if (this.hasTeacherTarget) this.teacherTarget.value = "all"
    if (this.hasFromTarget) this.fromTarget.value = ""
    if (this.hasToTarget) this.toTarget.value = ""
    this.filter()
  }

  closeMenus() {
    this.menuTargets.forEach((menu) => {
      menu.classList.add("lessons-page__menu--hidden")
      menu.style.position = ""
      menu.style.top = ""
      menu.style.right = ""
      menu.style.left = ""
      menu.style.zIndex = ""
      menu.style.marginTop = ""
    })
    this.menuBtnTargets.forEach((button) => button.setAttribute("aria-expanded", "false"))
  }

  toggleMenu(event) {
    event.stopPropagation()
    const wrap = event.currentTarget.closest("[data-lesson-menu]")
    const menu = wrap?.querySelector("[data-lessons-target='menu']")
    const wasOpen = menu && !menu.classList.contains("lessons-page__menu--hidden")
    this.closeMenus()
    if (!menu || wasOpen) return
    menu.classList.remove("lessons-page__menu--hidden")
    event.currentTarget.setAttribute("aria-expanded", "true")
    this.positionMenu(menu, event.currentTarget)
  }

  positionMenu(menu, button) {
    const rect = button.getBoundingClientRect()
    const gap = 4
    menu.style.position = "fixed"
    menu.style.left = "auto"
    menu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`
    menu.style.marginTop = "0"
    menu.style.zIndex = "40"
    const height = menu.offsetHeight
    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < height + gap + 8 && rect.top > height + gap) {
      menu.style.top = `${Math.max(12, rect.top - height - gap)}px`
    } else {
      menu.style.top = `${rect.bottom + gap}px`
    }
  }

  onPointerDown(event) {
    if (event.target.closest("[data-lesson-menu]")) return
    this.closeMenus()
  }

  onKeydown(event) {
    if (event.key === "Escape") this.closeMenus()
  }

  showCancelTip(event) {
    const reason = (event.currentTarget.dataset.cancelReason || "").trim()
    if (!reason || !this.hasCancelTipTarget) return
    const tip = this.cancelTipTarget
    tip.textContent = reason
    tip.hidden = false
    const rect = event.currentTarget.getBoundingClientRect()
    const gap = 8
    const width = tip.offsetWidth
    const height = tip.offsetHeight
    let top = rect.top - height - gap
    if (top < 8) top = rect.bottom + gap
    let left = rect.left + (rect.width / 2) - (width / 2)
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8)
    tip.style.top = `${top}px`
    tip.style.left = `${left}px`
  }

  hideCancelTip() {
    if (this.hasCancelTipTarget) this.cancelTipTarget.hidden = true
  }
}
