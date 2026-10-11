-- v4.0.3: Story Bank rehearsals get a computed 1-10 rating and the full AI
-- scorecard (same system as the Question Bank review).
alter table story_rehearsals add column if not exists rating smallint check (rating between 1 and 10);
alter table story_rehearsals add column if not exists scorecard jsonb;
