-- v4.1.1: the daily question plan and its focus timer are back on Today
-- (the Boss Ladder moved to its own tab), so the focus table returns, empty.
create table if not exists prep_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  block_key text not null,
  label text not null,
  planned_minutes int not null default 0,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  paused_seconds int not null default 0,
  interruptions int not null default 0,
  ended_at timestamptz,
  actual_seconds int,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned'))
);
create index if not exists prep_focus_sessions_user_date_idx on prep_focus_sessions (user_id, date);
alter table prep_focus_sessions enable row level security;
create policy "select own prep_focus_sessions" on prep_focus_sessions for select using (auth.uid() = user_id);
create policy "insert own prep_focus_sessions" on prep_focus_sessions for insert with check (auth.uid() = user_id);
create policy "update own prep_focus_sessions" on prep_focus_sessions for update using (auth.uid() = user_id);
create policy "delete own prep_focus_sessions" on prep_focus_sessions for delete using (auth.uid() = user_id);
