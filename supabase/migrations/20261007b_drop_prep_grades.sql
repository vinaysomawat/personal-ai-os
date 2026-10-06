-- Prep self-grading (Missed / Partial / Confident) removed 2026-10-07: a
-- question is now just seen (answer + last_seen_at), and a Mock Round has no
-- score. Old values are kept, no longer read.
alter table question_progress alter column status drop not null;
alter table mock_rounds alter column score drop not null;
