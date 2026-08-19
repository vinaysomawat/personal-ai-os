-- Extends job_alerts_seen (Career's deterministic job-board dedupe log) for
-- the redesigned pipeline: a third source (Ashby, alongside the existing
-- Greenhouse/Lever), plus parsed salary range, matched-skills, and a
-- deterministic 0-100 fit score computed at fetch time (see job-alerts.ts)
-- so the Career page / Telegram can sort and filter "high paying, top
-- companies" without recomputing anything client-side.
alter table job_alerts_seen drop constraint if exists job_alerts_seen_source_check;
alter table job_alerts_seen add constraint job_alerts_seen_source_check
  check (source in ('greenhouse', 'lever', 'ashby'));

alter table job_alerts_seen add column if not exists salary_min integer;
alter table job_alerts_seen add column if not exists salary_max integer;
alter table job_alerts_seen add column if not exists matched_skills text[] not null default '{}';
alter table job_alerts_seen add column if not exists score integer not null default 0;

create index if not exists job_alerts_seen_score_idx on job_alerts_seen (user_id, score desc);
