-- AI Engineer tab (Prep): one row per finished week of the 13-week Build
-- roadmap (src/features/prep/roadmap.ts), with the proof that it shipped.
create table if not exists roadmap_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  week int not null check (week between 1 and 13),
  -- A PR, commit or demo link.
  proof_url text,
  -- The one number that shows it works (e.g. "recall@5 0.82").
  metric text,
  notes text,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week)
);
alter table roadmap_progress enable row level security;
create policy "select own roadmap_progress" on roadmap_progress for select using (auth.uid() = user_id);
create policy "insert own roadmap_progress" on roadmap_progress for insert with check (auth.uid() = user_id);
create policy "update own roadmap_progress" on roadmap_progress for update using (auth.uid() = user_id);
create policy "delete own roadmap_progress" on roadmap_progress for delete using (auth.uid() = user_id);
