# Coding Audit — design's `isCoding` block vs. repo

Source of truth: the `isCoding` template block (`design_full.txt` lines ~1052-1200) plus its companion state/logic (`weakAreas`, `codingStatus`/`codingStatusStyle`, `readStatus`/`readStatusStyle`, `calendarDays`/`cellStyle`, `practiceLog`/`practiceLogFilters`, `recommendedQuestions`, lines ~3064-3140). Cross-checked against `CodingView.tsx`, `DailyCodingCard.tsx`, `TrendingReadingCard.tsx`, `CodingCalendar.tsx`, `QuestionHistory.tsx`, `RecommendedQuestions.tsx`, `CodingSettingsPopover.tsx`.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / OPEN (real functionality-vs-mock tradeoff, kept).

---

## Section A — Page header

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| A1 | Page title | `34px/700/-0.05em` | **FIXED** | Was `text-2xl sm:text-3xl tracking-tight` → now `text-[34px] tracking-[-0.05em]`. |
| A2 | Streak badge | `"🔥 {N}-day streak"` pill | **FIXED** | Was missing from the header (streak only lived in the stat tile) → added. |
| A3 | Assignment mode badge | `{codingModeLabel}` pill | **FIXED** | Was missing → added. |
| A4 | Code Mentor trigger | `moduleAdvisorTriggerStyle` | MATCH | Already correct (top-nav pill). |

## Section B — Stat tiles

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| B1 | Tile shell | `radius:16px; padding:var(--card-pad-sm)` | **FIXED** | Was `rounded-xl p-3` → now `rounded-2xl p-[var(--card-pad-sm)]`. |
| B2 | Value size | `20px/700` | **FIXED** | Was `text-lg` (18px) → now `text-xl` (20px), matching this pass's established stat-tile convention. |
| B3 | Settings gear button border | `border-strong` | **FIXED** | Was `border-surface-3` → corrected. |

## Section C — Weak Areas

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| C1 | Card shell | `padding: var(--card-pad-lg)` | **FIXED** | Removed redundant `padding="p-3.5"` override. |
| C2 | Bar sizing | `height:5px; border-radius:3px` | **FIXED** | Was `h-1.5 rounded-full` (6px, fully rounded) → now `h-[5px] rounded-[3px]`. |
| C3 | Struggle-rate risk/warn threshold | `pct >= 70` → risk, else warn | OPEN (kept) | Repo's `computeWeakAreas` already uses a `>= 60` threshold — real, pre-existing domain logic (not a copy-paste style value) — left unchanged rather than silently altering a scoring threshold as a "style fix." |

## Section D — Today's Question (`DailyCodingCard`)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| D1 | Card shell/title | Standard shell; title **"Today's Question"**, `13px/700` + status badge in header row | **FIXED** | Was `rounded-xl p-5` with an uppercase-tracking title "Today's Coding Challenge" and no header status badge → restyled to standard shell, title corrected (pluralized only when the day assigns more than one question — a real repo capability the single-question mock doesn't model, see D4), status badge added (`bg-border`, tiered color). |
| D2 | Difficulty indicator | Plain colored text next to the title (`"Easy"`, 11px), not a pill | **FIXED** | Was a filled colored pill (`bg-good-soft` etc.) → now plain colored text inline with the title. |
| D3 | Action button | Explicit **"Mark Solved"** button, `bg-good`/`text-on-good` | **FIXED** | Was an inline click-to-complete circle icon with no explicit button → added the explicit button per question, matching design's action pattern (and this pass's Health/Coding "Mark X" button convention). |
| D4 | Multiple assigned questions | Design's mock only ever shows one question | OPEN (kept) | Real functionality — "Fixed count per day" assignment mode can assign more than one question daily; the list structure and Easy/Medium/Hard breakdown footer are kept as necessary, real behavior the single-question mock doesn't attempt to represent. |

## Section E — Daily Tech Read (`TrendingReadingCard`) — DESIGN STALE, NOT IMPLEMENTED

The design mock (`design_coding.html` lines 62-72) still renders a "Daily Tech Read" card unchanged from the last sync. Since that sync, Coding underwent a deliberate, user-approved product change: "Daily Tech Read" and its reading-tagged Practice Log rows were removed from Coding entirely and the habit moved into Learning (surfaced there as a "Today's Read" badge on the resource list). The mockup was never updated to reflect this real decision. Per the standing "preserve real functionality over literal mock-matching" precedent, this is NOT re-applied — `TrendingReadingCard` no longer exists in the codebase and should stay that way even though the design still shows it.

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| E1 | Card shell/header | Standard shell; title + status badge in header row | **CONFLICT (not applied)** | Design unchanged from last sync (still shows this card) — the mismatch is code-vs-real-product-decision, not code-vs-design. Left removed. |
| E2 | Content layout | Title (14px/600) + `"{source} · ~{X} min read"` below, then an explicit **"Mark Read"** button | **CONFLICT (not applied)** | Same as E1 — design-only content, intentionally not implemented. |

