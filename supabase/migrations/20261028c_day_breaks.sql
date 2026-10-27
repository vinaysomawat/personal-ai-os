-- v4.5.1: no automatic breaks — your own breaks for a day, with a start and
-- end time, set in Edit today.
alter table prep_sessions add column if not exists breaks jsonb;
