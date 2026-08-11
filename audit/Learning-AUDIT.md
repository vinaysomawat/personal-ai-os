# Learning Audit — design's `isLearning` block vs. repo

Source of truth: the `isLearning` template block (`design_full.txt` lines ~940-1052) plus its companion state/logic (`resources`/`filteredResources`, `statusPills`, `resourcesByCategory`, `learningStats`, `learningInProgressBadgeLabel`, `suggestedResources`/`aiSuggestedResources`, lines ~3143-3196). Cross-checked against `src/features/learning/components/LearningView.tsx` and the shared `FilterPill` component.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / OPEN (real functionality-vs-mock tradeoff, kept).

---

## Section A — Page header

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| A1 | Page title | `34px/700/-0.05em` | **FIXED** | Was `text-2xl sm:text-3xl tracking-tight` → now `text-[34px] tracking-[-0.05em]`. |
| A2 | Study streak badge | `"📚 {N}-day study streak"` pill | **FIXED** | Was **entirely missing** from the header → added. |
| A3 | In-progress badge | `"📖 {N} in progress"` pill | **FIXED** | Was missing → added. |
| A4 | Study Coach trigger | `moduleAdvisorTriggerStyle` | MATCH | Already correct (top-nav pill). |

## Section B — Stats row (`learningStats`)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| B1 | 4 tiles | Total / In Progress / Completed / **Streak** (value `"{N}d"`, label `"Streak"`) | **FIXED** | The 4th tile previously showed `value={streak}` (a bare number) with `label={weekMinutes+"m this week"}` — a label that didn't describe its own value, an internal inconsistency independent of the design mismatch. Now `value="{streak}d"`, `label="Streak · {weekMinutes}m this week"` — matches design's "Streak" tile while folding in the real weekly-minutes figure the mock doesn't track, instead of discarding it. |

## Section C — Needs Revision

**STATUS AS OF THIS SYNC: CONFLICT — design is stale, not the code.** The design file (`design_learning.html`) still renders this section verbatim (same hardcoded `hasNeedsRevision` banner, same "JavaScript: The Good Parts" example row, same "+ Log Session" button) — unchanged since the rows below were written. But on 2026-07-26/27 the product deliberately removed "Needs Revision" from Learning entirely, replacing it with silent automatic re-queueing of resources needing revision back into the pending queue (no separate UI section at all). That decision postdates this design mock and was explicitly reconfirmed as intentional for this sync — do not resurrect this section from the design. Rows below are kept as a historical record of what the design specifies, not as a to-do.

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| C1 | Container | `risk-soft` bg, `risk-border` border, `14px` radius — a banner, not a titled `Card` | **CONFLICT (not applied)** | Design unchanged from last sync (still specifies this banner). Code no longer has any "Needs Revision" UI — removed per deliberate product decision that postdates the mock. Not re-added. |
| C2 | Row copy | `"📚 \"{title}\" not revised in 14+ days"`, `risk-strong` text | **CONFLICT (not applied)** | Same as C1 — design still specifies this copy/color, but the section itself no longer exists in the app. Not re-added. |
| C3 | Multiple items | Design's mock hardcodes exactly one example row | **CONFLICT (not applied)** | Moot — section doesn't exist in code at all now, so "how many rows to show" no longer applies. |

## Section D — Status filter pills

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| D1 | Pill style (shared `FilterPill`) | `radius:16px; padding:5px 11px; font-size:11.5px` | **FIXED** | Was `rounded-lg` (8px) `px-3 py-1.5` (12px/6px) `text-xs` (12px) → corrected on the **shared** `FilterPill` component (also used by Health Trend, Dashboard's Life Score Trend, and Coding's Question History — fixed once, benefits all four call sites per the "build shared primitives once" rule). |
| D2 | 4 separate pills (All/Not Started/In Progress/Completed) | Design shows 4 distinct filter pills | OPEN (kept) | Repo deliberately collapses Not Started + In Progress into one bucket (a prior session's documented decision: still distinguishable per-row via each resource's own status dropdown, defaulting to that combined view instead of "All"). This changes filter *behavior*, not just presentation, so it wasn't reverted — but the pill *style* itself (D1) was still brought in line with design. |