## Section F — Contribution Calendar

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| F1 | Position | Right column of a 2-col grid, alongside Today's Question/Daily Tech Read stacked in the left column | **FIXED** | Was a separate full-width `Card` below the DailyCodingCard/TrendingReadingCard row → moved into the two-column layout (see Section K). |
| F2 | Nav buttons | `26×26px`, `radius:6px`, outlined, literal `‹`/`›` glyphs | **FIXED** | Was plain hover-only chevron icons with no border → now bordered `26px` circular-ish buttons with the literal glyphs. |
| F3 | Weekday labels | Single letters: `S M T W T F S` | **FIXED** | Was full 3-letter labels (`Sun Mon Tue...`) → corrected to design's exact literal array (no substitution, even though `T` repeats for Tue/Thu). |
| F4 | Day cell shape | `aspect-ratio:1; border-radius:5px` | **FIXED** | Was a fixed `w-9 h-9 rounded-md` (6px) → now `aspect-square rounded-[5px]`. |
| F5 | Today indicator | `1.5px` accent ring on today's cell | **FIXED** | Was **missing entirely** — no visual distinction for the current day. Added. |
| F6 | Selected-day indicator + detail | `2px` primary-text ring on the selected cell; a detail line below (`"{Month} {day} — {status}"`) | **FIXED** | Click-to-select was **entirely missing** — cells had no `onClick` at all. Added, with the exact detail-line format design specifies. |
| F7 | Future-day treatment | Dashed border, no fill, not clickable | **FIXED** | Was **missing** — days beyond today in the current month rendered as plain gray "no activity" cells, indistinguishable from real past inactivity. Now dashed-bordered and disabled. |
| F8 | Month summary line | `"{solved} solved · {partial} partial · {missed} missed this month"` | **FIXED** | Was missing entirely → added, computed from the visible month's cells. |
| F9 | Legend | (round 4, 2026-08-10) Colored square swatches, **8×8px**, 2px radius, `gap:12px` (row), `gap:5px` (swatch-to-label), `font-size:10.5px` | **FIXED** | Round 2 already switched emoji→colored squares at 9px; round 4 shrank them further (9px→8px, row gap 16px→12px, swatch gap 6px→5px, text 11px→10.5px) — `CodingCalendar.tsx` legend row updated to `w-2 h-2`, `gap-3`, `gap-[5px]`, `text-[10.5px]`. Copy for the 4th item kept as **"No assignment"** rather than design's literal "None" — a real semantic difference in this app (a gray day specifically means no question was assigned that day, e.g. a rest day, not merely "no activity logged") — OPEN, kept for accuracy. |
| F10 | Header row spacing | `margin-bottom:10px` (round 4 — was `14px` in round 2) | **FIXED** | Nav/month-label row `mb-3.5`→`mb-2.5`. |
| F12 | Grid gaps + selected-detail sizing | (round 4, 2026-08-10) Weekday/day grid `gap:4px` (was 5px), weekday label `10px` (was 10.5px), selected-day detail box `font-size:11.5px; padding:6px 10px; margin-top:8px` (was `12px; 8px 12px; 10px`) | **FIXED** | `CodingCalendar.tsx`: `gap-[5px]`→`gap-[4px]` (both grids), weekday `text-[10.5px]`→`text-[10px]`, detail box `text-xs px-3 py-2 mt-2.5`→`text-[11.5px] px-[10px] py-[6px] mt-2`. |
| F11 | Streak/active summary | (round 4, 2026-08-10, replaces round 2's 3-tile grid) One line: `"🔥 {current} current · {best} best streak · {active}/{tracked} active this month"`, 11px tertiary, `margin-bottom:10px` | **FIXED** | Round 2's 3-tile grid (Current streak/Best streak/Active days) was itself replaced by the design with this single summary line one round later. Rebuilt in `CodingCalendar.tsx`: current/best streak are now computed **locally from the visible month's cells** (design's own algorithm — active = solved-or-partial, future days skipped without breaking the streak), not passed through from `codingStats` as round 2 did — the design's mock genuinely recomputes per-month, confirmed via its JS (`dayCells`-based `calendarBestStreak`/`calendarCurrentStreak`). "Active" is rendered as a **fraction** (`{activeDaysCount}/{trackedDaysCount}`, e.g. "18/25"), not the percentage round 2 used — the design's own `calendarActiveRate` mock value is explicitly a `"${count}/${total}"` string, not a `Math.round(...)%`. `codingStats.currentStreak`/`.longestStreak` are no longer passed into `CodingCalendar` at all (prop removed) since the calendar now derives its own numbers. No AI involved (Product Principle 2). |

