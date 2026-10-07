-- One AI review per Mock Round (all answers reviewed in a single call),
-- stored so the Mock Interview Calendar can show it again without another
-- AI call. Shape: {verdict, outcome, summary, strengths[], fixes[], notes[]}
-- (notes[i] = the note for items[i]). Null = not reviewed yet.
alter table mock_rounds add column if not exists review jsonb;
