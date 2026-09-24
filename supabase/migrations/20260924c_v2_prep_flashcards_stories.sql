-- v2.0 (ROADMAP-v2.md): Flashcards (spaced repetition), Story Bank
-- (behavioral/leadership STAR stories + rehearsal critiques), and Today's
-- Prep sessions. All per-user with the standard 4 RLS policies.

-- Flashcards — auto-created from wrong quiz answers (Career topic quiz,
-- Learning resource quiz) plus manual cards. SM-2-style scheduling fields;
-- all scheduling math is deterministic app code.
create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  front text not null,
  back text not null,
  topic text,
  source text not null default 'manual' check (source in ('career_quiz', 'learning_quiz', 'manual')),
  -- Dedupe key for auto-created cards ("<attempt id>:<question index>"), so
  -- re-syncing never duplicates a card. Null for manual cards.
  source_ref text,
  ease numeric not null default 2.5,
  interval_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  due_date date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, source_ref)
);
create index if not exists flashcards_user_due_idx on flashcards (user_id, due_date);
alter table flashcards enable row level security;
create policy "select own flashcards" on flashcards for select using (auth.uid() = user_id);
create policy "insert own flashcards" on flashcards for insert with check (auth.uid() = user_id);
create policy "update own flashcards" on flashcards for update using (auth.uid() = user_id);
create policy "delete own flashcards" on flashcards for delete using (auth.uid() = user_id);

-- Story Bank — STAR stories tagged by leadership competency.
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  competencies text[] not null default '{}',
  situation text,
  task text,
  action text,
  result text,
  metrics text,
  strength int check (strength between 1 and 5),
  last_rehearsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stories_user_idx on stories (user_id);
alter table stories enable row level security;
create policy "select own stories" on stories for select using (auth.uid() = user_id);
create policy "insert own stories" on stories for insert with check (auth.uid() = user_id);
create policy "update own stories" on stories for update using (auth.uid() = user_id);
create policy "delete own stories" on stories for delete using (auth.uid() = user_id);

-- Rehearsal log — a "Tell me about a time…" prompt, the typed answer, and
-- the AI critique. story_id is null when rehearsing a competency with no
-- story yet.
create table if not exists story_rehearsals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  story_id uuid references stories(id) on delete set null,
  competency text not null,
  prompt text not null,
  answer text not null,
  critique text,
  created_at timestamptz not null default now()
);
create index if not exists story_rehearsals_user_idx on story_rehearsals (user_id, created_at desc);
alter table story_rehearsals enable row level security;
create policy "select own story_rehearsals" on story_rehearsals for select using (auth.uid() = user_id);
create policy "insert own story_rehearsals" on story_rehearsals for insert with check (auth.uid() = user_id);
create policy "update own story_rehearsals" on story_rehearsals for update using (auth.uid() = user_id);
create policy "delete own story_rehearsals" on story_rehearsals for delete using (auth.uid() = user_id);

-- Today's Prep — one sequenced session per day; blocks is the day's plan
-- ([{key, label, minutes, href, done}]), generated deterministically.
create table if not exists prep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  focus text not null,
  blocks jsonb not null default '[]',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table prep_sessions enable row level security;
create policy "select own prep_sessions" on prep_sessions for select using (auth.uid() = user_id);
create policy "insert own prep_sessions" on prep_sessions for insert with check (auth.uid() = user_id);
create policy "update own prep_sessions" on prep_sessions for update using (auth.uid() = user_id);
create policy "delete own prep_sessions" on prep_sessions for delete using (auth.uid() = user_id);
