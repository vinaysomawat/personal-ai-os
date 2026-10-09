-- v4.0 Job Hunt Focus, Phase 4 (additive): close the loop between real
-- interviews and prep.

-- 4.1 Real interview questions feed the Question Bank.
alter table interview_questions add column if not exists topic text;
alter table interview_questions add column if not exists bank_question_id uuid references coding_questions(id) on delete set null;

-- 4.3 Post-interview debrief prompt (sent once per round).
alter table interview_rounds add column if not exists debrief_sent_at timestamptz;

-- 4.5 Outreach and pipeline tracking.
create table if not exists outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  company text not null,
  person text,
  channel text not null default 'application' check (channel in ('referral', 'linkedin', 'recruiter', 'application', 'other')),
  count int not null default 1 check (count >= 1),
  status text not null default 'sent' check (status in ('sent', 'replied', 'referred', 'screen', 'no_response', 'closed')),
  sent_at date not null default current_date,
  follow_up_on date,
  notes text,
  application_id uuid references applications(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists outreach_user_sent_idx on outreach (user_id, sent_at desc);
alter table outreach enable row level security;
create policy "select own outreach" on outreach for select using (auth.uid() = user_id);
create policy "insert own outreach" on outreach for insert with check (auth.uid() = user_id);
create policy "update own outreach" on outreach for update using (auth.uid() = user_id);
create policy "delete own outreach" on outreach for delete using (auth.uid() = user_id);

alter table prep_settings add column if not exists weekly_outreach_target int not null default 15;

-- 4.6 Voice drill over Telegram.
create table if not exists telegram_drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  question_id uuid not null references coding_questions(id) on delete cascade,
  asked_at timestamptz not null default now(),
  answered_at timestamptz,
  transcript text,
  rating int check (rating between 1 and 10),
  critique text
);
create index if not exists telegram_drills_user_asked_idx on telegram_drills (user_id, asked_at desc);
alter table telegram_drills enable row level security;
create policy "select own telegram_drills" on telegram_drills for select using (auth.uid() = user_id);
create policy "insert own telegram_drills" on telegram_drills for insert with check (auth.uid() = user_id);
create policy "update own telegram_drills" on telegram_drills for update using (auth.uid() = user_id);
create policy "delete own telegram_drills" on telegram_drills for delete using (auth.uid() = user_id);
