// Code review practice (category 'code-review') — 15 "AI-generated PR"
// diffs (body = the diff, from ./code-review/*.diff). answer_hints = the
// planted issues; the code-review scorecard grades how many you found, how
// you prioritized them and how good your fixes are.
import { readFileSync } from 'node:fs'

const diff = name => readFileSync(new URL(`./code-review/${name}.diff`, import.meta.url), 'utf8').trimEnd()

const q = (file, title, difficulty, topics, issues) => ({
  title, difficulty, topics: ['Code review', ...topics], body: diff(file), answer_hints: issues.join(' · '),
})

const ROWS = [
  q('01-user-search', 'Review PR #482: live user search in the admin header', 'medium', ['React', 'Security', 'Accessibility'], [
    'XSS: dangerouslySetInnerHTML renders user names with query-built markup, escape or render highlights as React nodes',
    'race condition: no AbortController or ignore flag, a slow earlier response overwrites newer results',
    'query is not URL-encoded and is used raw in new RegExp (special characters throw or inject regex)',
    'loading stays true forever on a failed request and errors are not handled',
    'key={i} index keys on a changing result list',
    'accessibility: input has no label, clickable li is not keyboard-operable, no combobox/listbox roles',
  ]),
  q('02-use-debounce', 'Review PR #511: extract useDebouncedCallback', 'medium', ['React', 'Hooks'], [
    'stale closure: useCallback with [] captures the first fn, so later category and onChange values are ignored',
    'pending timer is never cleared on unmount, onChange can fire after the component is gone',
    'delay changes are ignored (not in deps)',
    'regression: changing the category prop no longer emits onChange (the effect that watched it was removed)',
    'fix: keep fn in a ref updated each render, clear the timeout in a cleanup effect',
  ]),
  q('03-project-patch-api', 'Review PR #530: PATCH and DELETE for project settings', 'hard', ['API', 'Security'], [
    'IDOR: no check that the session user owns or can edit the project, on PATCH and DELETE',
    'mass assignment: spreading the raw body lets clients set ownerId, plan or any column, whitelist and validate fields (zod)',
    'logs the full body and the Authorization header (secrets and PII in logs)',
    'missing project returns 200 { ok: true } instead of 404',
    'Next.js 15: params is a Promise and must be awaited',
    'no input validation or error handling around req.json() and the update',
  ]),
  q('04-button-css', 'Review PR #547: refreshed button styles', 'medium', ['CSS', 'Accessibility'], [
    'removes the visible focus ring (outline: none on :focus) with no replacement, keyboard users lose focus',
    'secondary button text #b0b4bb on #f9fafb fails WCAG contrast',
    'fixed height plus overflow hidden and nowrap clips text at larger font sizes, zoom or long translations',
    'hover changes width (110%) and scale, causing layout shift, and transition: all animates layout properties',
    'disabled buttons are hidden with display: none instead of shown as disabled (layout jumps, unclear state)',
  ]),
  q('05-modal', 'Review PR #561: reusable Modal component', 'hard', ['React', 'Accessibility'], [
    'clicks inside the modal bubble to the overlay and close it, stop propagation or check e.target === e.currentTarget',
    'keydown listener is never removed and captures a stale onClose (empty deps, no cleanup)',
    'body overflow is set to hidden but never restored on close or unmount',
    'no role="dialog", aria-modal or aria-labelledby on the dialog',
    'no focus management: focus is not moved into the dialog, not trapped, not returned to the trigger',
    'close control is a div, not a button with an accessible name',
  ]),
  q('06-use-fetch', 'Review PR #574: useFetch hook with an in-memory cache', 'hard', ['React', 'Hooks', 'Performance'], [
    'wrong cache key: cached by url only, so different params (status) return the first cached response',
    'params is a new object every render and is in the deps, so the effect re-runs every render and fires duplicate requests until the cache fills',
    'errors are swallowed (.catch(() => {})) and error state is never set, and res.ok is not checked before res.json()',
    'no abort or ignore flag, setState after unmount or out-of-order responses when params change',
    'module-level cache never expires or invalidates (stale data forever, unbounded growth)',
  ]),
  q('07-infinite-scroll', 'Review PR #590: infinite scroll for the activity feed', 'hard', ['React', 'Performance', 'API'], [
    'scroll listener is never removed (no cleanup), leaks and duplicates on remount',
    'stale closure: the listener captures page, loading and done from the first render, so it reloads page 0 and the loading guard never works',
    'no throttling or IntersectionObserver, every scroll event can fire overlapping requests',
    'offset pagination duplicates or skips items when new activity is inserted, use a cursor',
    'removed the Load more button, no keyboard or no-JS fallback and no error state',
  ]),
  q('08-login-form', 'Review PR #603: login form with remember me', 'hard', ['Security', 'Accessibility', 'React'], [
    'logs the plaintext password to the console',
    'stores the access token in localStorage or sessionStorage, readable by any XSS, use an HttpOnly cookie',
    'user enumeration: different messages for unknown email vs wrong password',
    'password input is type="text"',
    'not a form: the submit control is a div (no Enter to submit, not focusable), inputs have no labels or autocomplete attributes',
    'no loading or disabled state, double submits, and no handling of network errors or 5xx',
  ]),
  q('09-comment-markdown', 'Review PR #618: render comments as Markdown', 'medium', ['Security', 'React'], [
    'XSS: marked output injected with dangerouslySetInnerHTML without sanitizing (DOMPurify) or disabling raw HTML',
    'target="_blank" without rel="noopener noreferrer", and authorUrl is unvalidated (javascript: URLs)',
    'date bug: getMonth() is 0-based, and new Date(YYYY-MM-DD) parses as UTC so local dates can be off by one day',
    'comments.sort mutates the props array in place, copy before sorting',
    'the comparator never returns 0 for equal timestamps',
  ]),
  q('10-orders-api', 'Review PR #627: orders list and cancel endpoints', 'hard', ['API', 'Security', 'Performance'], [
    'SQL injection: status and sort are interpolated into the query string, parameterize and whitelist sort columns',
    'N+1 queries: two queries per order in a loop, use JOINs or batched IN queries',
    'no pagination or limit, returns every order',
    'no authorization: any logged-in user sees every customer\'s orders and can cancel any order',
    'SELECT * leaks internal columns and full customer records',
    'cancel: no 404 for a missing order, 200 for an error, restock not in a transaction and ignores quantities',
  ]),
  q('11-cart-reducer', 'Review PR #641: cart reducer', 'medium', ['React', 'State'], [
    'state mutation: existing.qty += 1 mutates the previous state, React may not re-render and history breaks',
    'off-by-one: the guard allows qty up to MAX_QTY + 1, and qty 0 should remove the item',
    'money as floating-point numbers (0.1 + 0.2), store integer cents and format with Intl.NumberFormat',
    'no default case, so an unknown action returns undefined and wipes the state',
    'total is derived data stored in state, compute it instead of keeping it in sync',
  ]),
  q('12-theme-context', 'Review PR #655: app-wide settings context', 'medium', ['React', 'Performance'], [
    're-render storm: the cursor position updates on every mousemove, re-rendering every consumer of the context',
    'the context value object is recreated every render, memoize it and split fast-changing state into its own context',
    'createContext<any>: no types and no guard when used outside the provider',
    'theme read from localStorage in an effect causes a flash of the wrong theme and hydration mismatch, set it before paint (script or cookie)',
    'naming: data is vague, and the setters are exposed raw instead of intent-level actions',
  ]),
  q('13-data-table-sort', 'Review PR #668: sortable invoice columns', 'medium', ['React', 'Accessibility'], [
    'invoices.sort mutates the props array in place, copy before sorting',
    'the comparator returns a boolean instead of a negative, zero or positive number, so sorting is wrong or inconsistent',
    'useMemo deps miss sortDir, so toggling the direction does nothing',
    'customer names are compared with > instead of localeCompare / Intl.Collator (case and accents sort wrongly)',
    'sortable headers are divs with onClick: use buttons and aria-sort on th for screen readers',
  ]),
  q('14-upload-handler', 'Review PR #682: avatar upload endpoint', 'hard', ['API', 'Security'], [
    'path traversal: originalname and the delete query name are joined into a path, ../ escapes the avatar folder',
    'no file size limit on multer memory storage, large uploads can exhaust memory',
    'trusts the client mimetype, validate magic bytes and re-encode the image, SVG can carry scripts',
    'filename collisions and overwrite: users overwrite each other\'s avatars, generate a server-side name per user',
    'synchronous fs calls block the event loop, and delete has no ownership check',
    'a 1-year cache on a fixed filename means a changed avatar never shows, use content-hashed names',
  ]),
  q('15-analytics-hook', 'Review PR #695: track page views and clicks', 'medium', ['React', 'Security', 'Privacy'], [
    'useEffect with no dependency array sends a page view on every render',
    'sends PII (email, name) and card numbers to a third-party analytics endpoint',
    'no consent check, no batching or sendBeacon, and fetch failures are unhandled',
    'inconsistent event naming ("Page View" vs "checkout_clicked"), define a typed event schema',
    'no Content-Type header on the JSON body',
  ]),
]

export default ROWS.map((r, i) => ({ ...r, sort_order: i + 1 }))
