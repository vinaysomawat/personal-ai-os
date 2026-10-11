# Solution — Todo sync with optimistic updates

## Planted bugs (Stage 1)
1. **Wrong cache key.** `getTodos` caches under `'todos'` regardless of `filter`, so whichever list loads first is returned for every filter (and it's never invalidated after a toggle). Fix: key by filter (`todos:${filter}`) and invalidate or update cached lists on mutations — or drop the hand-rolled cache for TanStack Query with `['todos', filter]`.
   *Reproduce:* load *all*, click *active* — the done items are still there.
2. **N+1 requests, sequential.** After the list loads, `getMeta` runs once per todo with `await` in a loop: 12 × 150 ms ≈ 1.8 s of waterfall. Fix: include meta in the list response (`/api/todos?include=meta`, a join on the server) or a batch endpoint (`/api/todos/meta?ids=…`); at minimum `Promise.all`.
   *Reproduce:* Network panel — 12 sequential `/meta` calls.
3. **Optimistic update without rollback or error handling.** `toggle` flips state and fires `setDone` without awaiting, checking `res.ok` or catching; the server's `500` for "flaky" todos is ignored, so the UI lies. Fix: await, on failure roll back to the previous value (snapshot) and show an error; check `res.ok` in `setDone` and throw.
   *Reproduce:* tick *Fix flaky checkout test*, reload.

## Expected feature (Stage 2)
- Add: client-generated id (`crypto.randomUUID()`, the API accepts `id`), insert immediately with a pending style, replace with the server's row or remove + error on failure.
- Inline edit: Enter saves, Escape cancels, optimistic title with rollback; trim and length-limit input.

## Optimization / hardening (Stage 3)
- Rapid toggles: send the *intended* final state (not `!todo.done` from a stale closure), serialize or cancel in-flight mutations per todo, or ignore responses older than the latest request (per-todo version/sequence).
- One request for list + meta; cache per filter with invalidation; loading and error states; disable or debounce while a mutation is in flight.
- Accessibility: the filter buttons already expose `aria-pressed`; announce errors in a live region; give the list a heading/landmark.

## What good AI judgment looks like
- Rejecting "add `todos` to the dependency array" or a global `refetch()` after every toggle as the fix for rollback (it hides failures and adds load).
- Choosing where to fix the N+1 (API vs client) and saying why; verifying with the Network panel and a reload, not just the UI.