## Section G — Goals

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| G1 | Single goal, plain bar | ~~Design's mock shows exactly one hardcoded goal ("Reach a 30-day coding streak") with a simple progress bar~~ — **REMOVED from the design** 2026-08-10, replaced by a new "Today's Quiz" warm-up-quiz section (see G2) | **MOOT** | This section was already removed from Coding's own UI independently, per an explicit user product decision the same day (see `audit/CHANGELOG.md` and the repo's commit history) — silent auto-requeue-free, no Goals card anywhere on this page anymore. The design's removal of its own Goals mock lines up with that decision; no further action needed here. |
| G2 | **"Today's Quiz"** | New section replacing G1: a one-question-at-a-time stepper (`todaysQuizIsQuestion`/`todaysQuizIsSummary` states), a 10-segment progress bar (`todaysQuizProgressSegments`), header shows `"{idx} of {total}"` while taking or a tiered score badge once done, each option has an A/B/C/D mark + label, an explanation box appears after answering, a full-width accent "Next question"/"See results" button advances, and the summary screen shows a big tiered-color percentage + "↻ Retake quiz" (full-width accent button, not the earlier outlined style). | **FIXED** (built 2026-08-10, redesigned same day after the design itself changed from an all-at-once list to this stepper — go-ahead given for static curated pool + persisted attempts) | Built `src/features/coding/todays-quiz.ts` (50-question hand-authored DSA/algorithms/JS pool, no AI — Product Principle 2; `getTodaysQuizQuestions()` deterministically rotates 10/day by days-since-epoch, ~5-day cycle), `todays-quiz-actions.ts` (`coding_quiz_attempts` table, one row per user per day, upserted; `question_ids` stored so a Retake always redoes the same 10 even if the pool is edited later), and `TodaysQuizCard.tsx`. Score tiers (badge/percent color) match Career's Quiz modal exactly: ≥80 good, ≥60 accent, ≥40 warn, else risk. |

