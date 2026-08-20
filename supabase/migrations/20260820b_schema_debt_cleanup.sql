-- Schema debt cleanup — drops tables/columns confirmed to have zero
-- remaining code readers as of this migration (verified by grepping all of
-- src/, not just trusting old doc comments). Two of these (trending_readings,
-- health_profile.target_weight_kg/goal_deadline) required removing their
-- last live code references first — see the same commit that adds this file.
--
-- goals: superseded by financial_goals, zero .from('goals') calls anywhere.
-- coding_quiz_attempts: superseded by coding_daily_questions' category
--   system (quiz.md), zero .from('coding_quiz_attempts') calls anywhere.
-- investments SIP columns: SIP tracking was removed 2026-08-10, zero
--   references to any of the four columns anywhere.
-- health_metrics.sleep_hours/water_ml: Sleep and Water Intake tracking were
--   removed end-to-end 2026-08-13, zero references anywhere.
-- resume_versions: zero .from('resume_versions') calls anywhere; only
--   inbound reference is applications.resume_version_id's FK, dropped below
--   before the table (the column itself stays — still typed/selected, just
--   no longer FK-constrained to anything).
-- trending_readings: was still getting a live UPDATE on every task
--   completion (planner/actions.ts, telegram/handler.ts) despite being
--   called "legacy" in comments — that code was removed in this same
--   change, so the table is now genuinely unreferenced.
-- health_profile.target_weight_kg/goal_deadline: were still round-tripped
--   through upsert()/select('*') on every profile save despite always being
--   null — those references were removed in this same change.

drop table if exists goals;
drop table if exists coding_quiz_attempts;

alter table investments
  drop column if exists is_sip,
  drop column if exists sip_amount,
  drop column if exists sip_day_of_month,
  drop column if exists sip_last_contribution_month;

alter table health_metrics
  drop column if exists sleep_hours,
  drop column if exists water_ml;

alter table applications drop constraint if exists applications_resume_version_id_fkey;
drop table if exists resume_versions;

drop table if exists trending_readings;

alter table health_profile
  drop column if exists target_weight_kg,
  drop column if exists goal_deadline;
