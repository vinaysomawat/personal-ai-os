# Today's Quiz — built, then redesigned same day (Round 3, 2026-08-10)

Round 2 (below) flagged Coding's new "Today's Quiz" section as a real feature needing a spec/go-ahead rather than a silent design-fidelity build, and captured the design's then-current spec (an all-questions-at-once list). Given the go-ahead (static curated pool + persisted attempts, both recommended defaults), it was built accordingly — then, mid-build, a fresh design fetch showed the design itself had changed again: from "show all N questions in one list" to a one-question-at-a-time stepper with a progress bar and a summary screen, and the mock's progress-segment count confirmed 10 questions/day (matching an explicit ask to raise it from an initial 3).

**What shipped:**
- `src/features/coding/todays-quiz.ts` — a 50-question hand-authored DSA/algorithms/JS pool (time/space complexity, data structures, graph/tree traversal, sorting/searching, JS mechanics — closures, hoisting, event loop, `this`, prototypes, async/await — and a few React fundamentals). No AI (Product Principle 2) — this is fixed CS/JS knowledge, not personalized, so a curated pool beats generation cost/risk. `getTodaysQuizQuestions()` picks 10/day, deterministic by days-since-epoch, rotating through the pool with no repeats until it cycles (~5 days).
- `src/features/coding/todays-quiz-actions.ts` — new `coding_quiz_attempts` table (migration `20260810b_coding_quiz_attempts.sql`, applied), one row per user per IST calendar day, upserted on Retake. `question_ids` are stored (not re-derived from the date), so a Retake always redoes the exact same 10 questions even if the pool is later edited/expanded.
- `src/features/coding/components/TodaysQuizCard.tsx` — the stepper UI: progress bar (10 segments, colored by answered-correct/incorrect/current/unreached), one question at a time with A/B/C/D-marked option buttons (instant reveal on pick, locked after), an explanation box, a full-width "Next question"/"See results" button, and a summary screen (big tiered-color percentage, "↻ Retake quiz"). Score tiers reuse Career's Quiz modal's exact bands (≥80 good, ≥60 accent, ≥40 warn, else risk) for consistent scoring language app-wide.

Wired into `CodingView.tsx`/`page.tsx` right after the [Question | Calendar] grid, matching the design's order. `audit/Coding-AUDIT.md` G2 updated from "not implemented" to FIXED.

Verified: `tsc`/`eslint` clean, `npm run build` clean, live-tested in the browser (instant per-question feedback, progress bar states, DB persistence across reload).

---

# Design Re-sync Changelog — Round 2 (2026-08-10, same day as Round 1)

Re-sync against the same live Claude Design project, re-fetched fresh. The design changed again since Round 1 (below) — a real byte-level diff against Round 1's raw extraction (still on disk from earlier this session) confirmed the design grew from 261399 to 261414 chars, with structural changes isolated to exactly 3 places: the shell header/nav, Career's `isCareer` block, and Coding's `isCoding` block. Everything else (Planner, Finance, Health, Learning, Documents, Settings, Quiz modal, Add Expense/Application modals, generic modals, all 5 generic advisor panels, Ask Brain, Executive Summary) is byte-identical to Round 1's already-synced state — confirmed via diff, not assumed, so those modules were not re-touched.

## Round 2 summary

| Area | Changed | Added | Removed | Unresolved (flagged, not built) |
|---|---|---|---|---|
| Shell logo/version | 1 | 0 | 0 | 0 |
| Career | 0 | 0 | 1 (no code impact) | 0 |
| Coding | 2 | 1 | 0 | 1 (new "Today's Quiz" feature) |
| Tokens | 0 | 0 | 0 | — |

### Shell logo/version

