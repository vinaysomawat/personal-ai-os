-- Enforces at the DB level the invariant workout-core.ts already documents
-- in a comment: "one active workout at a time" per user, not one per day.
-- generateWorkoutForUser() does a non-atomic check-then-insert (read "is
-- there an active workout?", then insert if not) -- called concurrently
-- from two places (the web app and the Telegram bot), both calls can pass
-- the check before either insert commits, creating two 'pending' rows for
-- the same user. This actually happened in production (two rows 0.4s
-- apart), and surfaced as: completing one workout still showed the stray
-- duplicate as open. This partial unique index makes the losing concurrent
-- insert fail loudly instead of silently creating a duplicate.

create unique index if not exists daily_workouts_one_active_per_user
on daily_workouts (user_id)
where status in ('pending', 'in_progress');
