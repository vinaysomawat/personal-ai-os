// AI-assisted codebase round (category 'ai-assisted') — one row per practice
// kit in practice-kits/. url = the kit on GitHub; answer_hints = the key
// points from the kit's SOLUTION.md (planted bugs, the expected feature, the
// optimizations), which the ai-assisted scorecard grades against.
const REPO = 'https://github.com/vinaysomawat/personal-ai-os/tree/master/practice-kits'

const q = (kit, title, difficulty, topics, points) => ({
  title, difficulty, topics: ['AI-assisted', ...topics], url: `${REPO}/${kit}`, answer_hints: points.join(' · '),
})

const ROWS = [
  q('data-table', 'AI-assisted round: employees data table (sort, filter, paginate)', 'medium', ['React', 'Accessibility'], [
    'bug: numeric columns sorted as strings (localeCompare on String(salary)), compare numbers numerically',
    'bug: off-by-one page count (Math.floor), use Math.ceil so rows 101–103 are reachable',
    'bug: filtering does not reset or clamp the page, so a late page shows No rows',
    'feature: team select combined with the text filter and a rows-per-page select, staying on a valid page',
    'optimize: memoized filter → sort (on a copy) → page, deferred or debounced query',
    'harden: sort headers as buttons with aria-sort, labelled inputs, virtualization or server paging at 10k rows',
  ]),
  q('autocomplete', 'AI-assisted round: city autocomplete with debounce', 'medium', ['React', 'Async', 'Accessibility'], [
    'bug: useDebounce never clears its timeout, so every keystroke fires a request',
    'bug: race — slower responses for shorter queries overwrite newer results, abort or ignore stale responses',
    'bug: Enter with no active option reads results[-1] and crashes, arrow keys go out of bounds',
    'feature: safe match highlighting as React nodes (no innerHTML, escaped regex), empty and loading states',
    'harden: ARIA combobox (role, aria-expanded, aria-activedescendant, listbox/option), close on blur',
    'optimize: per-query result cache, error handling with res.ok',
  ]),
  q('streaming-chat', 'AI-assisted round: streaming chat UI over SSE (with an Express API)', 'hard', ['React', 'Streaming', 'Security'], [
    'bug: stale closure in the stream loop drops the user message (use functional setState)',
    'bug: no AbortController, so New chat mid-stream resurrects the old conversation',
    'bug: XSS — assistant output echoing user input rendered with dangerouslySetInnerHTML unescaped',
    'feature: Stop aborts client and server (server stops on req close), Regenerate the last answer',
    'harden: decode with stream: true and buffer partial SSE lines, handle res.ok and errors',
    'optimize: batch token renders (ref + rAF), auto-scroll only near the bottom, polite live region',
  ]),
  q('file-uploader', 'AI-assisted round: multi-file uploader with progress', 'medium', ['React', 'Async', 'Accessibility'], [
    'bug: progress precedence Math.round(loaded / total) * 100 jumps 0 → 100',
    'bug: stale closure setUploads(uploads.map) wipes newly added rows, use a functional update',
    'bug: size check divides by 1024 (5 GB limit), and onload ignores xhr.status so a 413 shows Done',
    'feature: Cancel via xhr.abort and Retry keeping the File, distinct cancelled state',
    'optimize: queue with max 2 concurrent uploads',
    'harden: keyboard-accessible drop zone, progressbar semantics and live status, inline validation instead of alert',
  ]),
  q('todo-sync', 'AI-assisted round: todo sync with optimistic updates (with an Express API)', 'hard', ['React', 'API', 'State'], [
    'bug: cache keyed by todos ignoring the filter (and never invalidated), so every filter shows the same list',
    'bug: N+1 — one sequential /meta request per todo, fix with include=meta, a batch endpoint, or at least Promise.all',
    'bug: optimistic toggle without awaiting, res.ok or rollback, so the 500 for flaky todos is ignored',
    'feature: add and inline-edit todos optimistically with client ids, rollback and a visible error',
    'harden: rapid toggles send the intended state and ignore stale responses (per-todo sequencing)',
    'optimize: one request for list + meta, per-filter cache with invalidation, loading and error states',
  ]),
  q('live-dashboard', 'AI-assisted round: live dashboard from polling to SSE', 'hard', ['React', 'Streaming', 'Performance'], [
    'bug: setInterval without clearInterval leaks intervals (StrictMode, every range change)',
    'bug: race — slow 24h responses overwrite the 1h view, abort or ignore stale ranges',
    'bug: stale closure setHistory([...history]) keeps the sparkline at one or two points',
    'feature: EventSource stream with Live / Reconnecting status, closed and reopened on range change',
    'optimize: pause while the tab is hidden (visibilitychange), throttle renders',
    'harden: text values instead of color-only status, labelled select, sparkline with role img and a summary',
  ]),
]

export default ROWS.map((r, i) => ({ ...r, sort_order: i + 1 }))
