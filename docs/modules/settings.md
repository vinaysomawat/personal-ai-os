# Settings (`/settings`)

- **Account** — email, **Export as JSON** (deterministic backup: Career (profile, skills), Finance, Health, coding question history, reminders, Life Score history), Sign out.
- **AI Budget** — a plan-style card: "Anthropic API · AI Gateway" with the ceilings, this month's spend large on the right, then a "% left" meter each for today and this month (env-only ceilings), spend by module (`TASK_MODULE`) and top 5 by task (`TASK_LABEL`, `src/lib/ai-task-modules.ts`; usage rows from removed tasks fall under Shared).
- **System Health** — each cron's last run from `cron_runs` (healthy / stale / never-seen, `getCronJobHealth()`), as `sm:grid-cols-2` tiles with a status-coloured left border (good / risk / grey).
- **Reminders** — label, module, morning/evening slot, active. Delivered by the reminder crons at 9:00am (morning slot) and 9:30pm (evening slot).
