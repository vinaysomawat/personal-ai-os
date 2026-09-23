-- The month a loan's remaining_months count was last set. Effective months
-- left are derived at read time as remaining_months − calendar months since
-- this date (see loanEffectiveRemainingMonths in
-- src/features/finance/calculations.ts), so the count ticks down on its own
-- instead of freezing at the last manual edit. Always the 1st of a month.
alter table loans add column if not exists remaining_months_as_of date;

-- Backfill existing loans to the month they were added (assumes months left
-- hasn't been edited since creation — confirmed for the only existing loan).
update loans
set remaining_months_as_of = date_trunc('month', created_at)::date
where remaining_months_as_of is null;
