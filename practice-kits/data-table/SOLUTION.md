# Solution — Employees data table

## Planted bugs (Stage 1)
1. **Numeric columns sort as strings.** `useTable.ts` compares `String(a[key]).localeCompare(String(b[key]))`, so `"120000" < "95000"`. Fix: compare numbers numerically (and dates as ISO strings or timestamps), strings with `localeCompare`/`Intl.Collator`.
   *Reproduce:* sort by Salary ascending: $100,000+ rows come before $60,000 rows.
2. **Off-by-one page count.** `pageCount = Math.floor(total / pageSize)` gives 10 pages for 103 rows, so rows 101–103 are unreachable (and a 5-row result shows "Page 1 of 0"). Fix: `Math.max(1, Math.ceil(total / pageSize))`.
   *Reproduce:* go to the last page: it shows rows 91–100 and Next is disabled.
3. **Filtering doesn't reset or clamp the page.** On page 8, filtering to ~26 rows leaves `page = 7` and shows "No rows". Fix: reset to page 0 when the query changes (or clamp `page` to `pageCount - 1`).
   *Reproduce:* go to page 8, type `Design`.

## Expected feature (Stage 2)
- Team `<select>` (with a `<label>`) whose value combines with the text filter (AND).
- Rows-per-page `<select>`; page size is state, not a constant.
- Any filter or page-size change resets to page 0 or clamps to a valid page; the "Page X of Y" text stays correct.

## Optimization / hardening (Stage 3)
- Sort headers become `<button>`s inside `<th>` with `aria-sort` on the `th`; the filter input gets a label.
- `useMemo` for filtered → sorted → paged (filter deps: rows, query, team; sort deps: sortKey, sortDir), sorting a copy.
- `useDeferredValue` (or a debounce) for the query so typing stays responsive; lowercase the query once, not per row.
- For 10k+ rows: virtualize (or move filtering/sorting/pagination to the server with a cursor) — say which and why.

## What good AI judgment looks like
- Rejecting an AI fix that "solves" the salary sort by sorting numbers with `localeCompare` and `numeric: true` on formatted currency strings, or that wraps everything in `useMemo` without fixing the comparator.
- Verifying the page count with an exact count (103 rows / 10 = 11 pages) rather than eyeballing.
