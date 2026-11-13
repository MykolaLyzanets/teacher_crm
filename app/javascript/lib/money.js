const FINANCE_CURRENCY = "UAH"

export function formatMoney(cents, currency = FINANCE_CURRENCY) {
  const amount = Math.round(Math.abs(Number(cents) || 0) / 100)
  return currency === FINANCE_CURRENCY ? `₴${amount}` : `${currency} ${amount}`
}

export function lessonMoney(lesson) {
  const cents = lesson?.priceCents ?? lesson?.price_cents
  return {
    cents: cents == null || cents === "" ? null : Number(cents),
    currency: FINANCE_CURRENCY
  }
}

export function formatLessonMoney(lesson, fallbackCents = 0) {
  const { cents, currency } = lessonMoney(lesson)
  return formatMoney(cents == null ? fallbackCents : cents, currency)
}

export function formatPriceInput(cents) {
  if (cents == null || cents === "") return ""
  return String(Math.round(Number(cents) / 100))
}

export function parsePriceAmount(value) {
  const raw = String(value || "").trim().replace(",", ".")
  if (!raw) return null
  const amount = Number(raw)
  if (!Number.isFinite(amount)) return null
  return Math.round(amount * 100)
}
