# Health Audit — design's `isHealth` block vs. repo

Source of truth: the `isHealth` template block (`design_full.txt` lines ~812-940) plus its companion state/logic (`healthScore`/`healthScoreTier`/`healthScoreBadgeStyle`, `workoutStatusBadgeLabel`, `healthRingGradient`/`nutritionRingGradient`/`activityRingGradient`, `healthMetrics`, `workoutStatusStyle`, `workoutExercises`, `labelStyle`, `workoutLogs`, lines ~3021-3060). Cross-checked against `src/features/health/components/HealthView.tsx`, `HealthScoreHero.tsx`, `DailyWorkoutCard.tsx`.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / OPEN (real functionality-vs-mock tradeoff, kept).

---

## Section A — Page header

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| A1 | Page title | `34px/700/-0.02em` | **FIXED** | Was `text-2xl sm:text-3xl tracking-tight` → now `text-[34px] tracking-[-0.02em]`. |
| A2 | Health Score badge | `"{score}/100 · {tier}"` pill, color tiered (accent/good/warn/risk by score band) | **FIXED** | Was **entirely missing** from the header (score only appeared inside the Health Score card) → added, with design's exact tier/color thresholds. |
| A3 | Workout status badge | `"🏋️ Workout {pending/in progress/done/skipped}"` pill | **FIXED** | Was missing — added, derived from the daily workout's real status. |
| A4 | Health Coach trigger | `moduleAdvisorTriggerStyle` | MATCH | Already correct (top-nav pill) — same architecture tradeoff noted for every module. |

## Section B — Editable daily metrics (healthMetrics)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| B1 | Position/layout | Top-level stat-tile row directly under the header — `auto-fit minmax(150,1fr)`, `radius:16px`, `padding:var(--card-pad-sm)` | **FIXED** | Was nested inside a "Today's Metrics" `Card` further down the page, styled as small boxy `p-2.5` cards. Promoted to a top-level stat-tile row matching design's position and the module's shared stat-tile visual language. |
| B2 | Label | `11px uppercase tertiary`, no emoji | **FIXED** | Repo prefixed each label with an emoji (⚖️🔥🥩👟) not present in design — removed. |
| B3 | Value | `20px/700` | **FIXED** | Was `text-lg` (18px) → now `text-xl` (20px), matching every other stat tile's value size in this pass. |
| B4 | Edit mechanism | Click-to-reveal an input + ✓ save button | OPEN (kept) | Repo's always-editable input (type directly, save on blur/Enter) is a real UX improvement over click-to-reveal — kept as-is. |
| B5 | "7d avg" caption | `11px tertiary`, `"7d avg {value}"` | **FIXED** | Was `"avg {value}"` (no "7d") at `text-xs` → corrected copy and size. |
| B6 | "X left of target" hint | Not present in design's mock | OPEN (kept) | Real, useful remaining-budget hint (calories/protein/steps left today) computed from the real health plan — kept. |

