-- v4.2: a nightly mood / energy check-in (reply to the 9:30pm coach message,
-- e.g. "mood 3 energy 4"). One row per user per IST day, last reply wins.
create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table mood_logs enable row level security;
create policy "select own mood_logs" on mood_logs for select using (auth.uid() = user_id);
create policy "insert own mood_logs" on mood_logs for insert with check (auth.uid() = user_id);
create policy "update own mood_logs" on mood_logs for update using (auth.uid() = user_id);
create policy "delete own mood_logs" on mood_logs for delete using (auth.uid() = user_id);
