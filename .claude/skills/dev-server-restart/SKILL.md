---
name: dev-server-restart
description: Cleanly restart the Next.js dev server for vinay-ai-os before doing any browser-based verification (Chrome automation, manual click-through) of a UI change. Kills stray processes on ports 3000-3002 and confirms exactly one dev server is running before trusting what the browser shows. Use before any browser spot-check, and whenever npm run dev and npm run build were run around the same time.
metadata:
  author: vinaysomawat
  version: "1.0.0"
---

# Dev server restart

Next.js's dev server silently falls back to the next free port (3001, 3002, ...) if 3000 is already taken by a leftover process. If you then point browser automation at `localhost:3000`, you'll be looking at a stale, possibly out-of-date server while your real changes are running one port over — this has previously caused a bug investigation to chase a phantom issue that was actually just port confusion, not a real code bug.

Running `npm run build` while a `next dev` server is live can also corrupt the dev server's cache/state.

## Steps

1. **Kill everything first, unconditionally, before restarting:**
   ```
   lsof -ti:3000,3001,3002 | xargs -r kill -9
   pkill -9 -f "next dev"
   pkill -9 -f "next-server"
   ```
   Run all three even if you're not sure something is running — `xargs -r` and `pkill` no-op harmlessly if nothing matches.

2. **Start fresh, in the background:**
   ```
   nohup npm run dev > /tmp/<scratchpad>/next-dev.log 2>&1 & disown
   ```
   (Use the session's scratchpad directory for the log file, not raw `/tmp`.)

3. **Verify exactly one process exists before trusting anything the browser shows:**
   ```
   ps aux | grep "next dev" | grep -v grep
   ```
   This should return exactly one line. If it returns zero or more than one, something is wrong — investigate before proceeding (don't just retry the kill commands in a loop).

4. **Confirm the server actually responds** (optional but cheap):
   ```
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
   ```
   A 200/307/302 confirms it's up; anything else (connection refused) means it's not ready yet — wait a couple seconds and retry, don't assume failure immediately.

5. Only now proceed with Chrome browser automation or manual testing against `http://localhost:3000`.

## When to run this

- Immediately before any browser-based spot-check of a feature you just built or fixed.
- Any time you're about to run `npm run build` and a `next dev` might already be running (kill dev first, run the build, then restart dev afterward if you still need it for browser testing).
- If a browser test shows unexpected/stale behavior that doesn't match the code you just read — check for port confusion before assuming a logic bug.
