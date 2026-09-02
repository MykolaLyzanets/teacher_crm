const STORAGE_KEY = "danlio.lesson-types.v1"

const LEGACY_TYPE_NAMES = {
  individual: "Individual lesson",
  group: "Group lesson",
  trial: "Trial lesson",
  consultation: "Consultation"
}

let seedLessons = []

function read() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.lessonTypes) || !Array.isArray(parsed?.links)) return null
    return parsed
  } catch {
    return null
  }
}

function write(state) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function state() {
  return read() || { lessonTypes: [], links: [] }
}

export function initLessonTypesStore(seed = {}) {
  seedLessons = Array.isArray(seed.lessons) ? seed.lessons : seedLessons
  if (read()) return
  write({
    lessonTypes: Array.isArray(seed.lessonTypes) ? seed.lessonTypes : [],
    links: Array.isArray(seed.links) ? seed.links : []
  })
}

export function listLessonTypes() {
  return [...state().lessonTypes].sort((a, b) => a.name.localeCompare(b.name))
}

export function listActiveLessonTypes() {
  return listLessonTypes().filter((item) => item.isActive)
}

export function getLessonTypeById(id) {
  return state().lessonTypes.find((item) => String(item.id) === String(id))
}

export function formatMoney(cents, currency = "UAH") {
  const amount = Math.round(Math.abs(Number(cents) || 0) / 100)
  return currency === "EUR" ? `€${amount}` : `${currency} ${amount}`
}

export function formatPriceInput(cents) {
  if (cents == null || cents === "") return ""
  return String(Math.round(Number(cents) / 100))
}

export function parsePriceInput(value) {
  if (value == null) return null
  const normalized = String(value).trim().replace(",", ".")
  if (!normalized) return null
  const number = Number(normalized)
  if (!Number.isFinite(number) || number < 0) return NaN
  return Math.round(number * 100)
}

export function priceSuffix(priceType) {
  return priceType === "per_student" ? " / student" : " / lesson"
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ")
}

function normalizePriceType(mode, priceType) {
  return mode === "individual" ? "per_lesson" : priceType
}

function findDuplicateName(name, excludeId) {
  const needle = name.trim().toLowerCase()
  return state().lessonTypes.find(
    (item) => item.id !== excludeId && item.name.toLowerCase() === needle
  )
}

export function createLessonType(input) {
  const name = normalizeName(input.name)
  if (!name) return { ok: false, message: "name" }
  if (findDuplicateName(name)) return { ok: false, message: "duplicate" }

  const lessonType = {
    id: `lt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    mode: input.mode === "group" ? "group" : "individual",
    defaultDurationMinutes: Number(input.defaultDurationMinutes) || 60,
    defaultPriceCents: Number.isFinite(input.defaultPriceCents) ? input.defaultPriceCents : 0,
    currency: input.currency || "UAH",
    priceType: normalizePriceType(input.mode, input.priceType || "per_lesson"),
    isActive: input.isActive !== false,
    description: input.description || undefined
  }
  const current = state()
  write({ ...current, lessonTypes: [...current.lessonTypes, lessonType] })
  return { ok: true, lessonType }
}

export function updateLessonType(id, patch) {
  const current = state()
  const existing = current.lessonTypes.find((item) => item.id === id)
  if (!existing) return { ok: false, message: "missing" }

  const name = patch.name != null ? normalizeName(patch.name) : existing.name
  if (!name) return { ok: false, message: "name" }
  if (findDuplicateName(name, id)) return { ok: false, message: "duplicate" }

  const mode = patch.mode ?? existing.mode
  const next = {
    ...existing,
    ...patch,
    name,
    mode,
    priceType: normalizePriceType(mode, patch.priceType ?? existing.priceType),
    id: existing.id
  }
  write({
    ...current,
    lessonTypes: current.lessonTypes.map((item) => (item.id === id ? next : item))
  })
  return { ok: true, lessonType: next }
}

export function setLessonTypeActive(id, isActive) {
  return updateLessonType(id, { isActive })
}

export function isLessonTypeInUse(id) {
  const lessonType = getLessonTypeById(id)
  if (!lessonType) return false
  return seedLessons.some((lesson) => {
    if (lesson.lessonTypeId && String(lesson.lessonTypeId) === String(id)) return true
    const snapshot = lesson.lessonTypeName || LEGACY_TYPE_NAMES[lesson.type]
    return snapshot && snapshot.toLowerCase() === lessonType.name.toLowerCase()
  })
}

export function deleteLessonType(id) {
  if (isLessonTypeInUse(id)) {
    updateLessonType(id, { isActive: false })
    return { ok: true, deactivatedInstead: true }
  }
  const current = state()
  write({
    lessonTypes: current.lessonTypes.filter((item) => item.id !== id),
    links: current.links.filter((item) => item.lessonTypeId !== id)
  })
  return { ok: true, deactivatedInstead: false }
}

function teacherMatches(link, teacherId, teacherEmail) {
  if (teacherId && String(link.teacherId) === String(teacherId)) return true
  if (teacherEmail && link.teacherEmail && link.teacherEmail.toLowerCase() === teacherEmail.toLowerCase()) return true
  return false
}

export function listTeacherLinks(teacherId, teacherEmail) {
  return state().links.filter((link) => teacherMatches(link, teacherId, teacherEmail))
}

export function getEffectiveLessonTypesForTeacher(teacherId, teacherEmail) {
  const links = listTeacherLinks(teacherId, teacherEmail)
  return listActiveLessonTypes().map((lessonType) => {
    const link = links.find((item) => item.lessonTypeId === lessonType.id)
    return {
      lessonType,
      enabled: link?.enabled ?? true,
      priceOverrideCents: link?.priceOverrideCents ?? null,
      effectivePriceCents: link?.priceOverrideCents ?? lessonType.defaultPriceCents,
      effectiveCurrency: lessonType.currency
    }
  })
}

export function getBookableLessonTypesForTeacher(teacherId, teacherEmail) {
  return getEffectiveLessonTypesForTeacher(teacherId, teacherEmail).filter((item) => item.enabled)
}

export function saveTeacherLessonTypeAccess(teacherId, teacherEmail, rows) {
  const current = state()
  const untouched = current.links.filter((item) => !teacherMatches(item, teacherId, teacherEmail))
  const upserted = rows.map((row) => {
    const existing = current.links.find(
      (item) => teacherMatches(item, teacherId, teacherEmail) && item.lessonTypeId === row.lessonTypeId
    )
    return {
      id: existing?.id || `tlt-${teacherId || "new"}-${row.lessonTypeId}`,
      teacherId: teacherId || existing?.teacherId || "new",
      teacherEmail: teacherEmail || existing?.teacherEmail,
      lessonTypeId: row.lessonTypeId,
      enabled: row.enabled !== false,
      priceOverrideCents: row.priceOverrideCents ?? null
    }
  })
  write({ ...current, links: [...untouched, ...upserted] })
}

export function lessonTypeNameForLesson(lesson) {
  if (lesson?.lessonTypeName) return lesson.lessonTypeName
  const fromId = lesson?.lessonTypeId && getLessonTypeById(lesson.lessonTypeId)?.name
  if (fromId) return fromId
  return LEGACY_TYPE_NAMES[lesson?.type] || lesson?.type || ""
}

export function uniqueLessonTypeNames() {
  const names = new Set(listLessonTypes().map((item) => item.name))
  seedLessons.forEach((lesson) => {
    const name = lessonTypeNameForLesson(lesson)
    if (name) names.add(name)
  })
  return [...names].sort((a, b) => a.localeCompare(b))
}
