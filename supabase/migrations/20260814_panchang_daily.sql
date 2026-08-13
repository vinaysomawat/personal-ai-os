-- Global daily Hindu calendar pool, no user_id -- same pattern as
-- coding_questions/workout_library. One row per calendar date, computed
-- once and reused everywhere "today's panchang" is needed rather than
-- recomputed per request. No RLS needed since there's nothing user-scoped
-- to protect here (same rationale as those other global tables) -- read
-- access still gated to authenticated users via a role-scoped select
-- policy, writes are service-role only (computed server-side, not user input).

create table if not exists panchang_daily (
  date date primary key,
  tithi text not null,
  paksha text not null,
  nakshatra text not null,
  yoga text not null,
  karana text not null,
  sunrise text not null,
  sunset text not null,
  rahu_kalam_start text not null,
  rahu_kalam_end text not null,
  yamaganda_start text not null,
  yamaganda_end text not null,
  gulika_kalam_start text not null,
  gulika_kalam_end text not null,
  created_at timestamptz not null default now()
);

alter table panchang_daily enable row level security;
create policy "select panchang_daily" on panchang_daily
  for select using (auth.role() = 'authenticated');
