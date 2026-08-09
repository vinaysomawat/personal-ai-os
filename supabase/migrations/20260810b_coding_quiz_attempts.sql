-- Coding's "Today's Quiz" — a short daily warm-up trivia quiz (3 questions,
-- picked deterministically by date from a curated pool in code, no AI).
-- One row per user per calendar day (unique on user_id+date); a "Retake"
-- resets and re-saves the same row rather than creating quiz history, since
-- this is a low-stakes warm-up, not a tracked skill signal like Learning's
-- resource_quiz_attempts. question_ids is stored (not re-derived from the
-- date on every read) so a retake always redoes the exact same 3 questions
-- even if the curated pool is edited/expanded later.
create table if not exists coding_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  question_ids jsonb not null,
  answers jsonb not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists coding_quiz_attempts_user_date_idx on coding_quiz_attempts (user_id, date);

alter table coding_quiz_attempts enable row level security;
create policy "select own coding_quiz_attempts" on coding_quiz_attempts
  for select using (auth.uid() = user_id);
create policy "insert own coding_quiz_attempts" on coding_quiz_attempts
  for insert with check (auth.uid() = user_id);
create policy "update own coding_quiz_attempts" on coding_quiz_attempts
  for update using (auth.uid() = user_id);
create policy "delete own coding_quiz_attempts" on coding_quiz_attempts
  for delete using (auth.uid() = user_id);
