-- When a resource was marked completed — lets the Life Score's Learning
-- sub-score count completions in the last 30 days (a habit signal) instead
-- of a completed/total backlog ratio. Set on every transition to
-- 'completed' (web, Planner sync, Telegram) and cleared when moved off it.
alter table resources add column if not exists completed_at timestamptz;

-- Backfill: resources have no historical completion timestamp, so existing
-- completed rows approximate it with created_at (daily reads are typically
-- read the day they're picked).
update resources
set completed_at = created_at
where status = 'completed' and completed_at is null;
