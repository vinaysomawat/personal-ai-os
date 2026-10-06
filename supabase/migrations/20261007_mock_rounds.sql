-- Mock Round (Prep tab, replaces Flashcards): one row per finished timed
-- round. items holds each question, the typed answer, the self-grade and
-- seconds spent; bank questions are also graded into question_progress.
-- The flashcards table is left in place (no longer read or written).
create table if not exists mock_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  format text not null check (format in ('screen', 'behavioral', 'system-design')),
  items jsonb not null default '[]',
  score int not null check (score between 0 and 100),
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists mock_rounds_user_created_idx on mock_rounds (user_id, created_at desc);
alter table mock_rounds enable row level security;
create policy "select own mock_rounds" on mock_rounds for select using (auth.uid() = user_id);
create policy "insert own mock_rounds" on mock_rounds for insert with check (auth.uid() = user_id);
create policy "update own mock_rounds" on mock_rounds for update using (auth.uid() = user_id);
create policy "delete own mock_rounds" on mock_rounds for delete using (auth.uid() = user_id);
