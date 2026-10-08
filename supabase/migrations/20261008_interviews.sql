-- Career → Interviews (v3.4): a company is added once a phone screen
-- happens; each one has interview rounds and a log of every question the
-- interviewers asked. Job alerts and the topic quiz are gone (their tables,
-- job_alerts_seen and quiz_attempts, are kept, unused).

-- 'withdrawn' added; 'applied' stays valid for old rows but isn't offered.
alter table applications drop constraint if exists applications_status_check;
alter table applications add constraint applications_status_check
  check (status in ('applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'));

create table if not exists interview_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  application_id uuid not null references applications(id) on delete cascade,
  kind text not null default 'technical' check (kind in ('recruiter', 'phone_screen', 'technical', 'coding', 'system_design', 'behavioral', 'hiring_manager', 'onsite', 'other')),
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled')),
  outcome text not null default 'pending' check (outcome in ('pending', 'passed', 'failed')),
  interviewer text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists interview_rounds_user_scheduled_idx on interview_rounds (user_id, scheduled_at);
alter table interview_rounds enable row level security;
create policy "select own interview_rounds" on interview_rounds for select using (auth.uid() = user_id);
create policy "insert own interview_rounds" on interview_rounds for insert with check (auth.uid() = user_id);
create policy "update own interview_rounds" on interview_rounds for update using (auth.uid() = user_id);
create policy "delete own interview_rounds" on interview_rounds for delete using (auth.uid() = user_id);

create table if not exists interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  application_id uuid not null references applications(id) on delete cascade,
  round_id uuid references interview_rounds(id) on delete set null,
  question text not null,
  category text not null default 'technical' check (category in ('technical', 'coding', 'system_design', 'behavioral', 'ai_native', 'other')),
  my_answer text,
  went text check (went in ('well', 'ok', 'badly')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists interview_questions_user_created_idx on interview_questions (user_id, created_at desc);
alter table interview_questions enable row level security;
create policy "select own interview_questions" on interview_questions for select using (auth.uid() = user_id);
create policy "insert own interview_questions" on interview_questions for insert with check (auth.uid() = user_id);
create policy "update own interview_questions" on interview_questions for update using (auth.uid() = user_id);
create policy "delete own interview_questions" on interview_questions for delete using (auth.uid() = user_id);
