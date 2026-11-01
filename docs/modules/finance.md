# Finance (`/finance`)

Expenses and budgets scoped to the current calendar month. Tabs: **Expenses / Portfolio / History**.

- **Expenses** — amount, category (Food/Transport/Housing/Health/Shopping/Entertainment/Learning/Utilities/EMIs/Bills/Family/Travel/Other), description, date.
- **Budgets** — one per category per month; a month without a row inherits the category's latest prior amount on load. Remove sets 0 (stays carried forward as 0).
- **Month pace** (`projectMonthSpend()`, shared with the `budget_pace` risk): EMIs count once, everything else extrapolates at this month's daily rate. Drives By Category's stats (Spent, Budget, Left/Over, Month-end pace, ₹/day left) and the "On pace to save X% of salary" header chip.
- **Budget suggestions** (`suggestBudgets()`): per-category average of the last 3 complete months, rounded up to ₹500; review list with Apply all.
- **Over-budget banner** — worst overage first (top 3), ignoring overages under 2% (`FINANCE_THRESHOLDS.overBudgetBannerMinRatio`).
- **Finance profile** (`finance_profile`): `monthly_salary` (changes append to `salary_history`), `emergency_fund_months`, **`liquid_savings`**.
- **Runway** = `runwayMonths(liquid_savings, rolling 3-month average spend)` (`calculations.ts`; red <3, amber <6, green ≥6). Shown as the 4th stat tile (liquid savings inline-editable), in the Hunt Hero, the Money Advisor context and the Finance bot's net-worth reply.
- **Loans** — name, principal, emi, interest_rate, remaining_months (+ `remaining_months_as_of`; live months left = stored − calendar months since, `loanEffectiveRemainingMonths()`), all inline-editable. Total Debt = outstanding principal (`loanOutstanding()`: present value of remaining EMIs at the rate), with "₹X payable incl. interest" as a sub-line. Each row: owed · % repaid · payoff month + repaid bar. EMIs are informational — the actual payment is expected as a logged expense.
- **Investments** — name, type, invested, current value (inline-editable, manual), sorted by current value with ₹ and % return.
- **Financial goals** — name, target, current, target date (shows ₹/mo needed), priority.
- **Spending History** (History tab) — 12-month bar chart + the selected month's category pie (recharts, lazy; Pie needs `isAnimationActive={false}`).
- **Money Advisor** (header) — Q&A (`finance_advisor`, Sonnet, uncached) over salary, EMIs, 3-month average spend, free cash (`salary − avg spend`; EMIs already inside it), runway, portfolio, goals, emergency-fund target.
