# Kit: Employees data table

A small Vite + React + TypeScript app: an employee table with filtering, sorting and pagination over 103 rows.
Work in your own editor **with an AI assistant**, the way an AI-assisted coding round runs (60 minutes, 20 per stage).
Verify everything the AI suggests — you're scored on what you checked, not on what you pasted.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
```

## Stage 1 — Fix the bugs (20 min)
Users report:
- "Sorting by salary puts $100,000+ people above people earning $60,000."
- "I can never see the last few employees."
- "I filtered by `Design` and the table said *No rows*, but there are designers."

Find the root causes, fix them, and say how you verified each fix.

## Stage 2 — Add a feature (20 min)
Add a **Team** dropdown filter (All / Platform / Growth / Payments / Design) that combines with the text filter, and a **rows per page** selector (10 / 25 / 50). Changing either keeps the user on a valid page.

## Stage 3 — Optimize and harden (20 min)
- The header is keyboard- and screen-reader-hostile. Fix it.
- Derived rows are recomputed on every render. Make filtering/sorting cheap, and keep typing in the filter smooth at 10,000 rows.
- Anything else a senior reviewer would flag before shipping.

When you're done, fill the three fields in Prep's AI-assisted mock: what changed per stage, the bugs you found and how you verified each, and the AI suggestions you rejected and why.