## Section E — Resources card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| E1 | Card shell | `padding: var(--card-pad-lg)` | **FIXED** | Removed the redundant `padding="p-3.5"` override. |
| E2 | Header actions | Two buttons: outlined **"Log Session"** (general, no resource) + filled **"+ Add Resource"** | **FIXED** | Repo only had "+ Add" (icon+text, filled). The generic "Log Session" trigger was **entirely missing** — worse, the underlying state (`showLog: Resource \| null`) couldn't actually represent "log with no resource" at all, since `null` was already overloaded to mean "modal closed" (a real bug, not just a missing button). Fixed by widening the state to `Resource \| 'general' \| null` and wiring the new button to `setShowLog('general')`. |
| E3 | Row background | Always-filled `bg-surface-2 rounded-[10px] padding:12px 14px` | **FIXED** | Was `hover:bg-surface-2` (transparent by default) → now always filled. |
| E4 | Row actions visibility | Status select + Log + Quiz me + delete are **always visible**, all on one row with the title | **FIXED** | Were hover-reveal (`opacity-0 group-hover:opacity-100`), and split across two lines (title row, then a second meta row). Consolidated to one always-visible row. |
| E5 | Status select | Outlined, colored text by status, no filled pill background | **FIXED** | Was a filled rounded-full pill (`bg-{status}`) → now `border border-border-strong`, transparent background, text colored via inline style (good/accent/tertiary), matching the outlined-select convention established elsewhere this session (Career's status select, etc.). |
| E6 | Progress bar | Always visible per resource (`0%` not-started, `100%` completed, `r.pct` in-progress), `5px/3px-radius` | **FIXED** | Repo previously showed **no static progress bar at all** — only an interactive range slider, and only for in-progress resources (not-started/completed resources showed no progress indicator whatsoever). Added the always-visible bar; the slider is kept as additional real interactivity for in-progress items only (OPEN — design's mock doesn't model live editing). |
| E7 | Type emoji, external link, "studied today", category text | Not shown in design's mock row at all (mock has no icon, no category, no link, no studied-today marker) | OPEN (kept) | All real, useful at-a-glance info the compact mock's single-line row can't fit — kept. |

## Section F — By Category card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| F1 | Card shell | `padding: var(--card-pad-lg)` | **FIXED** | Removed the redundant `padding="p-3.5"` override. |
| F2 | Row format | Plain `flex justify-between` text row — `"{category}"` / `"{count}"`, **no progress bar, no pill background** | **FIXED** | Was a two-line-per-row layout with a filled count pill (`bg-surface-2 rounded-full`) and a proportional progress bar below each row — neither exists in design's By Category list here (unlike Planner's By Area, which does have a design-specified bar — the two are genuinely different mock specs). Simplified to the flat text-row format. |

## Section G — Suggested Resources

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| G1 | Position | Its own full-width card, **after** the Resources/By Category grid | **FIXED** | Was a collapsible accordion positioned **above** the status filter/Resources grid — moved to the bottom, matching design's document order. |
| G2 | Collapsibility | Design's mock shows it always expanded, no collapse toggle | OPEN (kept→removed) | Repo's collapse toggle was removed entirely (not kept as OPEN) since the card is now positioned at the very bottom of the page where a permanently-open long list is far less disruptive than it was at the top — matches design's uncollapsed presentation. |
| G3 | Curated list grouping | **Flat** list (no per-category subheaders) — each row shows `{title}` + `{category}` as a subtext line | **FIXED** | Was grouped into per-category sections with uppercase subheaders → flattened to match design; category still shown per-row as a subtext line (real info, not dropped). |
| G4 | Row style | Each suggestion is its own `bg-surface-2 rounded-[10px]` filled card | **FIXED** | Was a plain `<li>` with only a hover state, no per-row background at all. |
| G5 | AI Suggested tint | `bg-accent-soft` background, distinguishing AI rows from curated ones | **FIXED** | Was styled identically to curated rows (same plain list treatment) → now uses the accent-soft tint design specifies. |
| G6 | "Add More Resources" trigger | A small **outlined** button inline next to the "AI Suggested" label, shown only before the first AI fetch | **FIXED** | Was a large full-width bordered button with an icon, always shown at the bottom regardless of fetch state → moved inline next to the section label, restyled to the small outlined mini-button convention. Repo's choice to still allow fetching *more* suggestions after the first batch (design's mock only shows the pre-fetch state) was kept as OPEN — the button reappears in a smaller form below the AI list once suggestions exist, rather than disappearing forever after one fetch. |
| G7 | Explanatory copy | `"Click 'Add More Resources' for AI picks based on your progress and weak areas."` shown only pre-fetch | **FIXED** | Wasn't present in repo at all → added, gated the same way design gates it. |

