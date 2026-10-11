# Kit: City autocomplete

A Vite + React + TypeScript autocomplete over a mock search API (served by the Vite dev server — see `vite.config.ts`).
Work in your own editor **with an AI assistant** (60 minutes, 20 per stage) and verify what it suggests.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Stage 1 — Fix the bugs (20 min)
Users report:
- "I typed `ber` and got Bangkok and Barcelona."
- "Typing fires a request on every keystroke, even though there's a debounce."
- "Pressing Enter before picking anything crashes the page."

Find the root causes, fix them, and say how you verified each fix (the Network panel is your friend).

## Stage 2 — Add a feature (20 min)
Highlight the matching part of each suggestion (e.g. **Ber**lin) without introducing an XSS hole, and show a "No cities match" row and a loading state.

## Stage 3 — Optimize and harden (20 min)
- Make it a proper accessible combobox (screen reader + keyboard: arrows wrap or clamp, Enter, Escape, click outside closes).
- Don't refetch a query you already have results for; handle network errors.
- Anything else you'd flag in review.

Then fill the three fields in Prep's AI-assisted mock.
