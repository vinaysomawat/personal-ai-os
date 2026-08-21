-- Study time logging removed entirely (2026-08-21) — its UI (Log Study
-- Session modal, per-resource Log button, Study Calendar), server actions
-- (logStudySession, computeStudyCalendar), calculations (getStudyStreak,
-- getResourcesNeedingRevision), Dashboard "Learning Streak" stat/Daily
-- Mission item, Career's study-streak badge, the revision auto-re-add
-- feature, and the Needs Attention "resource needs revision" signal were
-- all removed in the same change — none of them has a remaining reader.
drop table if exists study_logs;
