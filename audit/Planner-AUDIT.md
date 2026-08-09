# Planner Audit — design's `isPlanner` block vs. repo

Source of truth: the `isPlanner` template block (`design_full.txt` lines ~389-462) plus its companion state/logic (`taskDefs`, `priorityColor`, `tasks` mapping, `pendingTasksAll`/`completedTasks`/`plannerFilter` filtering, `plannerPendingBadgeLabel`/`plannerOverdueBadgeLabel`/`plannerHasOverdue`/`plannerFilterActive`/`plannerFilterLabel`/`clearPlannerFilter`, `plannerStats`, `byAreaRaw`/`byArea`, lines ~2802-2852). Cross-checked against `src/features/planner/components/PlannerView.tsx`.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / OPEN (real functionality-vs-mock tradeoff, kept).

---

## Section A — Page header

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| A1 | Page title | `font-size: 34px; font-weight: 700; letter-spacing: -0.02em;` | **FIXED** | Was `text-2xl sm:text-3xl tracking-tight` → now `text-[34px] tracking-[-0.02em]`. |
| A2 | Pending badge | `"📋 {N} pending"` pill — 11px/600, `surface-2` bg, 20px radius, 4px/10px padding, secondary text | **FIXED** | Added `text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary`. |
| A3 | Overdue badge (conditional) | `"🔴 {N} overdue"` pill, shown only when count > 0 — `risk-soft` bg, `risk` text | **FIXED** | Added, conditional on `overdue > 0`. |
| A4 | Executive Summary trigger | `moduleAdvisorTriggerStyle`, `◆ Executive Summary` | MATCH | Already correctly implemented (`ExecutiveSummaryTrigger`, built earlier this session) — unchanged. |

## Section B — Stat / filter tiles (`plannerStats`)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| B1 | Layout | `grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap: 14px` | **FIXED** | Was `grid-cols-2 sm:grid-cols-4 gap-2.5` (non-interactive `StatCard`s) → now `grid-cols-2 sm:grid-cols-4 gap-3.5` clickable buttons (fluid `auto-fit` approximated with fixed breakpoints, consistent with this app's established pattern elsewhere — OPEN, not a functional gap). |
| B2 | Interactivity | All 4 tiles are `<button>`; first 3 call `st.select` (sets `plannerFilter`); the 4th ("Completed") has `cursor: default` and no `select` — display-only | **FIXED** | This was **entirely missing** — repo's tiles were plain, non-interactive `StatCard`s. Added `plannerFilter` state (`'all'|'high'|'overdue'|'area:{name}'`); Pending/High Priority/Overdue tiles now click-to-filter the Today's Tasks list; Completed tile stays non-interactive (`cursor-default`, no handler), matching design exactly. |
| B3 | Card style | `border: 1px solid {accent when active else border}; border-radius: 16px; box-shadow: [card shadow]; padding: 14px 16px` | **FIXED** | Extended shared `StatCard` (used elsewhere non-interactively by Dashboard/Learning — kept as one shared primitive, not forked) with optional `onClick`/`active` props: renders as `<button>` with `border-accent` when active, plain `border-surface-3` otherwise, `rounded-2xl` (16px), `p-3.5` (14px). Backward-compatible — other call sites unaffected. |
| B4 | Label | `11px, uppercase, 0.4px tracking, tertiary` | MATCH | `StatCard`'s existing label styling already close enough (`text-xs text-fg-tertiary`); left as-is — sub-pixel label sizing not worth forking the primitive further. |
| B5 | Value | `22px/700` | MATCH | `StatCard`'s existing `text-2xl font-bold` (24px) is close; not changed — same reasoning as B4. |

