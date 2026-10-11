# Solution — City autocomplete

## Planted bugs (Stage 1)
1. **The debounce doesn't debounce.** `useDebounce` schedules a `setTimeout` per change but never clears the previous one (no effect cleanup), so every intermediate value fires 250 ms later. Fix: `const t = setTimeout(...); return () => clearTimeout(t)`.
   *Reproduce:* type `ber` quickly and watch three `/api/search` requests in the Network panel.
2. **Race: out-of-order responses overwrite newer results.** The mock API answers short queries slowly (`b` ≈ 700 ms, `ber` ≈ 300 ms), so `b`'s results land last. Fix: an `AbortController` aborted in the effect cleanup (or an `ignore` flag / compare `data.query` with the current query).
   *Reproduce:* with bug 1 present, typing `ber` ends showing Bangkok/Barcelona. With bug 1 fixed, type `b`, pause ~300 ms, then `er`.
3. **Keyboard crash and unbounded index.** `Enter` with `active = -1` reads `results[-1]` → `TypeError` on `city.name`; ArrowDown/Up go past the list bounds. Fix: clamp or wrap the index, ignore Enter when nothing is active (or select the first result), `preventDefault` on arrows.
   *Reproduce:* type `pu`, press Enter immediately.

## Expected feature (Stage 2)
- Highlight by splitting the string and rendering the match in `<mark>` as React nodes (or an escaped regex): no `dangerouslySetInnerHTML`, no unescaped user input in `new RegExp`.
- An empty-state row and a loading indicator tied to the in-flight request.

## Optimization / hardening (Stage 3)
- ARIA combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` on the input; `role="listbox"` and `role="option"` with `aria-selected`; a visible or visually-hidden label; close on blur / outside click.
- A per-query result cache (Map) checked before fetching; ignore queries under 1–2 chars.
- `try/catch` or `.catch` with an error state, and `res.ok` checked.

## What good AI judgment looks like
- Rejecting "add `query` to a ref and compare" hacks that still let stale responses render, or a fix that only increases the debounce delay (masks the race, doesn't fix it).
- Verifying with the Network panel or throttling, not just "looks fine on fast Wi-Fi".
