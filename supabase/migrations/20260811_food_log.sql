-- Health bot: log food/drink by name + quantity, AI-estimated calories/protein
-- (or a bare AI-estimated total already computed elsewhere). Mirrors the
-- existing `workouts` table pattern (ad-hoc log with undo-by-id).

create table if not exists food_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null default current_date,
  item text not null,
  quantity numeric,
  unit text,
  calories numeric not null,
  protein_g numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists food_log_user_date_idx on food_log (user_id, date);

alter table food_log enable row level security;
create policy "select own food_log" on food_log
  for select using (auth.uid() = user_id);
create policy "insert own food_log" on food_log
  for insert with check (auth.uid() = user_id);
create policy "update own food_log" on food_log
  for update using (auth.uid() = user_id);
create policy "delete own food_log" on food_log
  for delete using (auth.uid() = user_id);
