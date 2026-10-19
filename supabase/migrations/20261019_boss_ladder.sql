-- v4.1 Boss Ladder (Prep): each readiness area under its gate is a boss,
-- beaten in a timed fight of 5 rated answers (1 for coding areas). Lost
-- fights keep a Fix card (the scorecards' missed key points), and the rematch
-- unlocks once it has been read.
create table if not exists prep_fights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null,
  area text not null,
  channel text not null default 'web' check (channel in ('web', 'telegram')),
  -- [{question_id, title, category, hints, body, url, budget_seconds, answer, seconds, rating, card}]
  items jsonb not null default '[]',
  -- Index of the question being answered.
  current int not null default 0,
  gate int not null,
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'abandoned')),
  score numeric(3, 1),
  -- [{question, point, status, note}] — missing / partial key points of a lost fight.
  fix jsonb,
  fix_read_at timestamptz,
  started_at timestamptz not null default now(),
  -- Last answer — a Telegram fight idle 30 min is abandoned.
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists prep_fights_user_date_idx on prep_fights (user_id, date desc);
alter table prep_fights enable row level security;
create policy "select own prep_fights" on prep_fights for select using (auth.uid() = user_id);
create policy "insert own prep_fights" on prep_fights for insert with check (auth.uid() = user_id);
create policy "update own prep_fights" on prep_fights for update using (auth.uid() = user_id);
create policy "delete own prep_fights" on prep_fights for delete using (auth.uid() = user_id);

-- The Boss Ladder deadline ("N bosses left · D days to …"). The column
-- already exists (unused since v4.0.8); set the first target.
alter table prep_settings add column if not exists target_date date;
update prep_settings set target_date = '2026-10-30' where target_date is null;

-- The focus timer is replaced by fights (its block timer and Telegram
-- START / PAUSE / DONE are gone), so its table goes too.
drop table if exists prep_focus_sessions;
