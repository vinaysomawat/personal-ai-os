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

// The current instant, pre-shifted so that reading it out with `timeZone:
// 'UTC'` (or any getUTC* getter) yields IST calendar digits — same trick as
// todayIST()'s toISOString() split, generalized for callers that need more
// than just the date, e.g. a human-readable label or the current hour.
function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS)
}

// "Wednesday, August 10" — for user-facing greetings/briefings. Must be
// formatted with an explicit UTC timeZone (not the runtime's default, which
// on a server is UTC anyway but shouldn't be assumed) so it reads the
// pre-shifted IST digits rather than re-shifting them again.
export function todayISTLabel(): string {
  return nowIST().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

// The current IST hour-of-day (0-23) — for time-of-day greetings computed
// server-side, where a plain `new Date().getHours()` reflects the server's
// runtime timezone (UTC on Vercel), not IST.
export function istHour(): number {
  return nowIST().getUTCHours()
}

// "HH:MM" in IST — for comparing against local-time strings already stored
// in this shape (e.g. Choghadiya block start/end, panchang sunrise/sunset).
export function nowISTHHMM(): string {
  const d = nowIST()
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
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

// ---------------- Prep day (rolls over at 4am IST) ----------------
// Prep's day window can run past midnight (default 12:00 → 01:00), so its
// "today" — plan, block ticks, streak, pace, focus time — rolls over at
// 04:00 IST instead of midnight: work at 12:30am still counts for the day
// it started. Everything else in the app keeps the IST calendar day.
export const PREP_DAY_ROLLOVER_HOUR = 4
const PREP_DAY_OFFSET_MS = IST_OFFSET_MS - PREP_DAY_ROLLOVER_HOUR * 3600_000

export function prepToday(): string {
  return new Date(Date.now() + PREP_DAY_OFFSET_MS).toISOString().split('T')[0]
}

export function toPrepDateStr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getTime() + PREP_DAY_OFFSET_MS).toISOString().split('T')[0]
}

// Prep date N days before today's prep date.
export function prepDaysAgo(n: number): string {
  const p = new Date(Date.now() + PREP_DAY_OFFSET_MS)
  return new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() - n)).toISOString().split('T')[0]
}

// The UTC instant a prep day starts (04:00 IST), N days ago — for
// timestamptz comparisons.
export function prepDayStartUtc(daysAgo = 0): string {
  const p = new Date(Date.now() + PREP_DAY_OFFSET_MS)
  return new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() - daysAgo) - PREP_DAY_OFFSET_MS).toISOString()
}