## Section H — Product-only features with no design equivalent (informational, do not diff against design)

These exist in the app but have **no counterpart anywhere in `design_learning.html`** — not because of a fidelity gap, but because they postdate the mock (added 2026-07-26/27, alongside the Needs Revision removal in Section C). Listed here so a future sync doesn't misread their absence from the design as something to remove, and doesn't need to re-derive this context from scratch.

| # | Element | Why it's not in the design |
|---|---|---|
| H1 | Mandatory quiz on marking a resource "Completed" | New gating behavior (`handleStatusChange` routes 'completed' through `handleQuiz` first) — design's status `<select>` still implies a direct, ungated status change. |
| H2 | "Weak Areas by Category" card | New card, sourced from quiz attempt data that didn't exist when the mock was made. |
| H3 | `estimated_minutes` field on resources (shown as `· ~{N} min` on each row, plus an Add Resource form field) | New field; design's resource row and Add Resource form (owned by a different slice) don't reference it at all. |
| H4 | "📖 Today's Read" badge + today's-read sort-to-top | Moved into Learning from Coding as a new daily habit feature; design's resource row has no badge and no special sort order beyond the raw `filteredResources` list. |

---

## Summary

All MISMATCH/MISSING rows across Sections A–G were **FIXED** in the sync that produced this baseline, including one real bug beyond styling: the "Log Session" (general, no-resource) flow didn't just have a missing button — the modal's own state (`showLog: Resource | null`) made `null` do double duty for both "closed" and "no resource selected," so no UI path could have opened it correctly even if a button existed. Fixed by widening the state type. The Resources list also gained a real missing behavior: not-started/completed resources previously showed no progress indicator at all (only in-progress ones got a bar, and even then only as an interactive slider, never a static readout). Suggested Resources was restructured from a top-of-page collapsible accordion grouped by category into a bottom-of-page, always-open, flat, tint-differentiated (curated vs. AI) card matching design. Remaining OPEN items (deliberate, not oversights): the collapsed 2-bucket status filter (a prior session's documented UX decision, filter *behavior* not just style), the interactive progress slider (in-progress rows only), type emoji/external-link/studied-today/category info on resource rows, and continued "fetch more" AI suggestions after the first batch.

**2026-08-10 re-sync:** Design file unchanged since the above baseline — Sections A, B, D, E, F, G all re-diffed row by row and confirmed still MATCH (see `CHANGELOG-learning.md` for the full re-diff; zero CHANGED/ADDED/REMOVED elements found). Section C flipped from FIXED to **CONFLICT (not applied)**: the design still shows "Needs Revision," but the product removed that section entirely in favor of silent re-queueing — code intentionally left as-is, design is stale here. Section H added to record four product-only features (mandatory quiz, Weak Areas by Category, `estimated_minutes`, Today's Read badge) that have no design counterpart at all, so their absence from the mock isn't mistaken for a gap in a future sync.

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser (prior sync) — header badges, Needs Revision banner, always-visible resource-row actions, progress bars, and the restructured Suggested Resources card (curated flat list + accent-tinted AI section) all confirmed working. This sync made no code changes, so no re-verification in-browser was needed beyond the type-check/lint pass below.
