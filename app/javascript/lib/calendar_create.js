export function teacherName(teacher) {
  if (!teacher) return ""
  return teacher.displayName || [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || "Teacher"
}

export function studentName(student) {
  if (!student) return ""
  return [student.preferredName || student.firstName, student.lastName].filter(Boolean).join(" ")
}

export function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function rangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA)
}

export function timeToMinutes(value) {
  const [h, m] = String(value || "00:00").split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function inactiveStatus(status) {
  return ["cancelled", "cancelled_charged", "cancelled_not_charged", "completed", "no_show"].includes(String(status))
}

export function checkTeacherAvailability(teacher, date, startTime, endTime, lessons, ignoreId) {
  if (!teacher) return { kind: "unknown", message: "unknown" }
  const dayName = weekdayNameFromDate(parseDateKey(date))
  const workingDays = Array.isArray(teacher.workingDays) ? teacher.workingDays : []
  if (dayName && workingDays.length > 0 && !workingDays.includes(dayName)) {
    return { kind: "outside_hours", message: "outside_day" }
  }
  const hours = (Array.isArray(teacher.workingHours) ? teacher.workingHours : []).find((row) => row.day === dayName)
  if (hours?.startTime && hours?.endTime) {
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)
    if (start < timeToMinutes(hours.startTime) || end > timeToMinutes(hours.endTime)) {
      return { kind: "outside_hours", message: "outside_hours", hours }
    }
  }
  const name = teacherName(teacher)
  const conflict = (lessons || []).find((lesson) => {
    if (ignoreId && String(lesson.id) === String(ignoreId)) return false
    if (inactiveStatus(lesson.status)) return false
    const sameTeacher = String(lesson.teacherId || "") === String(teacher.id) || lesson.teacher === name
    if (!sameTeacher) return false
    if (lesson.date !== date) return false
    return rangesOverlap(startTime, endTime, lesson.startTime, lesson.endTime)
  })
  if (conflict) return { kind: "booked", message: "booked", conflict }
  return { kind: "available", message: "available" }
}

export function findStudentConflicts(studentIds, date, startTime, endTime, lessons, ignoreId) {
  const conflicts = []
  for (const studentId of studentIds) {
    const lesson = (lessons || []).find((item) => {
      if (ignoreId && String(item.id) === String(ignoreId)) return false
      if (inactiveStatus(item.status)) return false
      if (item.date !== date) return false
      const ids = item.studentIds || []
      const involves = ids.length > 0 ? ids.map(String).includes(String(studentId)) : String(item.studentId) === String(studentId)
      if (!involves) return false
      return rangesOverlap(startTime, endTime, item.startTime, item.endTime)
    })
    if (lesson) conflicts.push({ studentId, lesson })
  }
  return conflicts
}

export function generateOccurrenceDates(date, repeat, repeatEnd, weekdays = []) {
  if (!repeat || repeat === "none" || !repeatEnd) return [date]
  const dates = []
  const start = parseDateKey(date)
  const end = parseDateKey(repeatEnd)
  if (repeat === "custom") {
    const wanted = new Set((weekdays.length ? weekdays : [weekdayNameFromDate(start)]).map(String))
    let cursor = new Date(start)
    while (cursor <= end && dates.length < 60) {
      if (wanted.has(weekdayNameFromDate(cursor))) dates.push(toDateKey(cursor))
      cursor = addDays(cursor, 1)
    }
    return dates.length ? dates : [date]
  }
  const step = repeat === "biweekly" ? 14 : 7
  let cursor = new Date(start)
  while (cursor <= end && dates.length < 52) {
    dates.push(toDateKey(cursor))
    cursor = addDays(cursor, step)
  }
  return dates
}

export function summarizeRecurrence(repeat, dates, until) {
  const count = dates.length
  if (repeat === "weekly") return { key: "repeat_weekly_summary", count, until }
  if (repeat === "biweekly") return { key: "repeat_biweekly_summary", count, until }
  return { key: "repeat_custom_summary", count, until }
}

function parseDateKey(value) {
  const [year, month, day] = String(value).split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function weekdayNameFromDate(date) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()]
}
