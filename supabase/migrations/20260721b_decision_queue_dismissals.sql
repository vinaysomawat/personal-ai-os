-- Phase 4 PRD: Executive Dashboard's Decision Queue. Risks/Opportunities are
-- recomputed fresh every day from live data (not stored history) — dismissing
-- one just means "don't show me this kind of item for the rest of today,"
-- keyed by a stable `kind` slug rather than the day's specific numbers in the
-- text. Naturally resets tomorrow since the underlying checks re-run daily.
create table if not exists decision_queue_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  kind text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date, kind)
);
create index if not exists decision_queue_dismissals_user_date_idx on decision_queue_dismissals (user_id, date);

alter table decision_queue_dismissals enable row level security;
create policy "select own decision_queue_dismissals" on decision_queue_dismissals
  for select using (auth.uid() = user_id);
create policy "insert own decision_queue_dismissals" on decision_queue_dismissals
  for insert with check (auth.uid() = user_id);
create policy "update own decision_queue_dismissals" on decision_queue_dismissals
  for update using (auth.uid() = user_id);
create policy "delete own decision_queue_dismissals" on decision_queue_dismissals
  for delete using (auth.uid() = user_id);
