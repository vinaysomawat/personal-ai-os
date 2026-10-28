-- AI engineering path (Prep → AI tab): one row per ticked step of a roadmap
-- week (src/features/prep/roadmap.ts, 5 steps a week, step is 0-based).
create table if not exists roadmap_steps (
  user_id uuid not null references auth.users(id),
  week int not null check (week between 1 and 13),
  step int not null check (step between 0 and 9),
  done_at timestamptz not null default now(),
  primary key (user_id, week, step)
);
alter table roadmap_steps enable row level security;
create policy "select own roadmap_steps" on roadmap_steps for select using (auth.uid() = user_id);
create policy "insert own roadmap_steps" on roadmap_steps for insert with check (auth.uid() = user_id);
create policy "update own roadmap_steps" on roadmap_steps for update using (auth.uid() = user_id);
create policy "delete own roadmap_steps" on roadmap_steps for delete using (auth.uid() = user_id);