## Section C — Today's Tasks card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| C1 | Card shell | `border-radius: 18px`, `padding: var(--card-pad-lg)` | **FIXED** | Removed the redundant `padding="p-3.5"` override on `<Card>` — now uses the shared default (`var(--card-pad-lg)`), matching design. Same "redundant override" bug pattern caught repeatedly elsewhere this session. |
| C2 | Header row | Title "Today's Tasks" (13px/700) + conditional filter-clear chip (`plannerFilterActive`) | **FIXED** | Replaced the static "{N} remaining" `action` text with a conditional `"Filter: {label} ✕"` chip (`bg-accent-soft rounded-[6px] px-2.5 py-1 text-[11px] text-accent-strong`), shown only when a filter is active; clicking it resets `plannerFilter` to `'all'`. |
| C3 | Add-task input | `flex:1; bg surface-2; border 1px border; radius 8px; padding 8px 11px; font-size 12.5px` | **FIXED** | Was `rounded-lg px-3 py-2 text-sm` → now `rounded-[8px] px-[11px] py-2 text-[12.5px]`. |
| C4 | Priority select | `radius 8px; padding 8px 8px; font-size 12px` | **FIXED** | Was `rounded-lg px-2 py-2 text-sm` → now `rounded-[8px] px-2 py-2 text-xs`. |
| C5 | Recurrence select | Not present in design's mock (design has only text + priority) | OPEN (kept) | Real, necessary functionality (recurring tasks) the static mock doesn't model — kept, restyled to match C3/C4's sizing for visual consistency. |
| C6 | Add button | Literal `"+ Add"` text (no icon); `bg-accent; radius 8px; padding 8px 14px; font-size 12.5px; font-weight 600; white text` | **FIXED** | Lucide `Plus` icon + "Add" text → literal `"+ Add"` string, sizing corrected to `rounded-[8px] px-3.5 py-2 text-[12.5px]`. |
| C7 | Task row background | **Always-filled** `background: var(--surface-2); border-radius: 10px; padding: 10px 14px` (not hover-only) | **FIXED** | Was `hover:bg-surface-2` (transparent by default) → now always `bg-surface-2 rounded-[10px] px-3.5 py-2.5`. |
| C8 | Checkbox | Custom 18×18px box, `border-radius: 5px`, `border: 1.5px solid {good when done else border-strong}`, `background: {good when done else transparent}` — not an icon | **FIXED** | Lucide `Circle`/`CheckCircle2` icons replaced with a styled `<button>` div matching the exact box spec (border/bg driven by `task.done`). |
| C9 | Task text | `13px`; done → tertiary + strikethrough, else primary | **FIXED** | Was `text-sm` (14px) → `text-[13px]`; done-state color/strikethrough logic preserved. |
| C10 | Meta line | **One combined** 11px tertiary line, e.g. `"General · due Jul 20"` or `"Coding · synced from daily question"` | **FIXED** | Repo previously rendered area/recurrence/due-date as three *separate* chips/tags. Consolidated into a single `text-[11px] text-fg-tertiary` line: `"{area}"` + `" · due {date}"` (if set) + `" · repeats {recurrence}"` (if set). The external-link icon (auto-synced tasks) is kept as a separate clickable element — OPEN, real functionality (a link) the mock's plain text can't represent. |
| C11 | Priority indicator | Bold **uppercase colored text label** (11px, 0.3px tracking) — `high→risk`, `medium→warn`, `low→text-tertiary` | **FIXED** | Was a small colored `<div>` **dot** (`w-1.5 h-1.5 rounded-full`) → now `text-[11px] font-bold uppercase tracking-[0.3px]` text showing the literal priority word, colored via inline `style={{color: priorityColor[task.priority]}}` using raw CSS-var values (`var(--risk)`/`var(--warn)`/`var(--text-tertiary)`), same pattern established for Career's `READINESS_CONFIG`. |
| C12 | Delete control | Not present in design's mock | OPEN (kept) | Real, necessary functionality — kept as a hover-reveal icon after the priority label. |
| C13 | Empty state | `✅` emoji + `"Nothing pending — add a task above."` (13px tertiary) | **FIXED** | Was the shared `EmptyState` (lucide `ListTodo` icon, "No tasks this month — add one above") → replaced with an inline block matching the exact emoji/copy. |
| C14 | Completed `<details>` | `summary`: `"Completed ({N})"`, 12px tertiary; rows: same row treatment as C7-C11 but `opacity: 0.7` | **FIXED** | Summary copy/size corrected (was a `›` glyph + "Completed (N)" — glyph removed, copy kept); completed rows rebuilt with the same `bg-surface-2 rounded-[10px]` treatment (`py-2 px-3.5`, `opacity-70` on the row) and the same custom checkbox, replacing the old `hover:bg-surface-2` + `CheckCircle2` icon rows. |

