-- v4.5: the Prep day is a template (your sessions, breaks, minutes per
-- category per weekday) with today's own start and an optional interview.
-- Levels, the rest day and the day-end setting are removed.
alter table prep_settings add column if not exists day_template jsonb;
alter table prep_settings alter column day_start_min set default 660;
update prep_settings set day_start_min = 660;
alter table prep_sessions add column if not exists start_min smallint check (start_min between 0 and 1439);
alter table prep_sessions add column if not exists interview jsonb;
alter table prep_settings drop column if exists hours_per_day;
alter table prep_settings drop column if exists rest_day;
alter table prep_settings drop column if exists day_end_min;
