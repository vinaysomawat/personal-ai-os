-- Drop tables and columns no code reads or writes (rows backed up locally
-- before this ran): the old job-hunt pipeline (applications, interview_rounds,
-- interview_questions, outreach), the boss ladder (prep_fights), mood_logs,
-- and prep_settings' outreach targets / target date.
drop table if exists interview_questions;
drop table if exists interview_rounds;
drop table if exists outreach;
drop table if exists applications;
drop table if exists prep_fights;
drop table if exists mood_logs;

alter table prep_settings drop column if exists weekly_outreach_target;
alter table prep_settings drop column if exists daily_outreach_target;
alter table prep_settings drop column if exists target_date;
