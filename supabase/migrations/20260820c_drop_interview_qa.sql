-- Second pass of the 2026-08-20 schema-debt cleanup — interview_qa was
-- missed in the first pass (20260820b): it had one remaining reference
-- (Settings' Data Export, src/features/settings/actions.ts), removed in
-- the same change as this migration. Inert since Career Stage C's
-- Interview Q&A bank was replaced by the Interactive Topic Quiz (§3).
drop table if exists interview_qa;