| # | Element | old → new | Verdict |
|---|---|---|---|
| 2b | Nav logo version line | `text-[9px] font-medium` (this project's own same-session addition, coincidentally overlapping with what the design independently added) → design's exact `text-[10px]`, no weight override | CHANGED | `TopNav.tsx`. Kept the value dynamic (`v{pkg.version}`) rather than the mock's static `"v1.0.0"` — real data beats a hardcoded mock string. |

### Career

| # | Element | old → new | Verdict |
|---|---|---|---|
| — | Hand-rolled "Goals" mock inside `isCareer` (`careerGoals` list, add-goal input, 19 lines) | present → **removed from the design entirely** | REMOVED — no code impact. The repo never mirrored this exact markup (`CAREER-AUDIT.md` already had it explicitly out of scope, always rendering the real shared `GoalsCard` instead). The design just cleaned up its own now-redundant mock. |

### Coding

| # | Element | old → new | Verdict |
|---|---|---|---|
| F9 | Calendar legend | emoji dots (`🟢🟡🔴⚪`) → colored squares (9×9px, 2px radius, plain `--good`/`--warn`/`--risk`/`--border`), `gap:16px` | CHANGED | `CodingCalendar.tsx`. "No assignment" copy kept over design's literal "None" (pre-existing OPEN call, unaffected). |
| F10 | Calendar header row | `mb-3`, no wrap → `mb-3.5`, `flex-wrap` | CHANGED | `CodingCalendar.tsx`. |
| F11 | Calendar stats row (new) | missing → 3-tile grid: Current streak / Best streak / Active days | ADDED | `CodingCalendar.tsx` + `CodingView.tsx` (passes `codingStats.currentStreak`/`.longestStreak` through; "Active days" is a new deterministic `%` computed in `CodingCalendar.tsx` from the existing `days` prop — no AI, Product Principle 2). |
| G1 | Goals section | single-goal progress bar → **removed from the design**, replaced by "Today's Quiz" (G2) | REMOVED — no code impact | Matches the product's own independent removal of Coding's Goals card earlier this session. |
| G2 | "Today's Quiz" (new) | missing → a full 10-question warm-up-quiz feature (question bank, answer state, scoring, retake) | **ADDED — flagged, NOT implemented** | Genuinely new feature (data model + state + scoring), not a style diff — needs its own spec/go-ahead per this project's workflow rules, not silently built during a design-fidelity pass. See `audit/Coding-AUDIT.md` G2 for the full design spec captured for whenever this gets picked up. |

### Tokens

Re-checked the `<style>` block (dark/light color vars, density padding) — byte-identical to Round 1 and to `globals.css`. 0 changes.

### Verification

`npx tsc --noEmit` and `npx eslint src/` both clean. `npm run build` succeeded. Manually verified the byte-diff coverage was exhaustive — all 11 diff hunks between Round 1's raw extraction and this fetch were accounted for above (including 3 hunks that were purely internal to the design's own JS mock/state script, e.g. `TODAYS_QUIZ_BANK`'s data and an unrelated old calendar-computation cleanup at the file's tail, neither of which has any template-visible effect beyond what's already listed).

---

# Design Re-sync Changelog — Round 1 (2026-08-10)

Full re-sync against the live Claude Design project (`040b5aee-a63a-4215-afee-fa1e00b56f95`, "Personal OS Dashboard prototype"), a single `Dashboard.dc.html` covering every module, modal, and advisor panel. Design file is the source of truth; the per-module `audit/*.md` files were the diff baseline (now updated to match this pass). Only CHANGED/ADDED/REMOVED rows are listed below — see each module's `audit/<Module>-AUDIT.md` for full row-by-row detail including UNCHANGED/OPEN rows.

## Summary

| Module | Changed | Added | Removed | Conflicts flagged (not applied) |
|---|---|---|---|---|
| Shell (header/nav) + Dashboard | 1 | 4 | 0 | 0 |
| Planner | 0 | 0 | 0 | 0 |
| Career (main view) | 0 | 6 | 0 | 0 |
| Finance (main view) | 3 | 2 | 0 | 0 |
| Health (main view) | 1 | 0 | 0 | 0 |
| Learning (main view) | 0 | 0 | 0 | 1 (Needs Revision banner) |
| Coding (main view) | 0 | 0 | 0 | 1 (Daily Tech Read card) |
| Documents + Settings | 0 | 0 | 0 | 0 |
| All modals (Modal.tsx shared) | 10 | 1 | 0 | 0 |
| Advisor panels (AIAdvisorProvider + Ask Brain + Executive Summary) | 11 | 0 | 0 | 0 |
| **Total** | **26** | **13** | **0** | **2** |

Token layer (colors, density padding): re-verified byte-identical to `src/app/globals.css` — 0 changes.

---

## Shell (header/nav) + Dashboard

| # | Element | old → new | Verdict | Detail |
|---|---|---|---|---|
| 2 | Logo lockup | icon badge + `hidden sm:inline` → plain text, always visible, `tracking-[0.2px]` | CHANGED | `TopNav.tsx`: removed `Cpu` icon badge and responsive hide. |
| 9 | Ask Brain trigger icon size | unspecified → `15px` | ADDED | `TopNav.tsx`: `size={13}` → `size={15}`. |
| 13b | Profile dropdown container shell | not itemized → `top:44px; right:0; width:200px; padding:8px; z-index:30` | ADDED | `ProfileMenu.tsx` corrected; click-outside backdrop dropped `z-40`→`z-20` so it doesn't sit above the new `z-30` dropdown. |
| 14 | Mobile nav z-index | undifferentiated `z-40` → bar `z-45` / sheet overlay `z-46` / sheet panel `z-47` | ADDED | `TopNav.tsx`. |
| 72 | Quick Add floating button z-index | unspecified → `z-25` | ADDED | `QuickAdd.tsx`: `z-40` → `z-[25]`. |

Dashboard's own body content: fully unchanged, no edits.

## Planner

No diff — design matches `audit/Planner-AUDIT.md` exactly across all 30 rows.

## Career (main view)

The Job Alerts card had never been audited before (ADDED relative to baseline, not a design change since last sync).

| # | Element | old → new | Verdict | Detail |
|---|---|---|---|---|
| E2 | Job Alerts row-list gap | `space-y-2` (8px) → `gap-1` (4px) | ADDED | |
| E3 | Job Alerts row layout | filled hover-pill → flat border-separated row | ADDED | |
| E4 | Job Alerts company/title text | 14px stacked 2-line → 13px single-line | ADDED | |
| E5 | Job Alerts date position | stacked 2nd line, 12px → inline, 11px | ADDED | |
| E6 | Job Alerts external-link affordance | lucide `ExternalLink` icon button → plain `↗` glyph | ADDED | |
| E7 | Job Alerts "Track" button | `rounded-lg`/12px → `rounded-[6px]`/11.5px | ADDED | |

Sections A–D confirmed unchanged.

## Finance (main view)

| # | Element | old → new | Verdict | Detail |
|---|---|---|---|---|
| 1 | SpendingHistory card padding | hardcoded `p-3.5` → Card's default `var(--card-pad-lg)` | CHANGED | |
| 2 | Category-breakdown header | missing → `"{month} spend by category"` + total row added | ADDED | Old bottom `"Total: ₹X"` line removed, absorbed into new header. |
| 3 | Pie chart + legend layout | stacked full-width → side-by-side `flex gap-6` | CHANGED | |
| 4 | Legend row percentage column | missing → `{pct}%` added | ADDED | |
| 5 | Legend row amount color/spacing | tertiary, 4px gap → secondary, 8px gap | CHANGED | |

Audit-only correction (no code change): Goals delete button (G4) reclassified FIXED → OPEN (kept) — design's mock has no delete control to match against at all.

## Health (main view)

| # | Element | old → new | Verdict | Detail |
|---|---|---|---|---|
| C8 | Daily Workout Planner detail labels | `"Warm-up"`/`"Cool-down"` → `"Warmup"`/`"Cooldown"` | CHANGED | `DailyWorkoutCard.tsx`. |

## Learning (main view)

No diff (0/0/0). One CONFLICT flagged and deliberately **not applied**:

| # | Element | Design says | Verdict |
|---|---|---|---|
| C1–C3 | "Needs Revision" risk banner | Design still shows this section unchanged | **CONFLICT (not applied)** — this was intentionally removed from the product on 2026-07-26/27 in favor of silent auto-requeueing. The design mock predates that decision. Left as-is. |

Also documented (Section H of the audit, not a gap): mandatory quiz gating, Weak Areas card, `estimated_minutes` field, "Today's Read" badge — real current functionality with no design equivalent at all.

## Coding (main view)

No diff (0/0/0). One CONFLICT flagged and deliberately **not applied**:

| # | Element | Design says | Verdict |
|---|---|---|---|
| E1–E2 | "Daily Tech Read" card + reading-tagged Practice Log rows | Design still shows this card unchanged | **CONFLICT (not applied)** — intentionally removed from Coding and moved to Learning as a "Today's Read" badge. The design mock predates that decision. Left as-is. |

## Documents + Settings

No diff in either module — both match their audit baselines in full (27 + 30 rows respectively).

## All modals (shared `Modal.tsx`)

`Modal.tsx` itself needed no changes — already fully conformant. Per-modal content fixes:

| # | Element | old → new | Verdict |
|---|---|---|---|
| 1 | Add Expense modal width | `440px` (default) → `400px` | CHANGED |
| 2 | Add Expense "Amount" label | `Amount *` → `Amount (₹)` | CHANGED |
| 3 | Add Expense "Category" label | `Category *` → `Category` | CHANGED |
| 4 | Add Expense amount validation copy | `"Required"` → `"Enter an amount before saving."` | CHANGED |
| 5 | Add Expense Save button label | `Save` → `Add Expense` | CHANGED |
| 6 | Add Application modal width | `440px` (default) → `460px` | CHANGED |
| 7 | Add Application grid row 2 | Status+Applied On → Status+Salary Range | CHANGED |
| 8 | Add Application grid row 3 | Location+Salary Range → Location+Job URL | CHANGED |
| 9 | Add Application Job Description rows | `rows={5}` → `rows={4}` | CHANGED |
| 10 | Add Application Job Description required marker | none → red `*` | ADDED |
| 11 | Add Application job-description validation copy | `"Required"` → `"Job description is required for match analysis."` | CHANGED |

Kept as-is (real functionality beyond the static mock, not reverted): Add Expense's not-yet-live budget-warning line, Add Application's "Applied On"/"Notes" fields, Log Study Session's dynamic button label, Learning's Resource Quiz (evolved well past the design's simple reveal-per-question mock into a full graded multi-stage quiz).

## Advisor panels (`AIAdvisorProvider.tsx` + Ask Brain + Executive Summary)

| # | Element | old → new | Verdict |
|---|---|---|---|
| 1 | Shared panel header padding (5 generic panels + Ask Brain) | `px-[...] py-[...]` (invalid CSS shorthand, silently dropped) → `p-[var(--card-pad-lg)]` | FIXED — real CSS bug |
| 2 | Shared panel entrance motion | slide+fade, 150ms → fade-only, 180ms ease-out | FIXED |
| 3 | Ask Brain panel width | `400px` (shared default) → `440px` via new `widthPx` param | FIXED |
| 4 | Ask Brain header padding + motion | inherited from #1/#2 | FIXED |
| 5 | Monthly tab row `margin-top` | `2px` → `3px` | FIXED |
| 6 | Executive Summary panel shape | small top-right dropdown → full-height right drawer (460px) | FIXED — found living in `PlannerView.tsx`, not `ExecutiveBrief.tsx` |
| 7 | Executive Summary overlay dimming | none (invisible click-catcher) → `bg-overlay` added | FIXED |
| 8 | Executive Summary panel z-index | `z-50` → `z-[60]` | FIXED |
| 9 | Executive Summary header | `sticky` scroll-pin hack → plain `p-[var(--card-pad-lg)]` | FIXED |
| 10 | Executive Summary content padding/gap | `p-4 gap-4` → `p-[var(--card-pad-lg)] gap-[18px]` | FIXED |
| 11 | Executive Summary entrance motion | top-slide+fade → fade-only, 180ms | FIXED |

Decide tab (inside Ask Brain): re-verified unchanged, all 10 previously-fixed rows still correct, real question-input/ask functionality preserved (not reverted to the design's static single-example mock).

**Correction to `audit/TOKENS.md`:** its z-index note previously claimed Executive Summary's drawer/z-layering was "already matched" — that was stale; row 6–8 above show it was actually still a small dropdown until this pass. Corrected below.

---

## Orphaned logic from REMOVED elements

None — zero REMOVED elements were found or applied across all 10 slices this pass.

## Files no longer needed

The 10 per-module `audit/CHANGELOG-*.md` files that fed this consolidated changelog have been removed after merging.
