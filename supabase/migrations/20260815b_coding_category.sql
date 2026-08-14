-- Generalizes the Coding module's daily-question pool beyond algorithm
-- questions (quiz.md) without a new table: 'quiz' and 'system-design'
-- questions live in the same coding_questions pool, distinguished by this
-- one column, so the existing daily-assignment/streak/Planner-sync/
-- weak-area/Life-Score machinery picks them up for free. Existing 336 rows
-- default to 'algorithm', unaffected.
alter table coding_questions add column if not exists category text not null default 'algorithm';