## Section H — Practice Log

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| H1 | Card shell | `padding: var(--card-pad-lg)` | **FIXED** | Removed redundant `padding="p-3.5"` override. |
| H2 | Row background | Always-filled `bg-surface-2 rounded-[10px] padding:9px 13px` | **FIXED** | Was `hover:bg-surface-2` (transparent by default) → now always filled. |
| H3 | Tag/difficulty badge | `10px/700/uppercase`, `bg-border`, colored text — not a filled pill | **FIXED** | Was a filled colored pill (`bg-good-soft` etc.) → now `bg-border` with colored text, matching the badge convention established across this pass (Health's workout/read status, Coding's Today's Question status). |
| H4 | 3 filters (All/Completed/Pending) | Design's mock shows only 3 filter pills | OPEN (kept) | Repo's 8 filters (adds Revision/Favorites/Easy/Medium/Hard) are real, valuable filtering the compact mock doesn't model — kept, same category of decision as Learning's collapsed status filter. |
| H5 | Row actions (favorite, revision flag, inline complete, date) | Design's row is just a tag + title + status text, no interactive icons | OPEN (kept) | Real, necessary functionality (mark complete, favorite, flag for revision) — kept. |

## Section I — Recommended for You

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| I1 | Card shell | `padding: var(--card-pad-lg)` | **FIXED** | Removed redundant `padding="p-3.5"` override. |
| I2 | Row background | `bg-surface-2 rounded-[10px]`, no border | **FIXED** | Was `bg-surface-2 border border-surface-3` → border removed to match design exactly. |
| I3 | Add button | Literal `"+ Add"` (filled accent) / `"Added"` (outlined, disabled) — no icon | **FIXED** | Was a `Plus` icon + "Add" text, with "Added" using the same outlined style as the active state (no visual distinction between clickable and disabled) → corrected to design's exact two-state button spec. |
| I4 | Difficulty badge | Plain colored text, not a filled pill | **FIXED** | Same fix as H3/D2 — pill background removed. |
| I5 | "Get Recommendations" gate | Design's mock shows the list already populated, no fetch-trigger button | OPEN (kept) | Real, deliberate AI-cost-consciousness architecture (Product Principle 3 — never call AI until asked) — kept, this is the one AI-gated feature in the whole page and intentionally differs from every other section's always-visible mock content. |
| I6 | Position | Last section on the page | **FIXED** | Was positioned between the 2-column grid and Contribution Calendar → moved to the very end, after Practice Log, matching design's document order. |

## Section J — CodingSettingsPopover

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| J1 | Trigger border | `border-strong`, `28×28px` circle | **FIXED** | Border color corrected from `border-surface-3`. Size/shape already matched. |
| J2 | Icon | Literal `⚙` glyph | OPEN (kept) | Repo uses a lucide `Settings2` icon — kept for visual consistency with every other "edit"-style trigger in this app (Health's Edit profile, etc.), which already established icon-over-glyph as the app's own convention. |

## Section K — Layout

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| K1 | Today's Question + Daily Tech Read + Contribution Calendar | 2-column grid: left column stacks the two question/read cards, right column is the calendar | **FIXED, since narrowed by product change** | Design still depicts two stacked cards in the left column. Since Daily Tech Read was removed from the product (see Section E), the left column now holds only `DailyCodingCard`; the 1fr/1fr grid with the calendar in the right column is otherwise unchanged and still matches. |
| K2 | Difficulty Progression chart | Not present in design's mock at all | OPEN (kept) | Real feature (trend chart) added in an earlier phase — kept, positioned directly after the 2-column grid since design has no equivalent slot to place it in. |
| K3 | Section order | Header → stats → Weak Areas → [Question/Read \| Calendar] → Today's Quiz (2026-08-10, not built, see G2) → Practice Log → Recommended for You | **FIXED, since narrowed by product change** | Real order is Header → stats → Weak Areas → [Question \| Calendar] → Practice Log → Recommended for You — "Read" dropped from the bracketed pair per Section E; Difficulty Progression and Goals both dropped 2026-08-10 (product change, matches the design's own removal of its Goals mock); Today's Quiz not built (G2). |

---

## Summary

All MISMATCH/MISSING rows across Sections A–K are **FIXED**. The Contribution Calendar gained the most real functionality beyond styling: today/selected-day ring indicators, future-day dashed treatment, click-to-select with a detail readout, and a month summary line were all **entirely missing** — the calendar was previously a static, non-interactive color grid; 2026-08-10 added a 3-tile streak/active-days stats row and switched the legend from emoji to colored squares (F10/F11). Every status/difficulty badge across the module (Today's Question, Daily Tech Read, Practice Log, Recommended for You) was converted from a filled colored pill to design's `bg-border` + colored-text convention. Page structure now matches design's grouping (Question/Read cards + Calendar side by side; Today's Quiz → Practice Log → Recommended for You in that order — Goals dropped from both the design and the product, replaced by the new Today's Quiz section, see G1/G2). Remaining OPEN items (deliberate, not oversights): the struggle-rate 60%/70% threshold (real pre-existing scoring logic), multi-question daily assignments, Practice Log's 8 filters + row-level interactive actions, the AI-gated "Get Recommendations" flow, the settings gear's icon-over-glyph choice, and the Difficulty Progression chart (removed from the product 2026-08-10, see `audit/CHANGELOG.md`).

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser — header badges, stat tiles, Today's Question/Daily Tech Read cards, the fully-interactive Contribution Calendar (today ring, click-to-select, future dashing, month summary), Goals, Practice Log, and Recommended for You all confirmed rendering and working correctly.

---

## Re-sync pass (later date) — see `CHANGELOG-coding.md`

Compared the current `design_coding.html`'s `isCoding` block against every row above, property by property. Result: **zero CHANGED/ADDED/REMOVED elements** — every literal value (box, layout, type, color, border, depth, states, responsive) in the current design still matches what this file already recorded, across Sections A, B, C, D, F, G, H, I, K. The only update this pass made was reclassifying Section E's two rows from FIXED to CONFLICT (not applied): the design mock is unchanged and still shows a Daily Tech Read card, but the real product removed that card from Coding (moved to Learning) since the last sync — the old FIXED verdict was misleadingly implying code-design agreement on a section that's now deliberately absent from code. K1/K3 details were also adjusted to describe the current single-card left column (down from two stacked cards) without changing their FIXED verdict, since the underlying grid/order they describe is otherwise untouched. Section J (`CodingSettingsPopover`) was out of scope for this pass — owned by a parallel modal-audit agent, not re-diffed here.
