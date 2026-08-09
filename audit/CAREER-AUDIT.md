# Career Audit — design's `isCareer` block vs. repo

Source of truth: the `isCareer` template block (decoded design script) plus its companion state/logic (`careerPipelineBadgeLabel`, application/goal/quiz-topic mapping getters). Cross-checked against `src/features/career/components/CareerView.tsx`.

**Scope note — GoalsCard is explicitly OUT OF SCOPE.** It's a component shared with Learning and Coding, and its current dual-mode structure (progress bar for quantitative goals like coding streak, checkbox for qualitative ones) is real functionality the design's simple mock doesn't attempt to represent at all — design's Goals section only ever shows plain achievement checkboxes, no metric-tracked goals. Changing it would ripple into two other pages' Goals sections, same "shared blast radius" category as the advisor-panel shell flagged (twice now) as its own separate audit. Not touched here.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / EXTRA (repo has functionality/fields beyond the mock) / OPEN (a real functionality-vs-mock tradeoff).

---

## Section A — Page header

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| A1 | Page title | 34px/700/-0.02em | **FIXED** | `text-[34px] tracking-[-0.02em]`. |
| A2 | Pipeline badge | `"💼 {N} active applications"` pill next to the title — 11px/600, `surface-2` bg, 20px radius, 4px/10px padding | **FIXED** | Added `text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1`. |
| A3 | Interview badge (conditional) | `"🎯 {N} at interview"` pill, shown only when count > 0 — accent-soft bg, accent-strong text | **FIXED** | Added, conditional on `counts.interview > 0`. |
| A4 | Career Mentor trigger | Same pill style as every other module-advisor trigger (`moduleAdvisorTriggerStyle`) | MATCH (mechanism) / OPEN (position) | Repo's Career Mentor trigger is correctly styled (via the shared `AIAdvisorProvider`/`TopNav` pill) but lives in the top nav bar, not inline in the page header. Same "shared advisor-panel architecture" tradeoff flagged before — left unchanged. |

## Section B — Career Profile card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| B1 | Field grid | Fixed 3-column grid, 16px gap, all breakpoints | **FIXED** (adapted) | Repo now `grid-cols-2 sm:grid-cols-3` — 3-col from `sm:` up rather than literally every breakpoint, since design's own preview is fixed at 1440px and a true 3-col grid at 393px would cramp fields like "Current Salary (₹/yr)" — a deliberate, disclosed mobile-safety adaptation, not an oversight. |
| B2 | Field value text | 13.5px primary | **FIXED** | `ProfileField` value now `text-[13.5px]` (all three states: normal, masked, editing). |
| B3 | Field editability | Design's mock shows plain static text — no edit affordance visible | OPEN (kept) | Repo's click-to-edit (`ProfileField`) is real, necessary functionality — kept. |
| B4 | Salary reveal icon | Plain emoji 👁 / 🙈 | **FIXED** | Lucide `Eye`/`EyeOff` replaced with the emoji glyphs. |
| B5 | Streak badges | 11px/600, `surface-2` bg, 20px radius, 4px/10px padding | **FIXED** | `text-xs` → `text-[11px]`. |
| B6 | Bio/Focus row | Separate block below a border-top, label + 13px secondary text | MATCH (structure) | Unchanged — already correct. |
| B7 | Field label style | `labelStyle`: 11px/700/uppercase/0.4px tracking | **FIXED** | `ProfileField`'s label was `text-xs uppercase tracking-wider` (12px, normal weight) — now `text-[11px] font-bold tracking-[0.4px]`, matching the canonical label convention used everywhere else in the app. Not in the original numbered rows, but the same "field text sizing" concern as B2. |

