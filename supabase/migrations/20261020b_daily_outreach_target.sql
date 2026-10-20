-- v4.2: outreach is the first block of every Prep day. It ticks when the
-- day's logged outreach (sum of outreach.count, IST date) reaches this
-- target. weekly_outreach_target keeps feeding the funnel and Career score.
alter table prep_settings add column if not exists daily_outreach_target int not null default 10 check (daily_outreach_target between 1 and 100);
