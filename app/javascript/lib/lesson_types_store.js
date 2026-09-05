const STORAGE_KEY = "danlio.lesson-types.v3"

const LEGACY_TYPE_NAMES = {
  individual: "Individual lesson",
  group: "Group lesson",
  trial: "Trial lesson",
  consultation: "Consultation"
}

const KIND_NAMES = {
  individual: "Individual",
  group: "Group",
  trial: "Trial"
}

let lessonTypes = []
let links = []
let seedLessons = []
let pendingSubjects = []

function readStored() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.lessonTypes) || !Array.isArray(parsed?.links)) return null
    return {
      lessonTypes: parsed.lessonTypes.map(normalizeType),
      links: parsed.links,
      pendingSubjects: Array.isArray(parsed.pendingSubjects) ? parsed.pendingSubjects.map(normalizeName).filter(Boolean) : []
    }
  } catch {
    return null
  }
}

function persist() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ lessonTypes, links, pendingSubjects }))
  } catch {
    // Private mode or blocked storage — in-memory catalog still works.
  }
}

function inferKind(item) {
  if (item.kind) return item.kind
  const name = String(item.name || "").toLowerCase()
  if (name.includes("trial")) return "trial"
  if (name.includes("group") && item.mode === "group") return "group"
  if (name.includes("individual")) return "individual"
  return "custom"
}

function normalizeType(item) {
  const kind = inferKind(item)
  const isFree = item.isFree === true || (item.isFree == null && kind === "trial")
  return {
    ...item,
    subjectName: normalizeName(item.subjectName) || "General",
    kind,
    isFree,
    defaultPriceCents: isFree ? 0 : item.defaultPriceCents
  }
}

export function initLessonTypesStore(seed = {}) {
  seedLessons = Array.isArray(seed.lessons) ? seed.lessons : seedLessons
  const seededTypes = (Array.isArray(seed.lessonTypes) ? seed.lessonTypes : []).map(normalizeType)
  const seededLinks = Array.isArray(seed.links) ? seed.links : []
  const stored = readStored()

  if (stored?.lessonTypes?.length) {
    lessonTypes = stored.lessonTypes.map(normalizeType)
    links = stored.links
    const have = new Set(lessonTypes.map((item) => item.id))
    seededTypes.forEach((item) => {
      if (!have.has(item.id)) lessonTypes.push(item)
    })
  } else {
    lessonTypes = seededTypes
    links = seededLinks
  }
  pendingSubjects = stored?.pendingSubjects || []
  persist()
}

export function listLessonTypes() {
  return [...lessonTypes].sort(
    (a, b) => a.subjectName.localeCompare(b.subjectName) || a.name.localeCompare(b.name)
  )
}

export function listSubjectNames() {
  return [...new Set(listLessonTypes().map((item) => item.subjectName))]
}

export function listPendingSubjects() {
  return [...pendingSubjects]
}

export function addPendingSubject(name) {
  const trimmed = normalizeName(name)
  if (!trimmed) return { ok: false, message: "subject" }
  const names = [...listSubjectNames(), ...pendingSubjects]
  if (names.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, message: "duplicate_lesson" }
  }
  pendingSubjects = [...pendingSubjects, trimmed]
  persist()
  return { ok: true, name: trimmed }
}

export function removePendingSubject(name) {
  const needle = normalizeName(name).toLowerCase()
  pendingSubjects = pendingSubjects.filter((item) => item.toLowerCase() !== needle)
  persist()
}

export function listActiveLessonTypes() {
  return listLessonTypes().filter((item) => item.isActive)
}

