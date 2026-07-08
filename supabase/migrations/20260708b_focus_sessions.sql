-- Focus/deep-work session logging (PRD-v2 Productivity pillar: "focus sessions",
-- "deep work" — previously untracked anywhere in the app).
create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  duration_minutes integer not null,
  label text,
  notes text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_date_idx on focus_sessions (user_id, date);

alter table focus_sessions enable row level security;
create policy "select own focus sessions" on focus_sessions
  for select using (auth.uid() = user_id);
create policy "insert own focus sessions" on focus_sessions
  for insert with check (auth.uid() = user_id);
create policy "update own focus sessions" on focus_sessions
  for update using (auth.uid() = user_id);
create policy "delete own focus sessions" on focus_sessions
  for delete using (auth.uid() = user_id);
