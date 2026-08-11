# Finance Audit — design's `isFinance` block vs. repo

Source of truth: the `isFinance` template block (`design_full.txt` lines ~648-806) plus its companion state/logic (`budgetCategoriesRaw`/`budgetCategories`, `avgMonthlySpend`, `overBudgetWarning`, `portfolioGainLabel`/`netWorth`/`totalDebt`, `sipBadgeStyle`, `financialGoalsRaw`/`financialGoals`, `recurringExpenses` mapping, lines ~2947-3009, ~3324-3336). Cross-checked against `src/features/finance/components/FinanceView.tsx`.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / OPEN (real functionality-vs-mock tradeoff, kept).

---

## Section A — Page header

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| A1 | Page title | `34px/700/-0.05em` | **FIXED** | Was `text-2xl sm:text-3xl tracking-tight` → now `text-[34px] tracking-[-0.05em]`. |
| A2 | Net Worth badge | `"💰 Net Worth ₹{netWorth}"` pill — `surface-2` bg, `accent` text | **FIXED** | Was **entirely missing** from the header (Net Worth only existed as a stat tile) → added. |
| A3 | Avg spend badge | `"📊 3mo avg spend ₹{avgMonthlySpend}"` pill — `surface-2` bg, secondary text | **FIXED** | Was missing — `avgMonthlyExpense` was already a prop (used only for the AI advisor) but never surfaced in the header. Added. |
| A4 | Money Advisor trigger | `moduleAdvisorTriggerStyle` | MATCH | Already correct (top-nav pill) — same architecture tradeoff noted for every module's advisor trigger. |

## Section B — Over-budget warning

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| B1 | Message content | Names the **specific** over-budget category: `"{cat} is over budget by ₹{X} this month."` (finds the first category where `spent > budget`) | **FIXED** | Repo showed an aggregate `remaining < 0` message ("Over budget by ₹X this month") that didn't name a category. Replaced with `overBudgetCategory` lookup matching design's exact logic and copy. |
| B2 | Container style | `risk-soft` bg, `risk-border` border, `13px` `risk-strong` text, `⚠` glyph | **FIXED** | Was `bg-risk-soft border-red-500/30` with a `⚠️` emoji and bold amount span → now `border-risk-border`, plain `⚠` glyph, matching design's exact copy format. |

