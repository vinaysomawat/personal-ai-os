-- v4.2: one rest day a week (IST weekday, 0 = Sunday … 6 = Saturday). On it
-- the Prep plan is empty, the streak carries over, the 1pm nudge is skipped
-- and the coach sends a short rest-day message.
alter table prep_settings add column if not exists rest_day smallint not null default 0 check (rest_day between 0 and 6);
