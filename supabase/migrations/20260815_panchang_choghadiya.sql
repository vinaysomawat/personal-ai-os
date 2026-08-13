-- Adds the Choghadiya time-block strip (astrology.md 3.9) to the existing
-- panchang_daily row -- 8 day + 8 night blocks, computed deterministically
-- from sunrise/sunset (no AI), stored as jsonb same as every other
-- computed-array field elsewhere in this app (e.g. natal_chart's planets).
alter table panchang_daily add column if not exists choghadiya jsonb;
