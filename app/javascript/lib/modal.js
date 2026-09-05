const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const stack = []

function visibleFocusable(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((node) => {
    if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return false
    return node.offsetParent !== null || node.getClientRects().length > 0
  })
}

function lockScroll() {
  const body = document.body
  const depth = Number(body.dataset.modalDepth || "0") + 1
  body.dataset.modalDepth = String(depth)
  if (depth === 1) {
    body.dataset.modalOverflow = body.style.overflow || ""
    body.style.overflow = "hidden"
  }
}

function unlockScroll() {
  const body = document.body
  const next = Math.max(0, Number(body.dataset.modalDepth || "1") - 1)
  body.dataset.modalDepth = String(next)
  if (next === 0) {
    body.style.overflow = body.dataset.modalOverflow || ""
    delete body.dataset.modalDepth
    delete body.dataset.modalOverflow
  }
}

function onKeyDown(event) {
  const top = stack[stack.length - 1]
  if (!top) return
  if (event.key === "Escape") {
    event.preventDefault()
    top.onClose?.()
    return
  }
  if (event.key !== "Tab") return
  const items = visibleFocusable(top.card || top.el)
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export function openModal(el, { focus, onClose } = {}) {
  if (!el) return
  if (stack.some((item) => item.el === el)) return
  el.hidden = false
  el.removeAttribute("hidden")
  lockScroll()
  const card = el.querySelector('[role="dialog"]') || el
  if (stack.length === 0) document.addEventListener("keydown", onKeyDown)
  stack.push({
    el,
    card,
    previous: document.activeElement,
    onClose: onClose || (() => closeModal(el))
  })
  const target = focus || visibleFocusable(card)[0]
  window.requestAnimationFrame(() => target?.focus?.())
}

export function closeModal(el) {
  if (!el) return
  const index = stack.findIndex((item) => item.el === el)
  const entry = index >= 0 ? stack.splice(index, 1)[0] : null
  el.hidden = true
  if (entry) unlockScroll()
  if (stack.length === 0) document.removeEventListener("keydown", onKeyDown)
  entry?.previous?.focus?.()
}

export function isModalOpen(el) {
  return stack.some((item) => item.el === el)
}
