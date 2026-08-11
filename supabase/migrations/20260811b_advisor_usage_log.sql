-- Lightweight telemetry: which AI advisor panel/tab actually gets opened.
-- No scoring, no UI to view it yet -- queried manually via Supabase SQL
-- Editor after a couple weeks to decide which advisors are worth keeping.

create table if not exists advisor_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  advisor text not null,
  tab text,
  created_at timestamptz not null default now()
);
create index if not exists advisor_usage_log_user_created_idx on advisor_usage_log (user_id, created_at);

alter table advisor_usage_log enable row level security;
create policy "select own advisor_usage_log" on advisor_usage_log
  for select using (auth.uid() = user_id);
create policy "insert own advisor_usage_log" on advisor_usage_log
  for insert with check (auth.uid() = user_id);
create policy "update own advisor_usage_log" on advisor_usage_log
  for update using (auth.uid() = user_id);
create policy "delete own advisor_usage_log" on advisor_usage_log
  for delete using (auth.uid() = user_id);
