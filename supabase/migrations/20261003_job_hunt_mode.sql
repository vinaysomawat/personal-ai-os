-- v2.1 Job Hunt Mode (ROADMAP-v2.md §9): a target interview date + daily
-- prep hours that scale Today's Prep into a full-day plan, and per-question
-- coverage tracking across the coding_questions bank (theory sprint +
-- every practice category).

-- One row per user. A null target_date = Job Hunt Mode off (normal
-- 45–60 min daily session).
create table if not exists prep_settings (
  user_id uuid primary key references auth.users(id),
  target_date date,
  hours_per_day int not null default 8 check (hours_per_day between 1 and 14),
  updated_at timestamptz not null default now()
);
alter table prep_settings enable row level security;
create policy "select own prep_settings" on prep_settings for select using (auth.uid() = user_id);
create policy "insert own prep_settings" on prep_settings for insert with check (auth.uid() = user_id);
create policy "update own prep_settings" on prep_settings for update using (auth.uid() = user_id);
create policy "delete own prep_settings" on prep_settings for delete using (auth.uid() = user_id);

-- Latest self-grade per question. confident = could answer it in an
-- interview; partial / missed = needs review (also creates a flashcard).
create table if not exists question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  question_id uuid not null references coding_questions(id) on delete cascade,
  status text not null check (status in ('confident', 'partial', 'missed')),
  attempts int not null default 1,
  last_answer text,
  last_seen_at timestamptz not null default now(),
  unique (user_id, question_id)
);
create index if not exists question_progress_user_seen_idx on question_progress (user_id, last_seen_at);
alter table question_progress enable row level security;
create policy "select own question_progress" on question_progress for select using (auth.uid() = user_id);
create policy "insert own question_progress" on question_progress for insert with check (auth.uid() = user_id);
create policy "update own question_progress" on question_progress for update using (auth.uid() = user_id);
create policy "delete own question_progress" on question_progress for delete using (auth.uid() = user_id);

-- Partial/missed questions from the Question Bank become flashcards too.
alter table flashcards drop constraint if exists flashcards_source_check;
alter table flashcards add constraint flashcards_source_check
  check (source in ('career_quiz', 'learning_quiz', 'manual', 'question_bank'));
