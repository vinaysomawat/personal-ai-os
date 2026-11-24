-- Telegram /quiz (Daily bot): 8 questions per quiz, 6 MCQ as native quiz
-- polls + 2 descriptive with a spoiler answer and self-grade buttons.
-- Scoring is Telegram-only by design: nothing here is read by the web app,
-- and quizzes never write question_progress / readiness.

-- Generated quiz versions of bank questions. A global cache like
-- coding_questions (no user_id): each bank question is turned into an MCQ
-- or descriptive item by AI once, ever, and reused by every later quiz.
-- One row per (question, kind) because a non-behavioral question can be
-- used in either slot. Behavioral/resume questions only ever get 'descriptive'
-- (enforced in app code, which knows the category).
create table if not exists quiz_items (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references coding_questions(id) on delete cascade,
  kind text not null check (kind in ('mcq', 'descriptive')),
  -- Telegram limits: poll question 1-300 chars, explanation 0-200 chars.
  -- Per-option 100-char limit is checked in app code (a check constraint
  -- can't loop over array elements without a helper function).
  stem text not null check (char_length(stem) between 1 and 300),
  options text[],
  correct_index smallint,
  note text check (note is null or char_length(note) <= 200),
  short_answer text,
  created_at timestamptz not null default now(),
  unique (question_id, kind),
  -- An MCQ has 2-10 options and a correct_index inside them. A descriptive
  -- item has no options and does have a short answer for the spoiler.
  check (
    (kind = 'mcq'
      and cardinality(options) between 2 and 10
      and correct_index between 0 and cardinality(options) - 1)
    or
    (kind = 'descriptive'
      and options is null and correct_index is null
      and short_answer is not null)
  )
);
-- RLS on with no policies: only the service-role client (the Telegram
-- webhook) can read or write. Anon/authenticated keys see nothing.
alter table quiz_items enable row level security;

-- One quiz run. item_ids is the fixed question order, current_index the
-- position of the question currently out (0-based).
create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category text not null,
  item_ids uuid[] not null check (cardinality(item_ids) between 1 and 20),
  current_index smallint not null default 0 check (current_index >= 0),
  status text not null default 'active' check (status in ('active', 'done', 'abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
-- At most one active quiz per user. Also the race guard: if Telegram retries
-- a slow webhook, the second insert fails here instead of creating a
-- duplicate quiz. Doubles as the index for "find my active session".
create unique index if not exists quiz_sessions_one_active
  on quiz_sessions (user_id) where status = 'active';
alter table quiz_sessions enable row level security;
create policy "select own quiz_sessions" on quiz_sessions for select using (auth.uid() = user_id);
create policy "insert own quiz_sessions" on quiz_sessions for insert with check (auth.uid() = user_id);
create policy "update own quiz_sessions" on quiz_sessions for update using (auth.uid() = user_id);
create policy "delete own quiz_sessions" on quiz_sessions for delete using (auth.uid() = user_id);

-- One row per question sent. Created when the question goes out, filled in
-- (answered_at + correct or self_grade) when it's answered.
create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  item_id uuid not null references quiz_items(id) on delete cascade,
  position smallint not null check (position >= 0),
  -- Set for MCQs from sendPoll's returned poll.id. A poll_answer update only
  -- carries this id, so it's the lookup key (unique = indexed).
  poll_id text unique,
  message_id bigint,
  correct boolean,
  self_grade numeric(2,1) check (self_grade in (0, 0.5, 1)),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  -- Each position is sent once per session.
  unique (session_id, position),
  -- An answer is graded one way only: MCQ -> correct, descriptive -> self_grade.
  check (correct is null or self_grade is null)
);
alter table quiz_answers enable row level security;
create policy "select own quiz_answers" on quiz_answers for select using (auth.uid() = user_id);
create policy "insert own quiz_answers" on quiz_answers for insert with check (auth.uid() = user_id);
create policy "update own quiz_answers" on quiz_answers for update using (auth.uid() = user_id);
create policy "delete own quiz_answers" on quiz_answers for delete using (auth.uid() = user_id);
