-- study_logs was in active use by the app (Learning's "+ Log session",
-- study streak, revision nudge, Dashboard's Today's Progress) but was
-- missing from the live database — not present in Postgres, and no prior
-- migration in this repo ever created it, meaning it was likely set up
-- directly via the SQL Editor at some point outside tracked migrations
-- and never actually applied to production, or was dropped without a
-- corresponding migration. Recreating it here with the exact shape the
-- app code already expects (src/features/learning/types.ts's StudyLog).
create table if not exists study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  resource_id uuid references resources(id) on delete set null,
  duration_minutes integer not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists study_logs_user_date_idx on study_logs (user_id, date);

alter table study_logs enable row level security;
create policy "select own study_logs" on study_logs
  for select using (auth.uid() = user_id);
create policy "insert own study_logs" on study_logs
  for insert with check (auth.uid() = user_id);
create policy "update own study_logs" on study_logs
  for update using (auth.uid() = user_id);
create policy "delete own study_logs" on study_logs
  for delete using (auth.uid() = user_id);
