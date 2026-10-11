# Solution — Live dashboard

## Planted bugs (Stage 1)
1. **Interval leak.** The effect calls `setInterval` but never clears it: StrictMode's dev double-mount starts two, and each range change adds another while the old ones keep polling the *old* range. Fix: `const id = setInterval(...); return () => clearInterval(id)`.
   *Reproduce:* watch *requests so far* (or the Network panel), toggle the range a few times.
2. **Fetch race on range change.** The 24h endpoint takes ~900 ms and 1h ~120 ms; a slow 24h response (from the leaked interval or an in-flight request) lands after the 1h one and overwrites it. Fix: `AbortController` per poll aborted in cleanup, or ignore responses whose `range` ≠ the current range.
   *Reproduce:* switch 1h → 24h → 1h quickly; the Range tile flips back to 24h.
3. **Stale closure in the poller.** `setHistory([...history, m.rps])` reads `history` from the render that created the effect (`[]`), so it stays at one point (the sparkline needs 2 to draw). Each range change starts a new effect that captures the *current* history, so it only grows by one point per range switch — a stub that never fills. Fix: `setHistory(prev => [...prev, m.rps].slice(-30))`; reset history when the range changes.
   *Reproduce:* the sparkline stays empty for minutes; change the range and it draws a 2-point stub that never grows.

## Expected feature (Stage 2)
- `new EventSource(`/api/metrics/stream?range=${range}`)` in an effect; `onmessage` parses JSON with functional state updates; `onerror` → *Reconnecting* (EventSource retries itself), `onopen` → *Live*; cleanup calls `es.close()` so a range change swaps streams.
- Remove the polling path (or keep it as a fallback only when SSE fails repeatedly — say which).

## Optimization / hardening (Stage 3)
- `document.visibilityState` listener: close the stream when hidden, reopen when visible.
- Error rate as text (`1.4%`) plus status wording; `aria-live="polite"` for meaningful changes only; the sparkline gets `role="img"` and an `aria-label` summary (min/max/latest) or a visually hidden table; the select gets a label.
- Throttle UI updates (buffer in a ref, flush every 500 ms–1 s or with `requestAnimationFrame`); memoize the sparkline points.

## What good AI judgment looks like
- Rejecting "add `history` to the dependency array" (restarts the interval on every tick) and "wrap poll in useCallback" (doesn't fix the leak).
- Verifying with the Network panel / request counter that exactly one interval or stream exists after several range changes.
