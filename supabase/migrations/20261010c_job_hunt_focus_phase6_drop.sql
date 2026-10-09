-- v4.0 Job Hunt Focus, Phase 6: drop schema left behind by removed features
-- (Planner, Learning, Coding, tips, flashcards, quizzes, job alerts, XP,
-- Brain patterns, journals, briefings). No app code reads or writes any of
-- it any more. A full JSON backup of every row was taken first
-- (backups/2026-10-10-v4-phase6/, local only).

-- Columns first: task_id columns reference tasks.
alter table coding_daily_questions drop column if exists task_id;
alter table daily_workouts drop column if exists task_id;
alter table mock_rounds drop column if exists score;
alter table question_progress drop column if exists status;
alter table life_score_logs drop column if exists learning_score;

-- cascade only removes leftover FK constraints from other dead tables
-- (trending_readings.task_id, study_logs.resource_id); it drops no columns
-- or tables beyond these.
drop table if exists resource_quiz_attempts cascade;
drop table if exists resources cascade;
drop table if exists tasks cascade;
drop table if exists learning_tips cascade;
drop table if exists coding_tips cascade;
drop table if exists health_tips cascade;
drop table if exists daily_tips_log cascade;
drop table if exists flashcards cascade;
drop table if exists quiz_attempts cascade;
drop table if exists job_alerts_seen cascade;
drop table if exists user_xp cascade;
drop table if exists brain_patterns cascade;
drop table if exists daily_journals cascade;
drop table if exists daily_briefings cascade;
drop table if exists coding_settings cascade;
drop table if exists coding_daily_generation_locks cascade;
