-- Interview Q&A revision loop: mirrors the 14-day-idle revision rule already
-- used by Learning (study_logs activity) and Coding (completed_at), but
-- interview_qa has no existing "last touched" signal to anchor on, so this
-- adds one. Null until explicitly reviewed; falls back to created_at as the
-- "first touch" anchor so a freshly-added item isn't immediately stale.
alter table interview_qa add column if not exists last_reviewed_at timestamptz;
