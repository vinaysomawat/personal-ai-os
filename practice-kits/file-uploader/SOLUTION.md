# Solution — File uploader with progress

## Planted bugs (Stage 1)
Bug 2 masks bugs 1 and 3 (the row vanishes at the first progress event), so the expected order is 2 → 1 → 3.

1. **Progress math precedence.** `Math.round(e.loaded / e.total) * 100` rounds the 0–1 fraction first, so it's 0 until ≥50%, then 100. Fix: `Math.round((e.loaded / e.total) * 100)`.
   *Reproduce:* upload a 3 MB file with throttling on: 0% → 100%.
2. **Stale closure wipes the list.** The progress callback does `setUploads(uploads.map(...))` with `uploads` captured *before* this batch was added, so the first progress event replaces the list with the old one. Fix: functional update `setUploads(prev => prev.map(...))`.
   *Reproduce:* select three files at once — they vanish when progress starts (a second batch also wipes the first).
3. **Size limit in the wrong units, and HTTP errors treated as success.** `file.size / 1024 > MAX_BYTES` compares KB to bytes, so the real limit is ~5 GB; and `xhr.onload` resolves for any status, so the server's `413` shows as *Done*. Fix: `file.size > MAX_BYTES`, and in `onload` reject unless `xhr.status` is 2xx (surface the server's error).
   *Reproduce:* upload a 12 MB file.

## Expected feature (Stage 2)
- Keep each upload's `XMLHttpRequest` (or an `AbortController` with fetch — note fetch has no upload progress) in a ref map; Cancel calls `xhr.abort()` and marks the row *Cancelled*; `onabort` handled distinctly from errors.
- Retry re-queues the same `File` object (keep it with the row) and resets progress.

## Optimization / hardening (Stage 3)
- A queue with max 2 concurrent uploads (start the next on settle).
- The drop zone is a `<button>` or `<label>` for the file input (keyboard + Enter/Space), with instructions; each row's progress uses `<progress>` or `role="progressbar"` with `aria-valuenow`/`aria-valuetext`, and a polite live region for done/failed.
- Inline validation messages instead of `alert()`; type validation (`accept` + check); show sizes with a proper formatter; the server must enforce limits (client checks are UX only).

## What good AI judgment looks like
- Rejecting a fix that adds `uploads` to some dependency array or `useCallback` (the closure is in an async callback, not an effect).
- Verifying with throttling and a >10 MB file that the 413 path now shows *Failed*.
