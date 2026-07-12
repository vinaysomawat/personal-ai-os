-- Recurring expenses (rent, subscriptions, EMIs-adjacent costs) previously
-- had to be re-logged by hand every month. This lets a template auto-log
-- itself into `expenses` on its scheduled day via a daily cron.
-- day_of_month is capped at 28 to sidestep short-month edge cases.
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  amount numeric not null,
  category text not null,
  day_of_month smallint not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists recurring_expenses_user_idx on recurring_expenses (user_id, active);

alter table recurring_expenses enable row level security;
create policy "select own recurring_expenses" on recurring_expenses
  for select using (auth.uid() = user_id);
create policy "insert own recurring_expenses" on recurring_expenses
  for insert with check (auth.uid() = user_id);
create policy "update own recurring_expenses" on recurring_expenses
  for update using (auth.uid() = user_id);
create policy "delete own recurring_expenses" on recurring_expenses
  for delete using (auth.uid() = user_id);

-- Links an auto-logged expense back to its template, so the cron can tell
-- whether this month's instance has already been logged.
alter table expenses add column if not exists recurring_expense_id uuid references recurring_expenses(id) on delete set null;
