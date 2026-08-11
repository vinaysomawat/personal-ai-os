# Settings Audit — design source (`isSettings` block) vs. repo

Source of truth: the `isSettings` template block (complete design script decoded from the user-provided untruncated export, `Personal OS Dashboard.html`'s `__bundler/template` payload — the same file that resolved the Dashboard truncation bug) plus its companion state/logic (`aiBudget*`, `cronJobs`/`cronSummary*`, `spendByFeature`, `reminders` mapping). Cross-checked field-by-field against the live repo (`SettingsView.tsx`, `Card.tsx`, `EmptyState.tsx`, `cron-log.ts`, `settings/actions.ts`).

Scope: the Settings **page** only (Account / AI Budget / System Health / Reminders list). The "New Reminder" add-form is a separate generic modal in the design (one of 10 modal types) and is explicitly out of scope here — it belongs in the dedicated Modal-system audit.

Status legend: MATCH (already correct, unchanged) / MISMATCH (differs, needs a decision) / MISSING (design feature absent from repo entirely) / OPEN (flagged, not obviously a style bug — likely a deliberate repo improvement over the literal source, needs your call).

---

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| 1 | Page title | 34px/700/-0.05em | **FIXED** | `text-[34px] tracking-[-0.05em]` (was responsive `text-2xl sm:text-3xl tracking-tight`). |
| 2 | Card padding (all 4 cards) | `var(--card-pad-lg)` (Card.tsx default) | **FIXED** | Removed the `padding="p-3.5"` override from all 4 Settings cards. |
| 3 | Account card title | "Account" 13px/700, 10px margin | MATCH | Card.tsx's shared title styling already covers this. |
| 4 | Account card layout | Single row: email left, "Export as JSON" + "Sign out" buttons grouped right, 8px gap | **FIXED** | Rebuilt as one row (`justify-between`); the two buttons are grouped on the right with `gap-2`. |
| 5 | Account row button style | Both buttons identical outline style: `background:none; border:1px solid var(--border-strong); border-radius:7px; padding:7px 14px; font-size:12.5px` (Export text primary, Sign out text secondary) | **FIXED** | Both now `border border-border-strong rounded-[7px] px-3.5 py-[7px] text-[12.5px]`, Export in `text-fg-primary`, Sign out in `text-fg-secondary`; icons removed (design has plain text buttons). |
| 6 | Account card extra copy | None — just the email + buttons | OPEN (kept) | Left the explanatory line in place, moved below the row since the two-row layout it depended on is gone. |
| 7 | AI Budget / System Health grid gap | 20px | **FIXED**, then intentionally tightened further | `gap-4` → `gap-5` matched the spec exactly. 2026-08-11: tightened again to `gap-3` (12px) per direct "make it compact" request. |
| 8 | AI Budget card title | "AI Budget" plain text, no icon | **FIXED** | Removed the `Sparkles` action icon. |
| 9 | AI Budget "Today" line | Single string "Today: $X of $Y", 12.5px secondary | **FIXED** | Collapsed into one `text-[12.5px] text-fg-secondary` line. |
| 10 | AI Budget bar track | 6px height, **4px** radius, surface-2 bg | **FIXED** | `rounded-full` → `rounded-[4px]`. |
| 11 | AI Budget bar fill color | 3-tier: risk ≥90%, **warn ≥70%**, else accent | **FIXED** | Added the `bg-warn` 70-90% tier via a shared `barColor()` helper. |
| 12 | AI Budget "This month" line | Same pattern as row 9 | **FIXED** | Same collapse as row 9. |
| 13 | "Top spend by feature" label | Literal text **"Top spend by feature"**, 11px uppercase tertiary, 0.4px tracking, 700 weight | **FIXED** | Copy corrected; `text-[11px] font-bold tracking-[0.4px]`. |
| 14 | AI Budget spend-by-feature rows | 12.5px, task key + amount, justify-between | **FIXED** (size) / OPEN (kept, labels) | `text-xs` → `text-[12.5px]`. Kept the `TASK_LABEL` friendly-name mapping rather than raw task keys. |
| 15 | AI Budget extra copy | None | OPEN (kept) | Left the env-var ceilings paragraph as-is. |
| 16 | System Health header | "System Health" + a live status badge (`{n} stale` / `All healthy`, 11px/700, risk/good themed) | **FIXED** | Added the badge, computed from the same `systemHealth` data already fetched; replaced the static `Activity` icon. Live-verified: shows "All healthy" in `bg-good-soft`/`text-good`. |
| 17 | System Health job order | Sorted: stale first, then never-seen, then healthy | **FIXED** | Added a `sortedHealth` sort by status before rendering. |
| 18 | System Health status dot | 8px circle | **FIXED** | `w-1.5 h-1.5` → `w-2 h-2`; also switched dot colors from hardcoded Tailwind palette (`bg-green-400`/`bg-red-400`) to the theme-aware `bg-good`/`bg-risk` tokens used everywhere else, matching the design's `this.GOOD`/`this.RISK` vars. |
| 19 | System Health job name | 12.5px primary, raw job key (e.g. `daily-briefing`) | **FIXED** (size) / OPEN (kept, labels) | `text-sm` → `text-[12.5px]`. Kept `JOB_LABEL` friendly names; extended the map to cover all 13 jobs (added `daily-journal`, `learning-tip`, `cron-health-check`, which previously fell through to raw keys). |
| 20 | System Health last-run text | Stale: risk color + 600 weight. Else: tertiary + 400 weight. Implied 12.5px. | **FIXED** | `text-xs` → `text-[12.5px]`; idle color `fg-quaternary` → `fg-tertiary`; added `font-semibold`/`font-normal` split. |
| 21 | System Health row spacing | List gap 9px, no per-row padding | **FIXED** | `space-y-1.5` + `py-1` → `space-y-[9px]`, no per-row padding. |
| 22 | Reminders header button | "+ New Reminder" (literal text, no icon), accent bg/white text, 12px/600, 6px/12px padding, 7px radius | **FIXED** | Sizing was already correct; swapped the `Plus` icon + "Add" for the literal "+ New Reminder" text. |
| 23 | Reminders extra copy | None | OPEN (kept) | Left the "Delivered via Telegram..." line as-is. |
| 24 | Reminder row container | Always-on `background: var(--surface-2)`, 10px radius, 10px/14px padding, single inline row | **FIXED** | Rebuilt as one inline row (`flex items-center`); always-on `bg-surface-2`; `rounded-[10px] px-3.5 py-2.5`. Live-verified in browser. |
| 25 | Reminder toggle icon | Plain emoji 🔔/🔕, 15px, no color variation | **FIXED** | Replaced lucide `Bell`/`BellOff` with the emoji glyphs at `text-[15px]`; dropped the slot-based color rule. |
| 26 | Reminder label dimming | Only the label span dims when inactive; row unaffected | **FIXED** | Removed `opacity-60` from the `<li>`; only the label span's color now changes. Live-verified: toggling off dims just the label, module/slot text and delete button stay full-opacity. |
| 27 | Reminder module·slot text | `"{module} · {slot}"` e.g. `"Health · Morning"` | **FIXED** | Now renders `"{MODULE_LABEL} · {Morning/Evening}"` in that order. |
| 28 | Reminder delete button | Always visible, 12px quaternary "✕" glyph | **FIXED** | Removed the hover-only opacity toggle; swapped lucide `Trash2` for a plain "✕" glyph. |
| 29 | Reminders empty state | Centered, 20px vertical padding, 🔔 emoji at 20px, text **"No reminders set yet."** 13px tertiary | **FIXED** | Replaced the shared `EmptyState` component with an inline block matching the exact spec (`py-5`, `text-xl` emoji, `text-[13px]` copy). |
| 30 | "New Reminder" add form | Separate generic modal (design's 10-modal system) | OUT OF SCOPE | Unchanged — deferred to the dedicated Modal-system audit. |

---

## Summary

All 24 MISMATCH/MISSING rows are **FIXED** (rows 1-2, 4-5, 7-13, 14 (size only), 16-22, 24-29). `tsc --noEmit` and `eslint` both clean. Live-verified in the browser in both light and dark theme: Account card single row + outline buttons, AI Budget bars (correct radius, 3-tier color), System Health status badge ("All healthy" in `good` tokens) + sorted 13-job list with 8px dots, and the Reminders card — added, toggled, and deleted a live test reminder to confirm the inline row layout, targeted label-dimming, and always-visible delete button all behave as specified.

**5 rows intentionally left OPEN** (6, 14's labels, 15, 19's labels, 23) — friendly task/job name mappings and explanatory copy the repo adds beyond the literal source. Kept as reasonable UX additions, not reverted.

**1 row OUT OF SCOPE** (30 — New Reminder modal; belongs to the Modal-system audit).