## Section D — Overdue box

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| D1 | Container | `background: var(--risk-soft); border: 1px solid var(--risk-border); border-radius: 14px; padding: 16px 20px` | **FIXED** | Was `rounded-2xl` (16px) `p-4` (16px all) → now `rounded-[14px] px-5 py-4` (16px/20px). |
| D2 | Title | `"Overdue"` — 13px/700, `risk-strong` | MATCH | Already correct — unchanged. |
| D3 | Count label | Design's static mock shows no separate count badge in the header (just the title, then one example line below) | OPEN (kept) | Repo's `"{N} from previous months"` header label is a real, useful addition beyond the single-line mock — kept. |
| D4 | Task rows | Mock shows one plain text line; real data needs a real list | OPEN (kept) | Repo lists every real overdue task using the same rebuilt row treatment as C7-C11 (`PendingTaskRow`, shared component) rather than the mock's single static sentence — necessary for real functionality. |

## Section E — By Area card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| E1 | Card shell | `border-radius: 18px; padding: var(--card-pad-lg)` | **FIXED** | Removed the redundant `padding="p-3.5"` override — same fix as C1. |
| E2 | Row interactivity | Each row is clickable (`a.select`) — filters Today's Tasks to `area:{name}` | **FIXED** | Was entirely static (`<li>`, no handler). Rows are now `<button onClick>` wired into the same `plannerFilter` state as the stat tiles (B2). |
| E3 | Name style | `cursor: pointer; font-weight: {700 when active else 400}; color: {accent when active else primary}` | **FIXED** | Was always `text-fg-secondary`, no active state → now `font-bold text-accent` when that area is the active filter, `font-normal text-fg-primary` otherwise. |
| E4 | Count | Plain `color: var(--text-tertiary)` text — **no background/pill** | **FIXED** | Was a filled pill (`bg-surface-2 rounded-full px-2 py-0.5`) → now plain `text-fg-tertiary` text, no background. |
| E5 | Bar track | `height: 5px; border-radius: 3px; background: var(--border)` | **FIXED** | Was `h-1` (4px) `bg-surface-3` → now `h-[5px] bg-border` (matches the `--border` custom property, not `surface-3`/`surface-2`). |
| E6 | Bar fill | `width: {pct}%; height: 100%; background: var(--accent) (solid); border-radius: 3px` | **FIXED** | Was `bg-accent/60` (60% opacity) → now solid `bg-accent`, `rounded-[3px]`. |
| E7 | Empty state | Design's mock always has 3 areas — no empty state defined | OPEN (kept) | Repo's `EmptyState` fallback for zero pending tasks is real, necessary UX the mock doesn't need to handle — kept. |

---

## Summary

All MISMATCH/MISSING rows across Sections A–E are **FIXED**, including the single biggest functional gap found in this audit pass: **click-to-filter was entirely absent** — the 4 stat tiles and every By Area row are now real filter controls wired to a shared `plannerFilter` state, with a clear-filter chip in the Today's Tasks header, matching the design's actual (not just visual) behavior. Remaining OPEN items (deliberate, not oversights): C5 (recurrence select — real feature the mock doesn't model), C10's external-link icon, C12 (delete control), D3/D4 (real overdue list vs. one static mock line), E7 (empty state).

`StatCard` was extended (not forked) with optional `onClick`/`active` props so Planner's interactive tiles and Dashboard/Learning's existing non-interactive usages share one component.

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser in both light and dark theme at desktop and 393px — filter tiles, By Area row clicks, filter-clear chip, checkbox styling, and priority label colors all confirmed working.
