# Kit: Todo sync with optimistic updates

A Vite + React + TypeScript todo list over a small Express API (`server/index.js`, in-memory, realistic latency).
Work in your own editor **with an AI assistant** (60 minutes, 20 per stage) and verify what it suggests.

```bash
npm install
npm run api        # terminal 1 — http://localhost:3002
npm run dev        # terminal 2 — http://localhost:5173 (proxies /api)
```

## Stage 1 — Fix the bugs (20 min)
Users report:
- "The *active* and *done* filters show the same list as *all*."
- "The assignee column takes seconds to fill in, one row at a time."
- "I ticked *Fix flaky checkout test*, it showed as done, but after a reload it's not done."

Find the root causes, fix them (client and/or API — your call, justify it), and say how you verified each fix.

## Stage 2 — Add a feature (20 min)
Add a todo (title input) and **inline edit** of a title, both optimistic, with rollback and a visible error if the server rejects the change.

## Stage 3 — Optimize and harden (20 min)
- Rapidly toggling the same todo can leave the UI and server disagreeing. Make it consistent.
- Reduce request count and latency for the initial load.
- Anything else you'd flag in review (cache invalidation after mutations, error states, accessibility).

Then fill the three fields in Prep's AI-assisted mock.
