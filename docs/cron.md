# Scheduled jobs (Vercel Cron)

Daily-only schedules (Vercel Hobby). Every job checks `Authorization: Bearer $CRON_SECRET` (an unset secret means silent 401s), resolves the single user, and calls `logCronRun()` so `cron-health-check` and Settings → System Health can spot a stale job (`EXPECTED_CRON_JOBS` in `src/lib/cron-log.ts`, kept equal to `vercel.json`).

| Job | UTC / IST | Bot | What it does |
| --- | --- | --- | --- |
| `reminders-morning` | `30 3 * * *` / 9:00am | Daily | Morning-slot reminders; silent when there are none. No AI. |
| `reminders-evening` | `0 16 * * *` / 9:30pm | Daily | "📌 Still open" (no expense today, an open workout, health metrics stale ≥3 days via `computeStaleMetrics()`, `stillOpenLine()` in `prep/coach.ts`) + evening-slot reminders; silent when there is nothing. No AI. |
| `weekly-digest` | `30 2 * * 0` / Sun 8am | Daily | 7-day module averages, best/worst day, a short AI review (`weekly_digest`, 6h cache), weekly spend by category. **No-op in Interview War Mode.** |
| `monthly-digest` | `40 2 * * *` / 8:10am | Daily | Same over 30 days, sends only on the 1st (IST). **No-op in Interview War Mode.** |
| `astrology-daily` | `0 4 * * *` / 9:30am | Astrology | Panchang + daily reading in Hindi. **No-op in Interview War Mode.** |
| `cron-health-check` | `0 4 * * *` / 9:30am | Daily | Alerts on any stale job; silent when healthy. |
