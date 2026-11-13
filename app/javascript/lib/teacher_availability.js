export const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

let slotCounter = 0

export function newSlotId() {
  slotCounter += 1
  return `slot-${Date.now().toString(36)}-${slotCounter}`
}

export function minutesOf(time) {
  const [h, m] = String(time || "").split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

export function sortSlots(slots) {
  return [...slots].sort(
    (a, b) =>
      WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) ||
      minutesOf(a.startTime) - minutesOf(b.startTime) ||
      minutesOf(a.endTime) - minutesOf(b.endTime)
  )
}

export function slotsForDay(slots, day) {
  return sortSlots(slots.filter((slot) => slot.day === day))
}

export function totalSlotMinutes(slots) {
  return slots.reduce((sum, slot) => sum + Math.max(0, minutesOf(slot.endTime) - minutesOf(slot.startTime)), 0)
}

export function timelineBounds(slots) {
  let start = 8 * 60
  let end = 20 * 60
  slots.forEach((slot) => {
    const s = minutesOf(slot.startTime)
    const e = minutesOf(slot.endTime)
    if (e <= s) return
    start = Math.min(start, Math.floor(s / 60) * 60)
    end = Math.max(end, Math.ceil(e / 60) * 60)
  })
  return { start, end }
}

export function describeSlotUse(slot, labels) {
  const lessonTypeId = slot.lessonTypeId || "any"
  const lt =
    lessonTypeId === "any"
      ? labels.anyLessonType || labels.anyLesson || "Any lesson type"
      : labels.lessonTypes?.[lessonTypeId] || lessonTypeId
  const fmt = labels.format[slot.format] || slot.format
  if (lessonTypeId === "any" && slot.format === "any") return labels.anyLesson || "Any lesson"
  if (lessonTypeId === "any") return `${fmt} lessons`
  if (slot.format === "any") return `${lt} lessons`
  return `${lt} · ${fmt}`
}

export function describeSlot(slot, labels) {
  return `${slot.startTime}–${slot.endTime} (${describeSlotUse(slot, labels)})`
}

export function validateSlots(slots, labels = {}) {
  const errors = {}
  const valid = []
  const invalidTime = labels.invalidTime || "Enter a start and end time."
  const invalidOrder = labels.invalidOrder || "End time must be later than start time."
  const overlap = labels.overlap || "Overlaps with another slot on this day."

  slots.forEach((slot) => {
    if (!TIME_PATTERN.test(slot.startTime) || !TIME_PATTERN.test(slot.endTime)) {
      errors[slot.id] = invalidTime
    } else if (minutesOf(slot.endTime) <= minutesOf(slot.startTime)) {
      errors[slot.id] = invalidOrder
    } else {
      valid.push(slot)
    }
  })

  WEEK_DAYS.forEach((day) => {
    const daySlots = slotsForDay(valid, day)
    let widest
    daySlots.forEach((slot) => {
      if (widest && minutesOf(slot.startTime) < minutesOf(widest.endTime)) {
        errors[slot.id] = overlap.replace("%{other}", describeSlot(widest, labels))
      }
      if (!widest || minutesOf(slot.endTime) > minutesOf(widest.endTime)) widest = slot
    })
  })
  return errors
}

function clampTime(minutes) {
  const value = Math.min(Math.max(minutes, 0), 23 * 60 + 59)
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
}

export function suggestSlot(day, daySlots) {
  const last = daySlots.at(-1)
  if (!last) {
    return { id: newSlotId(), day, startTime: "09:00", endTime: "12:00", lessonType: "any", lessonTypeId: "any", format: "any" }
  }
  const start = Math.min(minutesOf(last.endTime), 22 * 60)
  return {
    id: newSlotId(),
    day,
    startTime: clampTime(start),
    endTime: clampTime(start + 120),
    lessonType: "any",
    lessonTypeId: last.lessonTypeId || "any",
    format: last.format
  }
}

export function parseLessonCatalog(raw) {
  try {
    const data = JSON.parse(raw || "[]")
    if (!Array.isArray(data)) return []
    return data
  } catch {
    return []
  }
}

export function mergeSubjectCatalogs(workspace, draft) {
  const byKey = new Map()
  ;[...workspace, ...draft].forEach((subject) => {
    const key = String(subject.name || subject.id || "").toLowerCase()
    if (!key) return
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        ...subject,
        lessonTypes: [...(subject.lessonTypes || subject.lesson_types || [])]
      })
      return
    }
    const ids = new Set((existing.lessonTypes || []).map((type) => String(type.id)))
    ;(subject.lessonTypes || subject.lesson_types || []).forEach((type) => {
      const id = String(type.id)
      if (!id || ids.has(id)) return
      existing.lessonTypes.push(type)
      ids.add(id)
    })
  })
  return [...byKey.values()]
}

export function lessonTypeLabelMap(subjects) {
  const map = {}
  subjects.forEach((subject) => {
    const subjectName = String(subject.name || "").trim()
    ;(subject.lessonTypes || subject.lesson_types || []).forEach((type) => {
      if (type.isActive === false) return
      const id = String(type.id)
      if (!id) return
      const name = String(type.name || "").trim()
      map[id] = subjectName && name ? `${subjectName} · ${name}` : name || subjectName
    })
  })
  return map
}

export function normalizeAvailabilitySlot(slot) {
  let lessonTypeId = slot.lessonTypeId
  if (!lessonTypeId) lessonTypeId = slot.lessonType === "any" || !slot.lessonType ? "any" : "any"
  return { ...slot, lessonType: "any", lessonTypeId: String(lessonTypeId) }
}

export function legacySlotsFromTeacher(teacher) {
  const days = Array.isArray(teacher.workingDays) ? teacher.workingDays : []
  const formats = Array.isArray(teacher.lessonFormats) ? teacher.lessonFormats : []
  const format = legacyFormat(formats)
  return days.map((day) => {
    const hours = (teacher.workingHours || []).find((row) => row.day === day)
    return {
      id: `slot-legacy-${teacher.id || "new"}-${day}`,
      day,
      startTime: hours?.startTime || "00:00",
      endTime: hours?.endTime || "23:59",
      lessonType: "any",
      lessonTypeId: "any",
      format
    }
  })
}

function legacyFormat(formats) {
  const online = formats.includes("online")
  const inPerson = formats.includes("in_person")
  if (formats.includes("hybrid") || (online && inPerson)) return "any"
  if (online) return "online"
  if (inPerson) return "in_person"
  return "any"
}

export function initialSlots(teacher) {
  if (Array.isArray(teacher?.availabilitySlots) && teacher.availabilitySlots.length > 0) {
    return sortSlots(teacher.availabilitySlots.map((slot) => normalizeAvailabilitySlot(slot)))
  }
  if (Array.isArray(teacher?.workingDays) && teacher.workingDays.length > 0) {
    return legacySlotsFromTeacher(teacher)
  }
  return []
}
