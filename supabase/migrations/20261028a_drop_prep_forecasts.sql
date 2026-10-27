-- v4.5: the weekly "if you interviewed tomorrow" forecast is removed (its
-- Sonnet call, the Today card and the cron that generated it), so its table
-- goes too.
drop table if exists prep_forecasts;
