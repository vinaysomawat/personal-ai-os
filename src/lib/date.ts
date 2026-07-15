// IST is UTC+5:30. `new Date().toISOString().split('T')[0]` is UTC-based
// regardless of where it runs (server or browser — toISOString() always
// normalizes to UTC), which is wrong for this app's single India-based user
// for roughly 5.5 hours every day: from IST midnight (18:30 UTC the previous
// day) until UTC midnight, the two calendars disagree on what day it is.
// Every "today" boundary in the app — health metrics, coding streaks, task
// due dates, budget months, daily tips/reads, cron-posted expenses — should
// agree on the same calendar day, so this is the one place that math lives.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function todayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().split('T')[0]
}

export function toISTDateStr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().split('T')[0]
}

// The UTC instant corresponding to IST midnight on an arbitrary "YYYY-MM-DD"
// calendar date — for comparing against timestamptz columns (e.g. a month-start
// boundary), where a plain date-string concatenation would silently assume
// UTC midnight instead.
export function istDateStrToUtcMidnight(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS).toISOString()
}

// The UTC instant corresponding to the start of "today" in IST — for
// comparing against timestamptz columns, where a plain date-string boundary
// would silently assume UTC midnight instead.
export function istMidnightUtc(daysAgo = 0): string {
  const istNow = new Date(Date.now() + IST_OFFSET_MS)
  const istMidnightAsUtc = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo)
  return new Date(istMidnightAsUtc - IST_OFFSET_MS).toISOString()
}

// IST calendar date N days before today, as a "YYYY-MM-DD" string — for
// rolling-window queries (e.g. "since 14 days ago").
export function daysAgoIST(n: number): string {
  const istNow = new Date(Date.now() + IST_OFFSET_MS)
  const d = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - n))
  return d.toISOString().split('T')[0]
}
