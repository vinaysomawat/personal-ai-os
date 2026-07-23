-- Job Description + AI analysis per application (Career Stage B).
-- job_description is required by the UI for new applications but stays
-- nullable at the DB level so existing rows remain valid.
alter table applications add column if not exists job_description text;
alter table applications add column if not exists jd_analysis jsonb;
