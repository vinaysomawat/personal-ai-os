# Practice kits — AI-assisted coding rounds

Six small multi-file projects for practising the 2026 "AI-assisted coding" interview round (Meta: a multi-file codebase with an AI assistant, bug → feature → optimize; Google: an unfamiliar codebase with Gemini). You're scored on **verifying** the AI's output, not on how much it wrote.

Each kit is a standalone Vite + React + TypeScript app (two also have a tiny Express API):

| Kit | Theme | API |
|---|---|---|
| [data-table](data-table) | Sort, filter, paginate 103 rows | — |
| [autocomplete](autocomplete) | Debounced search with out-of-order responses | Vite mock |
| [streaming-chat](streaming-chat) | Streaming LLM-style chat over SSE | Express |
| [file-uploader](file-uploader) | Multi-file upload with progress | Vite mock |
| [todo-sync](todo-sync) | Optimistic updates against a flaky API | Express |
| [live-dashboard](live-dashboard) | Polling → Server-Sent Events | Vite mock |

## How to run a round (60 min)
1. Start it from Prep → Mock Round → **AI-assisted** (it picks a kit and runs a 60-minute clock, 20 minutes per stage).
2. `cd practice-kits/<kit> && npm install && npm run dev` (plus `npm run api` where the kit has one).
3. Read the kit's `README.md`: Stage 1 fix the bugs → Stage 2 add a feature → Stage 3 optimize/harden. Use your AI assistant freely.
4. Back in Prep, fill the three fields: what changed per stage · bugs found and how you verified each · AI suggestions you rejected and why.

**Don't open `SOLUTION.md` until you've submitted** — it lists the planted bugs (each with a reproduction), the expected feature shape and what good AI judgment looks like. Prep grades your write-up against it.

These kits are excluded from the app's TypeScript, lint and Next.js build.
