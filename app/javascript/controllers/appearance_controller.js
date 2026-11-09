import { Controller } from "@hotwired/stimulus"

const KINDS = ["style", "color", "background", "theme", "chart", "heading", "font", "radius"]

export default class extends Controller {
  static targets = [
    "styleValue", "stylePanel", "styleTrigger",
    "colorValue", "colorPanel", "colorTrigger", "colorSwatch", "colorOptionSwatch",
    "backgroundValue", "backgroundPanel", "backgroundTrigger", "backgroundSwatch", "backgroundOptionSwatch",
    "themeValue", "themePanel", "themeTrigger", "themeSwatch", "themeOptionSwatch",
    "chartValue", "chartPanel", "chartTrigger", "chartSwatch", "chartOptionSwatch",
    "headingValue", "headingPanel", "headingTrigger",
    "fontValue", "fontPanel", "fontTrigger",
    "radiusValue", "radiusPanel", "radiusTrigger",
    "styleGlyph", "styleOptionGlyph", "radiusGlyph", "radiusOptionGlyph"
  ]

  connect() {
    this.api = window.DanlioAppearance
    this.boundPointer = this.onPointer.bind(this)
    this.boundKey = this.onKey.bind(this)
    this.boundSync = this.sync.bind(this)
    document.addEventListener("mousedown", this.boundPointer)
    document.addEventListener("keydown", this.boundKey)
    window.addEventListener("danlio:appearance", this.boundSync)
    this.sync()
  }

  disconnect() {
    document.removeEventListener("mousedown", this.boundPointer)
    document.removeEventListener("keydown", this.boundKey)
    window.removeEventListener("danlio:appearance", this.boundSync)
  }

  toggleKind(event) {
    event.stopPropagation()
    const kind = event.params.kind
    KINDS.forEach((other) => {
      if (other !== kind) this.close(other)
    })
    this.toggle(kind)
  }

  chooseKind(event) {
    const kind = event.params.kind
    this.api.saveAppearance({ ...this.api.readAppearance(), [kind]: event.currentTarget.dataset.value })
    this.close(kind)
  }

  random(event) {
    event.stopPropagation()
    this.closeAll()
    const current = this.api.readAppearance()
    const { styles, colors, themes, charts, fonts, radii, backgrounds } = this.api.appearanceMeta()
    const headings = ["inherit", ...Object.keys(fonts)]
    this.api.saveAppearance({
      style: this.pick(styles, current.style),
      color: this.pick(colors, current.color),
      background: this.pick(Object.keys(backgrounds), current.background),
      theme: this.pick(Object.keys(themes), current.theme),
      chart: this.pick(Object.keys(charts), current.chart),
      font: this.pick(Object.keys(fonts), current.font),
      heading: this.pick(headings, current.heading),
      radius: this.pick(Object.keys(radii), current.radius)
    })
  }

  pick(list, current) {
    if (list.length < 2) return list[0]
    let next = current
    while (next === current) {
      next = list[Math.floor(Math.random() * list.length)]
    }
    return next
  }

  sync() {
    if (!this.api) return
    const current = this.api.readAppearance()
    const { palettes, themes, charts, backgrounds, stylesMap, radii } = this.api.appearanceMeta()
    const mode = backgrounds[current.background].mode
    this.styleValueTargets.forEach((el) => { el.textContent = this.optionLabel("style", current.style) })
    this.colorValueTargets.forEach((el) => { el.textContent = this.optionLabel("color", current.color) })
    this.backgroundValueTargets.forEach((el) => { el.textContent = this.optionLabel("background", current.background) })
    this.themeValueTargets.forEach((el) => { el.textContent = this.optionLabel("theme", current.theme) })
    this.chartValueTargets.forEach((el) => { el.textContent = this.optionLabel("chart", current.chart) })
    this.headingValueTargets.forEach((el) => { el.textContent = this.optionLabel("heading", current.heading) })
    this.fontValueTargets.forEach((el) => { el.textContent = this.optionLabel("font", current.font) })
    this.radiusValueTargets.forEach((el) => { el.textContent = this.optionLabel("radius", current.radius) })
    this.colorSwatchTargets.forEach((el) => {
      el.style.background = palettes[current.color][mode].swatch
    })
    this.colorOptionSwatchTargets.forEach((el) => {
      el.style.background = palettes[el.dataset.color][mode].swatch
    })
    this.backgroundSwatchTargets.forEach((el) => {
      el.style.background = backgrounds[current.background].swatch
    })
    this.backgroundOptionSwatchTargets.forEach((el) => {
      el.style.background = backgrounds[el.dataset.background].swatch
    })
    this.themeSwatchTargets.forEach((el) => {
      el.style.background = themes[current.theme].swatch
    })
    this.themeOptionSwatchTargets.forEach((el) => {
      el.style.background = themes[el.dataset.theme].swatch
    })
    this.chartSwatchTargets.forEach((el) => {
      el.style.background = charts[current.chart].swatch
    })
    this.chartOptionSwatchTargets.forEach((el) => {
      el.style.background = charts[el.dataset.chart].swatch
    })
    const styleRadius = stylesMap[current.style].radius
    const radiusValue = radii[current.radius].value || styleRadius
    this.styleGlyphTargets.forEach((el) => { el.style.borderRadius = styleRadius })
    this.styleOptionGlyphTargets.forEach((el) => {
      el.style.borderRadius = stylesMap[el.dataset.style].radius
    })
    this.radiusGlyphTargets.forEach((el) => { el.style.borderRadius = radiusValue })
    this.radiusOptionGlyphTargets.forEach((el) => {
      el.style.borderRadius = radii[el.dataset.radius].value || styleRadius
    })
    KINDS.forEach((kind) => this.markSelected(kind, current[kind]))
  }

  toggle(kind) {
    const panel = this.panel(kind)
    const trigger = this.trigger(kind)
    const open = panel.hidden
    panel.hidden = !open
    trigger.setAttribute("aria-expanded", open ? "true" : "false")
  }

  close(kind) {
    const panel = this.panel(kind)
    if (!panel || panel.hidden) return
    panel.hidden = true
    this.trigger(kind).setAttribute("aria-expanded", "false")
  }

  closeAll() {
    KINDS.forEach((kind) => this.close(kind))
  }

  panel(kind) {
    return this[`${kind}PanelTarget`]
  }

  trigger(kind) {
    return this[`${kind}TriggerTarget`]
  }

  markSelected(kind, value) {
    this.element.querySelectorAll(`[data-appearance-kind="${kind}"]`).forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.value === value)
    })
  }

  optionLabel(kind, value) {
    const option = this.element.querySelector(`[data-appearance-kind="${kind}"][data-value="${value}"] .appearance-menu__option-label`)
    return option ? option.textContent : value
  }

  onPointer(event) {
    if (this.element.contains(event.target)) return
    this.closeAll()
  }

  onKey(event) {
    if (event.key === "Escape") this.closeAll()
  }
}
