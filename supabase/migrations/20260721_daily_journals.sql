-- Phase 3 PRD: Daily Auto Journal. One AI-narrated paragraph per day, unique
-- (user_id, date) so a cron retry upserts the same day's entry instead of
-- duplicating it.
create table if not exists daily_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  paragraph text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_journals_user_date_idx on daily_journals (user_id, date);

alter table daily_journals enable row level security;
create policy "select own daily_journals" on daily_journals
  for select using (auth.uid() = user_id);
create policy "insert own daily_journals" on daily_journals
  for insert with check (auth.uid() = user_id);
create policy "update own daily_journals" on daily_journals
  for update using (auth.uid() = user_id);
create policy "delete own daily_journals" on daily_journals
  for delete using (auth.uid() = user_id);
