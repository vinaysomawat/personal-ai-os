-- Phase 4 PRD: Executive Dashboard's Morning Brief. Stores just the
-- AI-written paragraph from the daily-briefing cron (not the deterministic
-- task/expense sections, which the Dashboard already shows elsewhere) so it
-- can be displayed in-app without a fresh AI call on every page load.
create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  message text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_briefings_user_date_idx on daily_briefings (user_id, date);

alter table daily_briefings enable row level security;
create policy "select own daily_briefings" on daily_briefings
  for select using (auth.uid() = user_id);
create policy "insert own daily_briefings" on daily_briefings
  for insert with check (auth.uid() = user_id);
create policy "update own daily_briefings" on daily_briefings
  for update using (auth.uid() = user_id);
create policy "delete own daily_briefings" on daily_briefings
  for delete using (auth.uid() = user_id);
