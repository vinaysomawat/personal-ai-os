-- Company guides (Prep → Interview tab redesign): one row per company,
-- shared across every interview you ever have there, instead of the old
-- per-JD AI plan (interview_preps.plan, now unused — left in place, harmless).
-- The /interview-prep Claude Code skill now researches into this table,
-- upserting on (user_id, company_key) so a second research run refreshes it.
create table if not exists company_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  company text not null,
  company_key text not null,
  research jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_key)
);
alter table company_guides enable row level security;
create policy "select own company_guides" on company_guides for select using (auth.uid() = user_id);
create policy "insert own company_guides" on company_guides for insert with check (auth.uid() = user_id);
create policy "update own company_guides" on company_guides for update using (auth.uid() = user_id);
create policy "delete own company_guides" on company_guides for delete using (auth.uid() = user_id);

-- The JD paste is now optional on a scheduled interview (the company guide
-- carries the researched content; the JD only adds the deterministic
-- bank/story match bonus when you have one).
alter table interview_preps alter column jd drop not null;
