-- v4.4: your own Prep day window (minutes after IST midnight; an end earlier
-- than the start runs past midnight). Pace and the Today timeline use it;
-- the Prep day itself rolls over at 04:00 IST. Default 12:00 → 01:00.
alter table prep_settings add column if not exists day_start_min smallint not null default 720 check (day_start_min between 0 and 1439);
alter table prep_settings add column if not exists day_end_min smallint not null default 60 check (day_end_min between 0 and 1439);
