-- Learning module upgrades: estimated time per resource, and a real graded
-- quiz (multiple-choice, scored) replacing the old ungraded flashcard quiz —
-- needed so quiz results can identify weak areas per category.

alter table resources add column if not exists estimated_minutes integer;

-- One row per completed quiz attempt. resource_id is nullable (set null on
-- resource delete) and resource_title/category are denormalized so weak-area
-- tracking for a category survives the underlying resource being removed —
-- the whole point is a durable per-category skill signal, not a per-resource one.
create table if not exists resource_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  resource_id uuid references resources(id) on delete set null,
  resource_title text not null,
  category text not null,
  questions jsonb not null,
  user_answers jsonb not null,
  score integer not null,
  total integer not null,
  weak_areas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists resource_quiz_attempts_user_idx on resource_quiz_attempts (user_id);
create index if not exists resource_quiz_attempts_user_category_idx on resource_quiz_attempts (user_id, category);

alter table resource_quiz_attempts enable row level security;
create policy "select own resource_quiz_attempts" on resource_quiz_attempts
  for select using (auth.uid() = user_id);
create policy "insert own resource_quiz_attempts" on resource_quiz_attempts
  for insert with check (auth.uid() = user_id);
create policy "update own resource_quiz_attempts" on resource_quiz_attempts
  for update using (auth.uid() = user_id);
create policy "delete own resource_quiz_attempts" on resource_quiz_attempts
  for delete using (auth.uid() = user_id);
