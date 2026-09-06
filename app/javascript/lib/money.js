export function formatMoney(cents, currency = "UAH") {
  const amount = Math.round(Math.abs(Number(cents) || 0) / 100)
  return currency === "EUR" ? `€${amount}` : `${currency} ${amount}`
}

export function formatPriceInput(cents) {
  if (cents == null || cents === "") return ""
  return String(Math.round(Number(cents) / 100))
}