## Section C — Daily Workout Planner card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| C1 | Card shell/title | Standard big-card shell (`radius:18px`, `padding:var(--card-pad-lg)`); title **"Daily Workout Planner"**, `13px/700` (not uppercase) | **FIXED** | Was a hand-rolled `rounded-xl p-3.5` shell with an uppercase-tracking `text-sm` title "Today's Workout" — restyled to match the standard card chrome and title style used everywhere else, copy corrected. |
| C2 | Status indicator | Plain bold colored text on a `var(--border)` background pill — top-right of the header row | **FIXED** | Was a soft-tinted pill (`bg-warn-soft`/`bg-good-soft`/etc.) positioned inline with the workout name — moved into the header row, background unified to `bg-border` per design (text color still tiered — real, useful signal a single-state mock can't rule out, kept as OPEN on the color itself). |
| C3 | Streak/completed stats | Not shown in design's mock | OPEN (kept) | Real, valuable info (current streak, total completed) — kept. |
| C4 | Detail line | `"{N} exercises · {duration} min · {intensity}"` | OPEN (kept) | Repo shows `{duration} min · ~{calories} kcal · {muscles}` instead — different but equally real data (exercise library provides calories/muscle groups; design's mock's "intensity" field isn't tracked). Left as a reasonable substitution rather than fabricating an unavailable "intensity" value. |
| C5 | Button row | Start/Complete/Skip **plus** an inline `"Show/Hide full workout"` text trigger, all on one row (trigger pushed right via `margin-left:auto`) | **FIXED** | The toggle was previously a separate full-width bordered footer button below the action row, with a chevron icon. Moved inline into the same row as Start/Complete/Skip, restyled to plain accent text (no icon, no border), matching design exactly. |
| C6 | Button colors | Start = accent, Complete = `var(--good)`/`var(--on-good)` text, Skip = outlined | **FIXED** | Complete was `bg-green-600` (a literal Tailwind color) → now `bg-good text-on-good` (the design's actual semantic tokens). |
| C7 | Exercise detail | Flat `"{name}  {sets}×{reps} · {rest} rest"` lines | OPEN (kept) | Repo's full table (sets/reps/rest/RPE/notes columns) is real, richer data the compact mock's flat lines can't represent — kept. |
| C8 | Section label style | `11px/700/uppercase/0.4px-tracking` | **FIXED** | Was `text-xs uppercase tracking-wider` (no bold) → corrected across all 5 section labels (Warm-up/Exercises/Cardio/Cool-down/Coach Tips). |
| C9 | Detail section divider | `margin-top:14px; padding-top:14px; border-top:1px solid var(--border)` | **FIXED** | Was `mt-3` with no border — now `mt-3.5 pt-3.5 border-t`, matching design. |

## Section D — Health Score card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| D1 | Card shell/header | Standard big-card shell; header row = title **"Health Score"** + outlined **"Edit profile"** button (not an absolutely-positioned overlay) | **FIXED** | Was `rounded-xl p-3.5` with the edit button `absolute top-3 right-3` overlapping the ring layout → restructured into a proper title+button header row, standard shell. |
| D2 | Ring size | 82px outer / 66px inner (8px ring thickness) | MATCH | Already correct — unchanged. |
| D3 | Ring inner content | Just the number (`{{healthScore}}`), no "/100" sub-label | **FIXED** | Repo showed the score plus a small "/100" line beneath it → removed, matching design (just the number). |
| D4 | Tier text color | Design's mock hardcodes `var(--good)` (its one sample state is a high score) | OPEN (kept) | Repo's tiered red/amber/green color (matching the actual score band) is real, meaningful signal a single always-good mock state can't rule out — kept. |
| D5 | Sub-score (Nutrition/Activity) ring size | 22px diameter | **FIXED** | Was the default 32px `MiniRing` size → now 22px, matching design. |
| D6 | Sub-score label | `"{label} · {weight}×"` (e.g. "Nutrition · 0.6×") | **FIXED** | Weight fraction was missing entirely — added, using the real weights from `calculations.ts`'s formula (nutrition×0.6 + activity×0.4, confirmed matching design's own 0.6/0.4 split). |
| D7 | Sub-score reason text | Shown only in a hover `title` tooltip, not visible inline | OPEN (kept) | Repo keeps the reason text always visible (truncated, with the full text still in a `title` tooltip) — a real accessibility improvement over a hover-only tooltip, which isn't reachable on touch devices, and directly serves this app's "every page should answer... why" principle. Kept over an exact mock match. |

## Section E — Computed target stat tiles

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| E1 | Grouping | A **separate** stat-tile row (BMI / Calorie Target / Protein Target / Workouts-per-Week), distinct from Section B's editable-metrics row | **FIXED** | Repo previously combined both groups (plus "Weight" and "Workouts today", neither of which design places here) into one 7-tile row. Split into two separate rows matching design's structure; "Weight" was already covered by Section B's own tile, "Workouts today" is already visible via the Workouts card's own "N today" badge (Section F) so wasn't lost, just de-duplicated. |
| E2 | Tile style | Same stat-tile treatment as every other tile in this pass | **FIXED** | Was a bare `<p>`/`<p>` pair inside a single bordered box with no per-tile card chrome → each target is now its own `rounded-2xl p-[var(--card-pad-sm)]` tile. |
| E3 | "Workouts / Week" tile | A literal `4` (the profile's target workout frequency) | OPEN (kept) | Repo doesn't currently track a distinct "workouts per week" target field in `computeHealthPlan`'s output — carbs/fat targets (real, useful macro data) were shown in that slot instead of fabricating an untracked value. |

## Section F — Workouts log card

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| F1 | Add trigger | Literal `"+ Log"` text, no icon | **FIXED** | Lucide `Plus` icon + "Log" text → literal `"+ Log"`, matching this pass's established pattern (Planner/Finance/Health all drop icons from "+ Add"-style triggers per design). |
| F2 | Row format | `"{type}"` left, `"{duration} min · {date}"` right, `12.5px` secondary | **FIXED** | Repo showed only `"{type} — {duration} min"` with no date at all → restructured to the two-sided layout with the date included. |
| F3 | Delete glyph | Not shown in design's mock | OPEN (kept) | Necessary real functionality — kept, switched to the `✕` glyph for consistency with this pass's other modules. |
| F4 | Input styling | `radius:8px`, `padding:8px 11px`, `12.5px` | **FIXED** | Sizing corrected to match (was `rounded-lg`/`text-sm`). |

## Section G — Layout

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| G1 | Daily Workout Planner + Health Score | Side-by-side two-column grid | **FIXED** | Was stacked full-width (Daily Workout Planner above, Health Score below, separated by the profile-setup banner). Now a `lg:grid-cols-2 items-start` row, matching design. |
| G2 | Health Trend chart | Not present in design's mock at all | OPEN (kept) | Real feature (weekly/monthly trend charts) added in an earlier phase of this project — kept, positioned after the two-column row (a reasonable placement design doesn't specify one way or the other). |
| G3 | Health profile setup banner (before any profile exists) | Not present in design's mock | OPEN (kept) | Necessary real onboarding UI — kept, unchanged. |

---

## Summary

All MISMATCH/MISSING rows across Sections A–G are **FIXED**. The page was restructured to match design's grouping: editable metrics promoted to a top-level stat-tile row, Daily Workout Planner + Health Score placed side by side, and computed targets split into their own second stat-tile row instead of one merged 7-tile row. `DailyWorkoutCard`'s "show full workout" toggle — previously a separate bordered footer button — is now inline with the Start/Complete/Skip actions per design. Remaining OPEN items (deliberate, not oversights): always-editable metric inputs, remaining-budget hints, workout streak/completed stats, the richer exercise table, tiered Health Score/status colors, always-visible sub-score reason text (vs. design's hover-only tooltip — kept for touch accessibility), the Health Trend chart, and the profile-setup banner.

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser — header badges, stat tiles, Daily Workout Planner/Health Score side-by-side layout, inline "Show full workout" toggle, and the Workouts log's date field all confirmed working.
