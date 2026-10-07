-- Interview War Mode (Prep, v3.2): stored answer ratings, focus sessions
-- and the weekly "if you interviewed tomorrow" forecast.

-- Latest AI rating (1–10) of this question's answer — from the Question
-- Bank's AI review or a Mock Round review. Feeds topic weakness, readiness
-- and the revision queue.
alter table question_progress add column if not exists last_rating int check (last_rating between 1 and 10);
alter table question_progress add column if not exists last_rated_at timestamptz;

-- One row per START on a Today's Prep block. Time is wall-clock minus
-- pauses; each pause counts as an interruption.
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

-- Weekly AI forecast ("if you interviewed tomorrow…"), one per user per day
-- it was generated.
create table if not exists prep_forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  forecast jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table prep_forecasts enable row level security;
create policy "select own prep_forecasts" on prep_forecasts for select using (auth.uid() = user_id);
create policy "insert own prep_forecasts" on prep_forecasts for insert with check (auth.uid() = user_id);
create policy "update own prep_forecasts" on prep_forecasts for update using (auth.uid() = user_id);
create policy "delete own prep_forecasts" on prep_forecasts for delete using (auth.uid() = user_id);
