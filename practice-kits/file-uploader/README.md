# Kit: File uploader with progress

A Vite + React + TypeScript uploader over a mock upload API (served by the Vite dev server — see `vite.config.ts`; it rejects files over 10 MB with `413`).
Work in your own editor **with an AI assistant** (60 minutes, 20 per stage) and verify what it suggests.

```bash
npm install
npm run dev        # http://localhost:5173
# Make a test file:  mkfile -n 3m small.bin   (macOS)  or  head -c 3M /dev/urandom > small.bin
#                    mkfile -n 12m big.bin   — DevTools → Network → throttling makes progress visible
```

## Stage 1 — Fix the bugs (20 min)
Users report:
- "The progress bar sits at 0% and then jumps to 100%."
- "I chose three files and they appeared for a moment, then the list went empty."
- "A 12 MB file says *Done*, but the limit is 5 MB and it never actually saved."

Find the root causes, fix them, and say how you verified each fix. (One bug hides the others until it is fixed.)

## Stage 2 — Add a feature (20 min)
Add **Cancel** for an in-flight upload and **Retry** for a failed one.

## Stage 3 — Optimize and harden (20 min)
- Selecting 20 files starts 20 uploads at once. Limit it to 2 concurrent uploads with a queue.
- The drop zone and progress aren't accessible (keyboard, screen reader). Fix that.
- `alert()` for validation, and anything else you'd flag in review.

Then fill the three fields in Prep's AI-assisted mock.
