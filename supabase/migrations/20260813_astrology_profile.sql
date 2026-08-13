-- Single-row-per-user birth profile + computed natal chart, same shape as
-- health_profile/career_profile. natal_chart holds the fully-computed chart
-- (planet positions, houses, nakshatras, Vimshottari Dasha timeline) --
-- computed once on profile save, never recomputed on read.
--
-- Privacy note: birth date/time/place is more identifying than most data in
-- this schema. Standard RLS applies -- no special handling beyond what
-- every other table already does, but worth being deliberate about here.

create table if not exists astrology_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  birth_date date not null,
  birth_time time not null,
  birth_place_name text not null,
  birth_lat double precision not null,
  birth_lng double precision not null,
  birth_timezone double precision not null,
  natal_chart jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table astrology_profile enable row level security;
create policy "select own astrology_profile" on astrology_profile
  for select using (auth.uid() = user_id);
create policy "insert own astrology_profile" on astrology_profile
  for insert with check (auth.uid() = user_id);
create policy "update own astrology_profile" on astrology_profile
  for update using (auth.uid() = user_id);
create policy "delete own astrology_profile" on astrology_profile
  for delete using (auth.uid() = user_id);
