-- Interview prep from a job description (Prep → Interview tab): the pasted
-- JD, the interview slot, the deterministic match against the question bank
-- (matched), the AI prep plan (plan), and online research saved by the
-- /interview-prep Claude Code skill (research).
create table if not exists interview_preps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  company text not null,
  role text,
  round text,
  jd text not null,
  interview_date date not null,
  start_min int check (start_min between 0 and 1800),
  minutes int not null default 60 check (minutes between 15 and 240),
  matched jsonb,
  plan jsonb,
  research jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists interview_preps_user_date_idx on interview_preps (user_id, interview_date desc);
alter table interview_preps enable row level security;
create policy "select own interview_preps" on interview_preps for select using (auth.uid() = user_id);
create policy "insert own interview_preps" on interview_preps for insert with check (auth.uid() = user_id);
create policy "update own interview_preps" on interview_preps for update using (auth.uid() = user_id);
create policy "delete own interview_preps" on interview_preps for delete using (auth.uid() = user_id);
