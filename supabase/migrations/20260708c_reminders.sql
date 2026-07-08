-- User-configurable reminders (PRD-v2 Telegram Philosophy: reduce reliance on
-- hardcoded schedules). Content is configurable via chat; delivery piggybacks
-- on the existing daily-briefing (morning) and evening-checkin (evening) cron
-- windows rather than a new cron, since this project's Vercel plan only
-- supports daily-granularity schedules, not arbitrary/sub-daily times.
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  module text not null,
  label text not null,
  slot text not null check (slot in ('morning', 'evening')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_slot_idx on reminders (user_id, slot, active);

alter table reminders enable row level security;
create policy "select own reminders" on reminders
  for select using (auth.uid() = user_id);
create policy "insert own reminders" on reminders
  for insert with check (auth.uid() = user_id);
create policy "update own reminders" on reminders
  for update using (auth.uid() = user_id);
create policy "delete own reminders" on reminders
  for delete using (auth.uid() = user_id);
