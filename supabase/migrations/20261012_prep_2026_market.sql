-- v4.1 (2026-10-12): Prep extended for the 2026 interview market.
-- Schema only. The new Question Bank rows (backend, code-review, ai-assisted,
-- full-stack system design) are seeded by scripts/seed-prep-2026.mjs with the
-- service client, because code diffs contain characters the SQL Editor
-- splits statements on. Safe to re-run.

-- 1) Code-review questions carry a diff / code body shown above the answer.
alter table coding_questions add column if not exists body text;

-- 2) Two new Mock Round formats.
alter table mock_rounds drop constraint if exists mock_rounds_format_check;
alter table mock_rounds add constraint mock_rounds_format_check
  check (format in ('screen', 'behavioral', 'system-design', 'machine-coding', 'code-review', 'ai-assisted'));

-- 3) Company segment on outreach and companies (funnel by segment, company prep by segment).
alter table outreach add column if not exists segment text not null default 'other';
alter table outreach drop constraint if exists outreach_segment_check;
alter table outreach add constraint outreach_segment_check
  check (segment in ('big_tech', 'product_india', 'startup', 'ai_company', 'service', 'remote_global', 'other'));
alter table applications add column if not exists segment text not null default 'other';
alter table applications drop constraint if exists applications_segment_check;
alter table applications add constraint applications_segment_check
  check (segment in ('big_tech', 'product_india', 'startup', 'ai_company', 'service', 'remote_global', 'other'));

-- 4) A broad search needs more outreach: new default 25/week (existing rows keep their value).
alter table prep_settings alter column weekly_outreach_target set default 25;
