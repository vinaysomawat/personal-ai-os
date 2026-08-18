-- Fixes a race condition in generateAssignmentForUser() (daily-core.ts):
-- it checked "does today's assignment exist?" then inserted if not, with no
-- atomic guard between the two — concurrent /coding page loads (browser
-- prefetch on hovering the nav link, a reload, dev-server hot-reload) could
-- each pass the check before the first insert landed, each generating and
-- inserting its own full set of picks (and a duplicate Planner task per
-- pick). Observed in production 2026-08-18: 6 overlapping calls in a 3-minute
-- window created 12 duplicate coding_daily_questions rows and 12 duplicate
-- Planner tasks. The unique constraint below turns "claim today's generation"
-- into a single atomic insert: exactly one concurrent caller can succeed,
-- every other caller gets a unique-violation and falls back to reading
-- whatever the winner generated, instead of generating its own duplicate set.
create table if not exists coding_daily_generation_locks (
  user_id uuid not null references auth.users(id),
  assigned_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, assigned_date)
);

alter table coding_daily_generation_locks enable row level security;
create policy "select own coding_daily_generation_locks" on coding_daily_generation_locks
  for select using (auth.uid() = user_id);
create policy "insert own coding_daily_generation_locks" on coding_daily_generation_locks
  for insert with check (auth.uid() = user_id);
create policy "update own coding_daily_generation_locks" on coding_daily_generation_locks
  for update using (auth.uid() = user_id);
create policy "delete own coding_daily_generation_locks" on coding_daily_generation_locks
  for delete using (auth.uid() = user_id);
