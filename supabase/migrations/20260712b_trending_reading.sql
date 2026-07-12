-- Daily trending frontend/AI/Claude reading, fetched from Hacker News's front
-- page. Mirrors coding_daily_questions: one per day, linked to a Planner
-- task, completion syncs both ways (same pattern as the coding question).
create table if not exists trending_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  assigned_date date not null,
  title text not null,
  url text not null,
  source text not null default 'hackernews',
  points integer,
  completed boolean not null default false,
  completed_at timestamptz,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, assigned_date)
);
create index if not exists trending_readings_user_date_idx on trending_readings (user_id, assigned_date);

alter table trending_readings enable row level security;
create policy "select own trending_readings" on trending_readings
  for select using (auth.uid() = user_id);
create policy "insert own trending_readings" on trending_readings
  for insert with check (auth.uid() = user_id);
create policy "update own trending_readings" on trending_readings
  for update using (auth.uid() = user_id);
create policy "delete own trending_readings" on trending_readings
  for delete using (auth.uid() = user_id);
