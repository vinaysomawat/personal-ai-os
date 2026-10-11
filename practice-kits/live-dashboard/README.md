# Kit: Live dashboard — from polling to SSE

A Vite + React + TypeScript service-health dashboard over a mock metrics API (served by the Vite dev server — see `vite.config.ts`). It polls today; the API already offers a Server-Sent Events stream.
Work in your own editor **with an AI assistant** (60 minutes, 20 per stage) and verify what it suggests.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Stage 1 — Fix the bugs (20 min)
Users report:
- "The *requests so far* counter climbs much faster than one every 2 seconds, and gets worse each time I change the range."
- "After switching to *Last hour*, the Range tile sometimes still says 24h."
- "The requests-per-second sparkline is empty, and after I change the range it shows a flat stub that never grows."

Find the root causes, fix them, and say how you verified each fix.

## Stage 2 — Add a feature (20 min)
Replace polling with the SSE stream (`/api/metrics/stream?range=…`) using `EventSource`: reconnects, a visible *Live / Reconnecting* status, and switching range swaps the stream cleanly.

## Stage 3 — Optimize and harden (20 min)
- Stop streaming while the tab is hidden; resume when visible.
- The error-rate tile is a colored dot only. Make every tile meaningful without color and to screen readers (including the sparkline).
- Keep re-renders cheap if the stream sends 10 updates a second.

Then fill the three fields in Prep's AI-assisted mock.