## Section C — Applications card (the largest set of differences)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| C1 | Status summary | Design has **no big stat-tile grid** — status counts only appear as small pill-filters (see C4), inside the card | **FIXED** | Removed the external stat-tile grid entirely; counts now only appear on the in-card filter pills. |
| C2 | Card title | Static literal text **"Applications"** — never changes | **FIXED** | Title is now always "Applications", regardless of active filter. |
| C3 | Sort control | A select dropdown in the card header: "Sort: Recent / Match % / Company A–Z" | **FIXED** | Added an `appsSort` select (Recent/Match %/Company A–Z) in the card header next to "Add Application"; wired to real sort logic. |
| C4 | Status filter pills | 5 pills: **All, Applied, Screening, Interview, Offer** (no Rejected pill) | **FIXED** | New `FILTER_STATUSES` pill row inside the card: `rounded-full` pills, accent fill when active, `(count)` suffix — Rejected deliberately excluded from quick-filters, matching design exactly. |
| C5 | Application list layout | A responsive **grid of elevated cards**, 14px gap, each its own shadowed card | **FIXED** | `<ul>` of rows replaced with a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start` of `rounded-2xl shadow-card` cards. `items-start` was necessary — without it, expanding one card stretched its unexpanded siblings to match height (the exact CSS-grid anti-pattern this project's own UI principles warn against), caught and fixed during live verification. |
| C6 | Card header row | Company (bold) + rotating chevron on one line; role · appliedAt below, indented; match badge + always-visible delete top-right | **FIXED** | Restructured to match; delete is no longer hover-only. |
| C7 | Match badge | Background **always `surface-2`** — only text color changes | **FIXED** | New `matchTextColor()` returns text-color-only classes; badge background is now always `bg-surface-2`. |
| C8 | Status select | Outlined only, color-coded text, 11.5px | **FIXED** | Switched from filled pill to `bg-transparent border border-border-strong`. |
| C9 | Location / Salary / Applied date / Notes on the collapsed card | Not shown in design | OPEN (kept) | Kept, now rendered as compact secondary lines below the status select rather than inline in the header row. |
| C10 | Expanded section fields | No "Priority Prep Topics" section in design | OPEN (kept) | Kept. |
| C11 | Skill chip style | 10.5px, 5px radius, 3px/8px padding | **FIXED** | Required/Missing Skills chips updated to `text-[10.5px] rounded-[5px] px-2 py-[3px]`; Missing Skills switched to the `risk`/`risk-soft` theme tokens (was hardcoded `text-red-400`). |
| C12 | Empty state | 📭 emoji, "No applications in this status." | **FIXED** | Replaced the shared `EmptyState` (lucide icon) with an inline block matching the exact copy/emoji/spacing. |

## Section D — Interview Prep

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| D1 | Card title | **"Interview Prep — Topic Quiz"** | **FIXED** | Copy corrected. |
| D2 | Recommended-topic banner | 🎯 emoji, `accent-soft` bg, `accent-border`, 10px radius | **FIXED** | Lucide `Sparkles` replaced with 🎯; `bg-accent/10 border-accent/30` → `bg-accent-soft border-accent-border rounded-[10px]`. |
| D3 | Topic grid | Fluid `repeat(auto-fit, minmax(110px,1fr))` | OPEN (kept) | Repo's fixed-breakpoint grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) kept as a reasonable, predictable alternative to the fluid pattern. |
| D4 | Readiness indicator | A small **colored dot** in the tile's top-right corner (7px) | **FIXED** | Added, using `READINESS_CONFIG[tier].color` (now a raw CSS-var value, not a Tailwind class). |
| D5 | Readiness label | Plain **colored bold text**, no background/pill | **FIXED** | Pill background removed; label is now plain colored text via inline `style={{ color: rcfg.color }}`. |
| D6 | "Ready" tier color | `this.ACCENT` (brand purple) | **FIXED** | `READINESS_CONFIG` restructured to hold raw CSS-var colors (`var(--good)`/`var(--accent)`/`var(--warn)`/`var(--risk)`/`var(--border-strong)`) instead of Tailwind bg+text pill classes — the only other consumer (`career-mentor.ts`) only reads `.label`, so this was safe to change without wider blast radius. |
| D7 | Last-score label | `"Last score: {N}%"` (a percentage) | **FIXED** | Now computed as `Math.round(score/total*100)`, rendered as `"Last score: N%"`; falls back to "No attempts yet" when there's no history (previously rendered nothing in that case). |

## Section E — Job Alerts card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| E1 | Card title | Static literal text **"Job Alerts"**, 13px/700, no count badge in header | OPEN (kept) | Repo keeps a `"{N} in the last 30 days"` count badge in the `Card` action slot — real glanceable info not in the static mock, same "kept over mock" pattern as A2/A3/C9. |
| E2 | Row list container | `flex-direction: column`, 4px gap between rows | **FIXED** | Was `<ul className="space-y-2">` (8px gap); now `flex flex-col gap-1` (4px). |
| E3 | Row layout | Flat row, no background pill — `padding: 9px 0`, `border-bottom: 1px solid var(--border)`, 10px gap | **FIXED** | Was a `bg-surface-2` hover-pill row (`p-2.5 rounded-lg gap-3`); now `flex items-center gap-2.5 py-[9px] border-b border-surface-3` (border-only separator, no fill). |
| E4 | Company / title text | 13px — company 600 weight primary, title regular secondary, joined by `" · "` on one line | **FIXED** | Was `text-sm` (14px) with company/title/date stacked on two lines and a separate `·` span. Now `text-[13px]` single line, `" · "` inlined into the title span, matching design's markup shape. |
| E5 | Date position/style | Inline at the end of the row (before the link icon), 11px tertiary, nowrap | **FIXED** | Was stacked below the company/title as a second line at `text-xs` (12px). Now inline in the row at `text-[11px]`. |
| E6 | External link | Plain **"↗"** glyph, 12px tertiary text, no button chrome | **FIXED** | Was a Lucide `ExternalLink` icon (size 13) wrapped in a padded hover button. Now a plain `↗` character at `text-[12px]`, `hover:text-accent` kept as a non-visual-conflicting interactive affordance. |
| E7 | Track button | Outlined, `border: 1px solid var(--border-strong)`, `border-radius: 6px`, `padding: 4px 10px`, `font-size: 11.5px` | **FIXED** | Was `rounded-lg` (8px) / `border-surface-3` / `text-xs` (12px). Now `rounded-[6px]` / `border-border-strong` / `text-[11.5px]`, padding unchanged (`px-2.5 py-1` already matched). |
| E8 | Empty state | Not shown in design's mock (design has no `sc-if` for a Job Alerts empty state) | OPEN (kept) | Repo's `EmptyState` (Bell icon + explanatory copy) kept — real functionality the static mock never had to represent. |

---

## Summary

All 24 MISMATCH/MISSING rows across Sections A-D are **FIXED**, and Section E's 6 CHANGED rows (E2-E7) found during this sync are now **FIXED**. Remaining OPEN (deliberate, not oversights): A4 and GoalsCard (shared advisor/component architecture, out of scope), B1 (3-col grid adapted to `sm:` breakpoint for mobile safety rather than literally every breakpoint), B3/C9/C10 (real functionality kept over the static mock), D3 (fixed-breakpoint grid kept over the fluid pattern), E1/E8 (Job Alerts count badge and empty state kept over the static mock, same pattern).

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser in both light and dark theme — filter pills, sort dropdown, card expand/collapse (including catching and fixing a grid `items-start` stretching bug during verification), salary reveal toggle, and the Interview Prep tiles' dot/color/percentage all confirmed working.
