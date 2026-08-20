-- Recurring Expenses removed entirely (2026-08-20) — its cron
-- (recurring-expenses), server actions, UI card, and Telegram commands
-- were all removed in the same change. Payment Calendar was redesigned
-- into a plain day-by-day expense log (computePaymentCalendar in
-- finance/actions.ts), no longer driven by recurring due-dates at all, so
-- expenses.recurring_expense_id has no remaining reader either.
alter table expenses drop column if exists recurring_expense_id;
drop table if exists recurring_expenses;
