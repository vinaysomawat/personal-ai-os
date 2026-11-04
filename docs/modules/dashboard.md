# Dashboard (`/dashboard`)

Server-computed on every load (`src/features/dashboard/actions.ts` `getDashboardData()` + `getHuntHero()`, brain `getExecutiveData()`).

## Hunt Hero

`loadHuntHero()` (`dashboard/hunt-hero.ts`, deterministic). A full-width Today's score card, then four tiles (`HuntHero.tsx`), each linking to where you act on it. **Today's score** (full-width card): 0–100 = % of today's plan done (`dayPace().donePct`: block minutes weighted, partial credit on question blocks by time — `blockProgress()`); 90+ green · 70+ accent · 40+ amber · else red, and green on a good day (3 blocks done, `isGoodDay()`) whatever the %; "/ 100", level · blocks done x/y, 7-day avg · best of 14 days, and a 14-day bar chart: the 13 days before today (`recentScores` from `loadPrepData()`, whole blocks only; no plan = grey stub) and today, with a dashed target line at 90. Pace lives on Prep only.

| Tile | Value | Sub-line |
| --- | --- | --- |
| Readiness | Prep's gated readiness % ([Prep](prep.md)), colored by tier | tier label (🔥 TOP 1% READY / ✅ INTERVIEW-READY · N blockers to close / 🧭 Building · N blockers left) |
| Mock average | average of the last 5 reviewed mock rounds /10 (`war.mockAvg`); green ≥7, amber ≥5, else red | "last 5 reviewed · ready at 7"; links to `/prep?tab=mock` |
| Revision due | revision-queue topics due today or overdue | amber when any; links to `/prep` |
| Runway | `liquid_savings ÷ avg monthly spend (last 90 days ÷ 3)` months | "at 90-day avg spend" or "set liquid savings" |

## Life Score (not shown while War Mode is always on — code kept)

Every module score blends today with the trailing week:
`moduleScore = dailyRaw × 0.6 + weeklyAvg × 0.4` (`LIFE_SCORE_THRESHOLDS` in `src/lib/thresholds.ts`), then
`lifeScore = round((health + finance + practice) / 3)`.

- **dailyRaw** is the only per-module value persisted to `life_score_logs` (never the blend, so the weekly average never averages an average). `life_score` itself is stored blended. **weeklyAvg** = mean of the trailing 7 days' raw score incl. today; a day with no row counts as 0 (accounts under 7 days old average only over days since signup).
- **Health** = Health's own `calculateHealthScore()` ([Health](health.md), `nutrition×0.6 + activity×0.4` against real targets); without a health profile it falls back to `(workout today ? 60 : 0) + (metrics logged today / 4) × 40`.
- **Finance** = banded budget ratio, smoothed within bands: `≤0.70 → 100`, `≤0.85 → 90→75`, `≤1.00 → 75→55`, `≤1.20 → 55→30`, else `max(10, 30 − (ratio−1.20)×40)`; `60` with no budget and zero spend, `50` otherwise.
- **Practice** (`projects_score` column) = `round(volume×0.5 + consistency×0.5)` over Question Bank / Mock answers in the last 30 days (`question_progress.last_seen_at`): volume = `min(100, Σ category weight × 3.2)` (system-design 1.5, algorithm 1.0, backend 1.0, code-review 1.0, quiz / javascript-functions / ui-coding 0.6, anything else 1.0); consistency = `min(100, distinct practice days ÷ 20 × 100)`.
- The upsert of today's raw sub-scores + blended life score runs after the response (`next/server` `after()`, service client).
- **Explain My Score** — clicking the ring opens `ScoreExplainer.tsx`: per module "{today} today · {weeklyAvg} week avg → {blended}", the day-over-day delta of the blended figure, and a deterministic tip naming the biggest point gap, biggest movers first. No AI.
- **Life Score Trend** (`LifeScoreTrend.tsx`, recharts, lazy-loaded) — Weekly/Monthly toggle over 30 days of `life_score_logs`. Hidden in Interview War Mode.
- **Quick Stats** (`QuickStats.tsx`) — Prep Streak (+ today's blocks done/total), Workout Streak, Budget Remaining (3-tier color; "Over ₹X" in red when over; "—" without a budget), Workout Today. Replaced by the Hunt Hero in Interview War Mode.

## Always shown

- **Header line** — date + `{Mahadasha}/{Antardasha} dasha` link to Astrology when a chart exists, else a time-of-day greeting. The dasha segment is hidden in Interview War Mode.
- **Your turn** (`NeedsAttention.tsx`, first card on the page, beside Daily Mission) — the ranked list from `buildPriorityItems()` (`dashboard/priority.ts`), titled "Your turn · {count}", top 3 shown: risks first, then Today's Focus signals. Each item is a card with a coloured left border (risk: red high / orange medium-low; signal: accent), the text in bold, "→ {action}" for risks, grey chips (module, impact) and a right-aligned tag (**ACT** for risks, **FOR YOU** for signals). A signal is dropped when a risk already covers it (`SIGNALS_COVERED_BY_RISK`: `budget_pace` covers `finance.over_budget`/`near_budget`). Risks are dismissible for today (✕, `decision_queue_dismissals`); signals are plain links.
  - **Signals** (each module's `signals.ts`, ranked by `rankSignals()` in `src/lib/signals.ts`): over budget (80), revision topics due in Prep (62, `prep.revision_due`), workout still open (60), ≥90% of budget used (55), no health metric today (50).
  - **Risks** (`computeRiskEngine()` in `brain/risk-opportunity-engine.ts`, thresholds in `src/lib/thresholds.ts`): `budget_pace` — month-end projection (`projectMonthSpend()`) over budget by ≥5% (impact tiers at 15% / 25%); `protein_decline` — last-3-day protein average ≥20% below the prior 3 days.
- **Daily Mission** (`daily-progress.ts`) — a checklist that resets at midnight: log today's health metrics, complete today's workout (when one is assigned), "Prep session: X/Y blocks done" (when a plan exists), log today's expenses. Score = done/total % (100 when nothing applies). Ring + full list, done items struck through.
- **Ask Brain** (header advisor, `BrainPanel.tsx` → `BrainChat.tsx`) — multi-turn Q&A over a reshape of the dashboard data (`brain/context-builder.ts`: scores, finance incl. goals, health, career memory incl. bio, practice in the last 30 days) via `askBrain()` (`brain_qa`, Sonnet, uncached). The prompt forbids inventing facts and markdown.
- **Quick Add** (app-wide floating "+", `QuickAdd.tsx`) — fast Expense or Metric (weight/steps/calories/protein) entry.
- **Realtime** — `RealtimeRefresh.tsx` refreshes on `workouts` / `health_metrics` changes (e.g. after a Telegram log).