export function getLessonTypeById(id) {
  return lessonTypes.find((item) => String(item.id) === String(id))
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

export function lessonTypeDisplayName(item) {
  if (!item) return ""
  return item.subjectName ? `${item.subjectName} · ${item.name}` : item.name
}

export function kindDisplayName(kind, customName) {
  if (kind === "custom") return normalizeName(customName)
  return KIND_NAMES[kind] || normalizeName(customName)
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ")
}

function normalizePriceType(mode, priceType) {
  return mode === "individual" ? "per_lesson" : priceType
}

function findDuplicateName(subjectName, name, excludeId) {
  const subjectNeedle = String(subjectName || "").trim().toLowerCase()
  const nameNeedle = String(name || "").trim().toLowerCase()
  return lessonTypes.find(
    (item) =>
      item.id !== excludeId &&
      item.subjectName.toLowerCase() === subjectNeedle &&
      item.name.toLowerCase() === nameNeedle
  )
}

export function createLessonType(input) {
  const subjectName = normalizeName(input.subjectName)
  if (!subjectName) return { ok: false, message: "subject" }
  const kind = input.kind || inferKind(input)
  const name = normalizeName(input.name) || (kind === "custom" ? "" : kindDisplayName(kind))
  if (!name) return { ok: false, message: "name" }
  if (findDuplicateName(subjectName, name)) return { ok: false, message: "duplicate" }

  const isFree = input.isFree === true
  const lessonType = {
    id: `lt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subjectName,
    kind,
    name,
    mode: input.mode === "group" ? "group" : "individual",
    defaultDurationMinutes: Number(input.defaultDurationMinutes) || 60,
    defaultPriceCents: isFree ? 0 : (Number.isFinite(input.defaultPriceCents) ? input.defaultPriceCents : 0),
    currency: input.currency || "UAH",
    priceType: normalizePriceType(input.mode, input.priceType || "per_lesson"),
    isFree,
    isActive: input.isActive !== false,
    description: input.description || undefined
  }
  lessonTypes = [...lessonTypes, lessonType]
  persist()
  return { ok: true, lessonType }
}

export function updateLessonType(id, patch) {
  const existing = lessonTypes.find((item) => item.id === id)
  if (!existing) return { ok: false, message: "missing" }

  const subjectName = patch.subjectName != null ? normalizeName(patch.subjectName) : existing.subjectName
  if (!subjectName) return { ok: false, message: "subject" }
  const kind = patch.kind ?? existing.kind
  const name = patch.name != null
    ? (normalizeName(patch.name) || (kind === "custom" ? "" : kindDisplayName(kind)))
    : existing.name
  if (!name) return { ok: false, message: "name" }
  if (findDuplicateName(subjectName, name, id)) return { ok: false, message: "duplicate" }

  const mode = patch.mode ?? existing.mode
  const isFree = patch.isFree ?? existing.isFree
  const next = {
    ...existing,
    ...patch,
    subjectName,
    kind,
    name,
    mode,
    priceType: normalizePriceType(mode, patch.priceType ?? existing.priceType),
    defaultPriceCents: isFree ? 0 : (patch.defaultPriceCents ?? existing.defaultPriceCents),
    isFree,
    id: existing.id
  }
  lessonTypes = lessonTypes.map((item) => (item.id === id ? next : item))
  persist()
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
  lessonTypes = lessonTypes.filter((item) => item.id !== id)
  links = links.filter((item) => item.lessonTypeId !== id)
  persist()
  return { ok: true, deactivatedInstead: false }
}

export function renameSubject(oldName, newName) {
  const trimmed = normalizeName(newName)
  if (!trimmed) return { ok: false, message: "subject" }
  const oldNeedle = String(oldName || "").trim().toLowerCase()
  const names = [...listSubjectNames(), ...pendingSubjects]
  if (
    trimmed.toLowerCase() !== oldNeedle &&
    names.some((name) => name.toLowerCase() === trimmed.toLowerCase())
  ) {
    return { ok: false, message: "duplicate_lesson" }
  }

  lessonTypes = lessonTypes.map((item) =>
    item.subjectName.toLowerCase() === oldNeedle ? { ...item, subjectName: trimmed } : item
  )
  pendingSubjects = pendingSubjects.map((name) => (name.toLowerCase() === oldNeedle ? trimmed : name))
  persist()
  return { ok: true }
}

export function deleteSubject(subjectName) {
  const needle = String(subjectName || "").trim().toLowerCase()
  const types = lessonTypes.filter((item) => item.subjectName.toLowerCase() === needle)
  types.forEach((item) => deleteLessonType(item.id))
  pendingSubjects = pendingSubjects.filter((name) => name.toLowerCase() !== needle)
  persist()
  return { ok: true }
}

function teacherMatches(link, teacherId, teacherEmail) {
  if (teacherId && String(link.teacherId) === String(teacherId)) return true
  if (teacherEmail && link.teacherEmail && link.teacherEmail.toLowerCase() === teacherEmail.toLowerCase()) return true
  return false
}

export function listTeacherLinks(teacherId, teacherEmail) {
  return links.filter((link) => teacherMatches(link, teacherId, teacherEmail))
}

export function getEffectiveLessonTypesForTeacher(teacherId, teacherEmail) {
  const teacherLinks = listTeacherLinks(teacherId, teacherEmail)
  return listActiveLessonTypes().map((lessonType) => {
    const link = teacherLinks.find((item) => item.lessonTypeId === lessonType.id)
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
  const untouched = links.filter((item) => !teacherMatches(item, teacherId, teacherEmail))
  const upserted = rows.map((row) => {
    const existing = links.find(
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
  links = [...untouched, ...upserted]
  persist()
}

export function lessonTypeNameForLesson(lesson) {
  if (lesson?.lessonTypeName) return lesson.lessonTypeName
  const fromId = lesson?.lessonTypeId && getLessonTypeById(lesson.lessonTypeId)
  if (fromId) return lessonTypeDisplayName(fromId)
  return LEGACY_TYPE_NAMES[lesson?.type] || lesson?.type || ""
}

export function uniqueLessonTypeNames() {
  const names = new Set(listLessonTypes().map((item) => lessonTypeDisplayName(item)))
  seedLessons.forEach((lesson) => {
    const name = lessonTypeNameForLesson(lesson)
    if (name) names.add(name)
  })
  return [...names].sort((a, b) => a.localeCompare(b))
}