## Section C — Stat tiles

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| C1 | Grid/card shell | `auto-fit minmax(150,1fr)`, `border-radius:16px`, `padding: var(--card-pad-sm)` | **FIXED** | Was `grid-cols-2 lg:grid-cols-4 gap-3` with `rounded-xl p-4` → now `grid-cols-2 sm:grid-cols-4 gap-3.5` with `rounded-2xl p-[var(--card-pad-sm)]` (verbatim CSS-var padding, not a guessed px value). |
| C2 | Label style | `11px uppercase tertiary` (no letter-spacing specified) | **FIXED** | Was `text-xs tracking-wider` → now `text-[11px]` with tracking removed (design doesn't set one). |
| C3 | Salary reveal toggle | Not present in design's mock — salary is always shown in plain text | OPEN (kept) | Real, valuable privacy feature (mask/reveal sensitive salary) the compact mock doesn't need — kept. |
| C4 | Portfolio value + gain | **One line**: `₹{value} ({gainLabel})`, no icon, no "gain"/"loss" word | **FIXED** | Was a separate line below the value with a `TrendingUp`/`TrendingDown` icon and "gain"/"loss" suffix → consolidated to one line, icon removed. Kept the sign-aware red/green color (OPEN — design's gain color is hardcoded green in its one static mock state, which never depicts a loss; the mock can't tell us its intent for a loss scenario, so real sign-aware coloring was kept rather than guessed away). |
| C5 | Total Debt subtitle | Design's mock shows only `₹{totalDebt}` — no EMI/mo subtitle | OPEN (kept) | Repo's `"₹X/mo EMI"` subtitle is real, useful context not in the mock — kept. |
| C6 | Net Worth color | Design's mock hardcodes `var(--accent)` regardless of sign | OPEN (kept) | Repo's red-when-negative conditional is real, meaningful info a single always-positive mock state can't rule out — kept. |

## Section D — By Category card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| D1 | Card shell + header | `padding: var(--card-pad-lg)`; header = title + **filled** `"+ Add Expense"` button (`bg-accent`, `radius:7px`, `padding:7px 14px`, `12.5px/600` white) | **FIXED** | Removed the redundant `padding="p-3.5"` override; moved the expense-add trigger into By Category's header (design has no separate "Expenses" card — see D7) with the exact filled-button spec (was already close, minor radius/padding correction). |
| D2 | Chevron | `▸`, rotates 90° when expanded | **FIXED** | Was **missing entirely** (only a `cursor-pointer` div, no visual expand indicator) — added, with the same rotate-on-expand transition. |
| D3 | Row right-hand text | `{spent} / {budget} ({pct}%)`, percentage colored by tier | **FIXED** | Was just `{fmt(spent)}` alone (budget/percentage weren't shown in this position at all — budget was tucked into a separate small edit-trigger button) → now shows the full `spent / budget (pct%)` string, matching design; budget-edit affordance kept as a small text link below (OPEN — a real necessary entry point absent from the static mock). |
| D4 | Tier badge | `"Over"` / `"At limit"` / `"Near limit"` chip, shown only ≥90%; `risk-soft`/warn-tinted bg | **FIXED** | Was **entirely missing** — repo only reddened text past 100% with no near-limit warning state at all. Added the 3-tier badge with design's exact thresholds and copy. |
| D5 | Bar/badge tier colors | **Green** under 90%, **amber** 90-99%, **red** ≥100% | **FIXED** | Repo's bar was a binary `accent`-purple/`red` — did not have a green "on track" state at all. Now 3-tier green/amber/red, matching design's `GOOD`/`WARN`/`RISK` mapping. |
| D6 | Bar sizing | `height:6px; border-radius:4px; background:var(--border)` (track) | **FIXED** | Was `h-1 bg-surface-3` → now `h-[6px] bg-border`, `rounded-[4px]`. |
| D7 | Separate "Expenses" list card | Design has no such card — only a compact "Just Added" (session-only recent expenses) list in the right column | OPEN (kept) | The repo's full always-visible, scrollable, deletable expense list is real, necessary functionality (browsing/managing historical expenses) a "just added this session" list can't replace — kept, moved into the right-hand column stack (see Section G) to match design's overall two-column grouping instead of a separate full-width row. |
| D8 | Expense delete glyph | Plain `✕` text button | **FIXED** | Category-expense-row delete switched from a `Trash2` icon to the `✕` glyph, matching design's own idiom (used consistently for every delete control in this module — investments, recurring, category expenses). |

## Section E — Loans card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| E1 | Title | `"Loans"` (not "Loans & EMIs") | **FIXED** | Copy corrected. |
| E2 | Add trigger | **Outlined** mini button — `border:1px solid border-strong; radius:6px; padding:4px 10px; font-size:11.5px`, no icon | **FIXED** | Was a filled accent button with a `Plus` icon → now the outlined `+ Add` style shared across Loans/Investments/Goals/Recurring. |
| E3 | Row format | One combined line: `"{name} — EMI ₹{emi} · {months} months left"`, inline-editable EMI/months | **FIXED** | Restructured from a two-column layout (name+details left, a separately-computed "remaining ₹" figure + delete right) to one inline-editable text line. The computed per-loan "remaining" figure doesn't exist in the design at all (only the aggregate Total Debt tile is shown) and was dropped as redundant/confusing. |
| E4 | Interest rate | Not shown in design's mock | OPEN (kept) | Real useful data (loan rate) the compact mock doesn't model — kept as a third inline-editable field. |
| E5 | Progress bar | Not present in design's mock at all | **FIXED** | Repo had a **hardcoded, fake `width: 30%` bar** that never reflected real payoff progress — a real bug, not just a style mismatch. Removed entirely (matches design, which has no per-loan progress indicator). |
| E6 | Delete | Not shown in design's mock (no delete affordance for the single demo loan) | OPEN (kept) | Necessary real functionality — kept, switched to the `✕` glyph for consistency with the rest of the module (D8). |

## Section F — Investments card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| F1 | Add trigger | Outlined mini button (same as E2) | **FIXED** | Filled+icon → outlined, matching E2. |
| F2 | Subheader style | `"SIPs"` / `"Lump Sum"` — `10.5px tertiary uppercase 0.4px-tracking bold`, no icon | **FIXED** | Was `text-xs tracking-wider` with a `Repeat` icon on the SIPs label → now `text-[10.5px]` bold, icon removed. |
| F3 | Row format | One line: `"{name} — ₹{current} current, ₹{invested} invested (gain)"` | **FIXED** | Reordered current-before-invested to match design (repo previously showed invested first); consolidated onto one flex-wrap line. |
| F4 | Gain display | Absolute `₹` amount in parens after "invested", not a percentage | **FIXED** | Repo showed only a top-right `%` badge, no absolute figure. Added the `(±₹X)` format design specifies; kept the existing `%` as an additional OPEN/kept figure (real, useful, doesn't conflict). |
| F5 | Type badge (Stocks/MF/Crypto/etc.) | Not shown in design's mock (only a "SIP" badge for recurring investments) | OPEN (kept) | Real, useful categorization the compact mock doesn't model — kept, now shown for lump-sum items too (previously only SIP items got a badge at all). |
| F6 | SIP badge style | `10px/700/uppercase`, `2px/7px` padding, `10px` radius, accent-soft/accent when active vs. border/tertiary when cancelled | MATCH | Already essentially correct — left unchanged. |
| F7 | SIP contribution schedule (`{amount}/mo · day {n}`) | Not shown in design's mock row at all | OPEN (kept) | Real, useful schedule info — kept. |
| F8 | Delete/cancel-SIP glyphs | Plain `✕` | **FIXED** | Both switched from lucide icons (`Trash2`, `X`) to the `✕` glyph, matching D8/E6. |

## Section G — Financial Goals card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| G1 | Add trigger | Outlined mini button | **FIXED** | Filled+icon → outlined, matching E2/F1. |
| G2 | Bar sizing | `height:5px; border-radius:3px; background:var(--border)` (track), solid accent fill | **FIXED** | Was `h-1.5 bg-surface-3` → now `h-[5px] bg-border rounded-[3px]`. |
| G3 | Priority tag, target date, precise amounts, editable progress, "N% · ₹X to go" caption | Design's compact mock shows only `{name}` + `{pct}%` + a bar — none of this detail | OPEN (kept) | All real, valuable functionality (priority, deadline, exact progress tracking) a static two-goal mock can't represent — kept in full. |
| G4 | Delete affordance | Design's `financialGoals` loop renders only `{name}` + `{label}` + bar — no delete control of any kind | OPEN (kept) | Corrected from a prior **FIXED**-as-"`✕`-matches-design" classification: the design's goals row genuinely has no delete button (consistent with G3's already-noted minimal 2-field mock) — there's nothing to visually match. The `✕` delete button is real, necessary functionality a static two-goal mock can't represent — kept, same reasoning as G3. |

## Section H — Right-column layout (Loans / Investments / Goals / Expenses)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| H1 | Overall page structure | Two-column grid: **By Category** (left) paired with a **stacked right column** of Loans → Investments → Financial Goals → "Just Added" | **FIXED** | Repo previously stacked every section full-width in page order (Loans+Investments as one 2-col row, then a full-width Goals row, then a separate By Category+Expenses 2-col row). Restructured to match design's grouping: By Category on the left; Loans, Investments, Financial Goals, and Expenses (D7's kept real list, standing in for "Just Added") stacked in the right column. |
| H2 | Card padding (Loans/Investments/Goals/Expenses) | `padding: var(--card-pad-md)` each | **FIXED** | Was `padding="p-3.5"` on each → now `padding="p-[var(--card-pad-md)]"` (verbatim CSS-var value). |

## Section I — Recurring Expenses card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| I1 | Add trigger | Outlined mini button | **FIXED** | Filled+icon → outlined, matching E2/F1/G1. |
| I2 | Row format | One line: `"{name} — ₹{amount} · day {n} of month"`, no icon, no category badge | **FIXED** | Was: `Repeat` icon + colored category badge pill + name, with `"Day X of every month"` as a separate caption line below. Consolidated into one line; category folded into the same text (`"· {category}"`) rather than dropped outright — real data used when the item auto-logs into Expenses, kept visible but de-emphasized to plain text per design's one-line spirit. |
| I3 | Pause/Resume button | Outlined mini button — `border-strong` border, `radius:6px`, `2px/8px` padding, `10.5px` text | **FIXED** | Was plain unbordered text → now outlined, matching the module's other mini-buttons. |
| I4 | Delete glyph | Plain `✕` | **FIXED** | `Trash2` icon → `✕`, matching D8/E6/F8/G4. |
| I5 | "Auto-logged into Expenses..." explainer | Not present in design's mock | OPEN (kept) | Real, useful onboarding copy explaining non-obvious auto-behavior — kept. |
| I6 | "$X/mo total" summary badge | Not present in design's mock | OPEN (kept) | Real, useful aggregate — kept. |

## Section J — Spending History (charts)

Note: the prior audit's single J1 row ("entire section not present in the design source") was **stale/wrong** — the design source does specify this section in detail (a 12-month bar trend + month/category pie breakdown), it just wasn't seen during the last sync. Re-audited element by element below now that the design's actual spec is visible.

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| J1 | Card shell | `padding: var(--card-pad-lg)` (Card's own default) | **FIXED** | Was a hardcoded `padding="p-3.5"` override (14px, not the CSS-var value) → removed, now uses Card's correct default. |
| J2 | Bar-trend chart type | Literal flex-row of plain `<div>` bars, `height:100px`, `gap:6px`, click-to-select, all 12 month labels always shown at `9.5px` | OPEN (kept) | Repo uses a `recharts` `BarChart` (hover tooltip, `CartesianGrid`, alternating-tick `XAxis`) — real interactivity (exact-value tooltip on hover) a static div-bar mock can't represent. Kept as-is; not rebuilt as literal divs. |
| J3 | Category-breakdown header | Row pairing `"{month} spend by category"` (13px/700) with the period total (13px, secondary), `border-top:1px solid var(--border)`, `margin:16px 0 14px`, `padding-top:14px` — sits between the trend chart and the pie/legend | **FIXED** | Was **missing entirely** — the month name only appeared in the small prev/next nav row above (no "spend by category" copy, no paired total), and the total instead appeared as a separate `"Total: ₹X"` line at the very bottom, styled as `text-xs` quaternary. Added the design's header row verbatim (copy/size/color/border/spacing) directly above the pie; removed the now-redundant bottom `Total:` line since this header replaces it. Kept the existing prev/next chevron nav row unchanged directly above it (real navigation UX not in design's click-only mock — OPEN, same tradeoff as elsewhere in this file). |
| J4 | Pie chart type | CSS `conic-gradient` donut circle (`pieGradientStyle`), no library | OPEN (kept) | Repo uses `recharts` `PieChart` with a hover tooltip — same real-interactivity tradeoff as J2. Kept. |
| J5 | Pie + legend layout | Side-by-side: `display:flex; align-items:center; gap:24px; flex-wrap:wrap` — fixed-size donut on the left, legend column `flex:1; min-width:140px` on the right, wrapping to stacked only when narrow | **FIXED** | Was always stacked full-width (pie block on its own row, legend list in a separate block below, regardless of viewport) → now a `flex gap-6 flex-wrap` row with a fixed `w-32 h-32` pie container and a `flex-1 min-w-[140px]` legend list, matching design's intended side-by-side-with-wrap layout. |
| J6 | Legend row format | `{{ pl.name }}` (flex:1) + `{{ pl.amount }}` (inherits row's `12.5px` secondary color) + `{{ pl.pct }}%` (separate column, tertiary, `width:32px`, right-aligned); row gap `8px` | **FIXED** | Repo showed only the dot + name + amount (amount incorrectly colored tertiary, no percentage column at all, `text-xs`/12px, `4px` row gap). Now `12.5px`, amount recolored to secondary, a `{pct}%` column added (computed from `value / selectedTotal`, tertiary, `w-8 text-right`), row gap increased to `8px` (`space-y-2`). |

---

## Summary

All MISMATCH/MISSING rows across Sections A–I are **FIXED**. Two notable findings beyond pure styling: (1) Loans had a **hardcoded, fake 30%-width progress bar** that never reflected real data — a real bug, now removed; (2) the By Category spending-bar color scheme was a binary accent/red and was **missing an entire "near limit" (90-99%) warning tier** the design defines — now a proper green/amber/red 3-tier system with matching badges. The page was also restructured from a stacked full-width layout to design's two-column grouping (By Category | Loans/Investments/Goals/Expenses stack). Every delete control across the module now uses the same `✕` glyph design uses consistently, replacing a mix of `Trash2`/`X` lucide icons. All "+ Add" triggers outside By Category's filled "+ Add Expense" now use one shared outlined mini-button style. Remaining OPEN items (deliberate, not oversights): salary mask/reveal, sign-aware portfolio/net-worth coloring, EMI/mo subtitle, interest rate field, investment type badges + SIP schedule, Goals' full metadata (priority/date/precise amounts) plus its delete control (G4, corrected below), the standalone Expenses list, and Recurring's explainer + total badge.

**Section J correction (this sync):** the previous audit's blanket "Spending History section not present in the design source" (old J1) was itself stale — the design does specify this section in full. Re-audited element by element: card padding now uses the correct `var(--card-pad-lg)` default (was a hardcoded `p-3.5`), a `"{month} spend by category" + total` header row was added matching design exactly (replacing a mis-styled/mis-placed `"Total: ₹X"` line at the page bottom), the pie chart and its legend are now laid out side-by-side per design (`flex gap-6 flex-wrap`) instead of always stacked full-width, and each legend row now shows a `{pct}%` column (previously missing entirely) with the amount recolored to match design. The bar/pie chart libraries themselves (recharts, for real hover tooltips) and the prev/next month-nav chevrons (real navigation UX) remain OPEN/kept, same tradeoff as every other "static mock vs. real interactivity" item in this file.

**Section G correction (this sync):** G4 was previously marked as a `✕`-glyph design match; the design's Financial Goals loop actually renders no delete control at all (consistent with G3's already-noted minimal 2-field mock). Reclassified as OPEN (kept) — no code change, since the real delete button is legitimate necessary functionality either way.

Verified: `tsc --noEmit` and `eslint` both clean.
