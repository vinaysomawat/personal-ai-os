# Personal OS

[![CI](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml/badge.svg)](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/r194dme8y/c/19242327)

A personal, single-user AI Operating System: one Next.js app for interview prep, the job hunt, money, health and a Vedic astrology module — with Claude used only where judgment is needed (answer reviews, coaching, narratives), a per-module Telegram bot for hands-free logging (text, voice or photo), scheduled Telegram coaching, and a daily Life Score.

**Since v4.0 (2026-10-10) the app is built around an active job hunt.** Prep's Interview War Mode is always on: the Dashboard is a Hunt Hero, the Telegram coach runs the day, and non-essentials (astrology push, weekly/monthly digests) are paused. The day's size is a load level (Light 4h · Steady 6h · Intense 8h · Max 12h).

This document describes exactly what the app does today — module by module, field by field, formula by formula — so it can be pasted into a fresh AI chat and give complete understanding with no other context. It is kept current with every functional change (`CLAUDE.md`'s post-task checklist). **History lives in `CHANGELOG.md` and git, not here.**

**Status:** a personal project for one person's life and workflow, open-sourced as a working example of an AI-assisted personal system (Next.js + Supabase + Claude + Telegram). Not multi-tenant. Fork it and borrow the patterns.

To run your own instance: clone, `npm install`, `cp .env.example .env.local` and fill it in (see [Environment variables](#environment-variables)), run every SQL file in `supabase/migrations/` in filename order, then `npm run dev`. MIT licensed — see `LICENSE`.

---

## 1. Dashboard (`/dashboard`)

Server-computed on every load (`src/features/dashboard/actions.ts` `getDashboardData()` + `getHuntHero()`, brain `getExecutiveData()`).

### Hunt Hero

`loadHuntHero()` (`dashboard/hunt-hero.ts`, deterministic). A full-width Today's score card, then four tiles (`HuntHero.tsx`), each linking to where you act on it:

| Tile | Value | Sub-line |
| --- | --- | --- |
| Readiness | Prep's gated readiness % (§2), colored by tier | tier label (🔥 TOP 1% READY / ✅ INTERVIEW-READY · N blockers to close / ❌ NOT READY · N blockers)| Today's score (full-width card) | 0–100 = % of today's plan done (`dayPace().donePct`: block minutes weighted, partial credit per answered question); 90+ green · 70+ accent · 40+ amber · else red | "/ 100", level · blocks done x/y, 7-day avg · best of 14 days, and a 14-day bar chart: the 13 days before today (`recentScores` from `loadPrepData()`, whole blocks only — per-question partial credit isn't kept for past days; no plan = grey stub) and today, with a dashed target line at 90 | past days; no plan = grey) and today |
| Next interview | company of the next scheduled round | round kind · IST date-time, or "no round booked" |
| Pace today | Ahead / Behind Xh Ym / On pace (green / red / neutral) | % of plan done · % of 8am–10pm gone, plus a bar with a tick where you should be |
| Runway | `liquid_savings ÷ avg monthly spend (last 90 days ÷ 3)` months | "at 90-day avg spend" or "set liquid savings" |

The pipeline numbers come from `loadPipelineStatus()` (`career/pipeline-status.ts`, shared with the 7:30am coach message): this Monday-start IST week's funnel row (§3), follow-ups due, and debriefs prompted but not answered.

### Life Score (not shown while War Mode is always on — code kept)

Every module score blends today with the trailing week:
`moduleScore = dailyRaw × 0.6 + weeklyAvg × 0.4` (`LIFE_SCORE_THRESHOLDS` in `src/lib/thresholds.ts`), then
`lifeScore = round(health×0.30 + finance×0.25 + career×0.25 + practice×0.20)`.

- **dailyRaw** is the only per-module value persisted to `life_score_logs` (never the blend, so the weekly average never averages an average). `life_score` itself is stored blended. **weeklyAvg** = mean of the trailing 7 days' raw score incl. today; a day with no row counts as 0 (accounts under 7 days old average only over days since signup).
- **Health** = Health's own `calculateHealthScore()` (§5, `nutrition×0.6 + activity×0.4` against real targets); without a health profile it falls back to `(workout today ? 60 : 0) + (metrics logged today / 4) × 40`.
- **Finance** = banded budget ratio, smoothed within bands: `≤0.70 → 100`, `≤0.85 → 90→75`, `≤1.00 → 75→55`, `≤1.20 → 55→30`, else `max(10, 30 − (ratio−1.20)×40)`; `60` with no budget and zero spend, `50` otherwise.
- **Career** = `min(100, profile filled (current+target role) 10 + outreach this week ÷ weekly target × 25 (≤25) + active processes ×10 (≤25) + mock rounds in 30 days ×4 (≤20) + interview questions logged in 30 days ×4 (≤20))`.
- **Practice** (`projects_score` column) = `round(volume×0.5 + consistency×0.5)` over Question Bank / Mock answers in the last 30 days (`question_progress.last_seen_at`): volume = `min(100, Σ category weight × 3.2)` (system-design 1.5, algorithm 1.0, backend 1.0, code-review 1.0, quiz / javascript-functions / ui-coding 0.6, anything else 1.0); consistency = `min(100, distinct practice days ÷ 20 × 100)`.
- The upsert of today's raw sub-scores + blended life score runs after the response (`next/server` `after()`, service client).
- **Explain My Score** — clicking the ring opens `ScoreExplainer.tsx`: per module "{today} today · {weeklyAvg} week avg → {blended}", the day-over-day delta of the blended figure, and a deterministic tip naming the biggest point gap, biggest movers first. No AI.
- **Life Score Trend** (`LifeScoreTrend.tsx`, recharts, lazy-loaded) — Weekly/Monthly toggle over 30 days of `life_score_logs`. Hidden in Interview War Mode.
- **Quick Stats** (`QuickStats.tsx`) — Prep Streak (+ today's blocks done/total), Workout Streak, Budget Remaining (3-tier color; "Over ₹X" in red when over; "—" without a budget), Workout Today. Replaced by the Hunt Hero in Interview War Mode.

### Always shown

- **Header line** — date + `{Mahadasha}/{Antardasha} dasha` link to Astrology when a chart exists, else a time-of-day greeting. The dasha segment is hidden in Interview War Mode.
- **Top Priority banner** — item 0 of the same ranked list Needs Attention renders (`buildPriorityItems()` in `dashboard/priority.ts`), whole row links to its module.
- **Needs Attention** (`NeedsAttention.tsx`) — up to 3 items: risks first, then Today's Focus signals, then opportunities. A signal is dropped when a risk already covers it (`SIGNALS_COVERED_BY_RISK`: `budget_pace` covers `finance.over_budget`/`near_budget`). Risks/opportunities are dismissible for today (`decision_queue_dismissals`); signals are plain links.
  - **Signals** (each module's `signals.ts`, ranked by `rankSignals()` in `src/lib/signals.ts`): interview round within 48h (95), over budget (80), revision topics due in Prep (62, `prep.revision_due`), workout still open (60), company mid-process with no round scheduled (58), ≥90% of budget used (55), no health metric today (50).
  - **Risks** (`computeRiskEngine()` in `brain/risk-opportunity-engine.ts`, thresholds in `src/lib/thresholds.ts`): `budget_pace` — month-end projection (`projectMonthSpend()`) over budget by ≥5% (impact tiers at 15% / 25%); `protein_decline` — last-3-day protein average ≥20% below the prior 3 days. **Opportunity**: `interview_momentum` — ≥3 active processes → batch interview practice.
- **Daily Mission** (`daily-progress.ts`) — a checklist that resets at midnight: log today's health metrics, complete today's workout (when one is assigned), "Prep session: X/Y blocks done" (when a plan exists), log today's expenses. Score = done/total % (100 when nothing applies). Ring + full list, done items struck through.
- **Ask Brain** (header advisor, `BrainPanel.tsx` → `BrainChat.tsx`) — multi-turn Q&A over a reshape of the dashboard data (`brain/context-builder.ts`: scores, finance incl. goals, health, career memory incl. bio, practice in the last 30 days) via `askBrain()` (`brain_qa`, Sonnet, uncached). The prompt forbids inventing facts and markdown.
- **Quick Add** (app-wide floating "+", `QuickAdd.tsx`) — fast Expense or Metric (weight/steps/calories/protein) entry.
- **Realtime** — `RealtimeRefresh.tsx` refreshes on `workouts` / `health_metrics` changes (e.g. after a Telegram log).

## 2. Prep (`/prep`)

The center of the app: *what do I practice today, and am I interview-ready?* for Senior / Lead Frontend roles. Code in `src/features/prep/`. `loadPrepData(db, userId)` (`core.ts`, a plain server module, not `'use server'`) is the one data path for the page, the crons and the Telegram bot. Tabs (`PageTabs`): **Today / Questions / Mock Round / Story Bank**, deep-linkable via `?tab=`, `&cat=<category>`, `&topic=`, `&format=screen|behavioral|system-design|machine-coding`.

### Interview War Mode and the daily plan

- **Always on.** There is no target date and no off switch; `isHuntMode()` (`hunt.ts`) returns true and stays the one shared check.
- **Settings** (`prep_settings`): `hours_per_day` = the **daily load level** (`LEVELS` in `hunt.ts`: Light 4 · Steady 6 · Intense 8 · Max 12; `levelOf()` maps any stored value to the nearest) — it sizes the plan; pace is judged against the 8am–10pm window. `weekly_outreach_target` (default 25 for new rows and when unset) feeds the Interviews pipeline and the Career score only — outreach is not part of War Mode, and it isn't editable in the War header. The level is set in the War header's level switch; `savePrepSettings(hours, outreach)` (the stored target is passed through unchanged) deletes today's `prep_sessions` row so the plan rebuilds. The `target_date` column is no longer read or written. `isHuntMode()` is the shared check — code identifiers (`hunt.ts`, `isHuntMode`, `HuntHero`) keep the older "hunt" name; every user-facing string says Interview War Mode.
- **Plan** (`buildHuntPlan()`, deterministic), stored once per day in `prep_sessions.blocks` so it doesn't shift mid-day. Block order:
  1. **Company prep** (`company:{applicationId}`) — when a round is booked within 72h: 60 min if it's within 24h, else 40, on the JD's priority topics, the company's past questions and a mock + topics chosen by the company's **segment** (`SEGMENT_PREP` in `hunt.ts`: big_tech → code-review mock, Algorithms, System design · product_india → machine coding, Web fundamentals, Algorithms · startup → system-design mock, Backend & APIs, Full-stack design, a deep-dive story · ai_company → code-review mock, AI-native, Streaming UI, AI backend · service / remote_global / other → machine coding, Theory, Behavioral Q&A); a round kind with its own format (system design, coding, behavioral, hiring manager) still picks the mock (`companyPrepBlock()`).
  2. **Redo real interview questions × N** (`bank:interview`) — while any `interview` category question is rated under 7 (10 min each, max 4; `interviewRedoBlock()`).
  3. The two weakest Question Bank categories, then the **Mock round** (format by weekday, `mockFormatForDay()`: Mon machine coding · Tue behavioral · Wed and Thu code review · Fri machine coding · Sat system design · Sun frontend screen), then the remaining categories weakest first, then **STAR stories** (12% of the day while any competency lacks a solid story, 6% after).
- **Quotas** (`computeQuotas()`): each category has a base share and minutes per question — UI coding 18% / 45 min · System design 13% / 60 · Theory 10% / 5 · Backend & APIs 12% / 8 · JS functions 10% / 25 · AI-native 9% / 10 · Algorithms 9% / 30 · Angular 6% / 6 · Behavioral Q&A 6% / 10 · From my resume 8% / 8 · FE architecture & lead 9% / 8 · Code review 5% / 15 · Asked in interviews 0% (redo block only). Below Steady (6h) a category whose share can't fit one question gets 0 (otherwise min 1); a fill pass then hands leftover minutes one question at a time to the category furthest below its share that still fits, so each level's day totals its hours (Light 12 · Steady ~21 · Intense ~29 · Max ~46 questions). Shares are multiplied by `0.5 + gap` (`categoryWeights()`, gap 0 = at gate, 1 = blind spot), renormalized, and fill the minutes left after the mock, stories, company and redo blocks; quota = what fits (min 1). On machine-coding days the UI-coding bank block is dropped, and on code-review days the code-review block (the mock is that practice). **Redo weak answers** (`isRedoDue()` / `redoSlots()` in `hunt.ts`): a question whose latest rating is under 7 is due again 1 day (<5), 2 days (<6) or 4 days (<7) after that rating — the revision queue's gaps (`redoInterval()`), and not if already answered today. Up to 40% of a category's quota (`REDO_SHARE`, rounded — so a quota of 1 has none) is redo slots: the day's first answers in that category go to due weak answers, the rest to new questions; a redo replaces the old rating, and at 7+ the question stops coming back. `bankCoverage()` counts `redoDue` per category, and the plan block's detail says "the first N redo your weak answers"; the answer panel's header reads "Redo · was N/10 on MM-DD". Bank blocks auto-tick when today's answered count in the category reaches the quota; the mock block when a round is saved.
- **Prep streak** = consecutive days with a completed session (today given grace).

### Question Bank (Questions tab)

The global `coding_questions` pool (~1,150 + real interview questions): theory `quiz`, `angular`, `ai-native`, `behavioral`, `javascript-functions`, `ui-coding`, `system-design`, `algorithm`, `backend`, `code-review`, `resume`, `architecture`, and `interview` (real questions from §3). Linked rows open the source (GreatFrontEnd); linkless rows show key points (`answer_hints`). **Algorithms** (`algorithm`, 92 GreatFrontEnd algo problems) are ordered by frontend-interview importance via `sort_order` (`scripts/prep-2026/algorithm.mjs`): 32 Blind-75 must-haves → 41 core mediums (intervals, DP, graphs, trie, bits) → hards, then textbook sorts and data structures. **JS functions** (196) and **UI coding** (79) are ordered the same way (`scripts/prep-2026/javascript-functions.mjs`, `ui-coding.mjs`; shared `orderPatch()` in `order.mjs`, which throws if the list and the category drift): JS — 40 classics (debounce/throttle, promise utilities, bind/call/apply, deep clone/equal, event emitter, curry, memoize…) → core utilities, DOM and React hooks → niche or library-specific (II–IV sequels, ORMs, query builders, jQuery); UI — 29 machine-coding staples (typeahead, todo, tabs, accordion, modal, carousel, data table, infinite scroll, virtualized list…) → second wave (pickers, games, forms, widgets) → III/IV sequels. **Backend & APIs** (`backend`, 45 linkless rows, source 'Prep additions', must-haves first by `sort_order`): API design (8), Node / Next.js server (8), Auth & security (7), Data (8), Caching & performance (6), AI backend (8) — each with 4–6 key points; reviewed with the `technical` rubric. **Code review** (`code-review`, 15 rows): an "AI-generated PR" diff of 40–120 lines in `coding_questions.body` (React components, hooks, Express / Next API handlers, a CSS change; diffs in `scripts/prep-2026/code-review/*.diff`) with 5–6 planted issues across correctness, accessibility, security, performance and API/naming as `answer_hints`. The body renders above the answer box as a monospace block (`CodeBlock` in `AnswerReview.tsx`, +/- lines tinted, scrolls inside a 420px box, no highlighting dependency). Reviewed with the `code-review` rubric: points = planted issues found, Findings correct 0–2 · Severity & prioritization 0–2 · Fix quality 0–1, same `scoreCard()` formula; the model answer is a senior's review ranked by severity. **From my resume** (`resume`, 85 linkless rows, 32 must-haves first): what an interviewer probes on each claim of the current resume (`~/Downloads/Resumes`, data in `scripts/prep-2026/resume.mjs`) — Walkthrough & fit (6), SS&C (12), Shiprocket (22), Biofourmis (10), Novopay (8), Personal OS (12), Skills (15); key points describe what a strong answer covers (the decision, alternatives, trade-off, a real number), never facts about the work. `technical` rubric; the model answer uses [your number]-style placeholders where only you know the fact. Its plan block reads "Answer N resume deep-dive questions out loud from your real work"; its gap is Behavioral + Leadership (`CATEGORY_AREAS`), and its ratings feed the Behavioral readiness area. **FE architecture & lead** (`architecture`, 90 linkless rows, 41 must-haves first; data in `scripts/prep-2026/architecture.mjs`): what Senior / Lead / Staff / Frontend Architect loops ask beyond component design — Architecture strategy (14: rendering strategy, codebase structure for many teams, state architecture, BFF, multi-tenant, plugins, offline, real-time), Build & bundling (12: Webpack/Vite/Turbopack, tree shaking, code splitting, caching, budgets, source maps), Monorepo & tooling (8: Nx/Turborepo/pnpm, affected CI, boundaries, upgrades), Micro-frontends (10: when not to, composition options, Module Federation sharing, communication, migration), Performance architecture (8: Web Vitals, RUM, hydration, third parties, CDN), Platform & delivery (10: CI/CD, feature flags, canary, observability, testing strategy, migrations), Security (6), Design system platform (6) and Tech lead (16: RFCs, ADRs, tech debt, standards, incidents, influence, scaling teams, levels). `technical` rubric. Its plan block reads "Answer N architecture & lead questions out loud — the options, the trade-off, your call"; its gap is System design + Leadership (`CATEGORY_AREAS`), and its ratings feed the System design readiness area (rows tagged Performance also feed Performance). New rows for v4.1 are seeded by `scripts/seed-prep-2026.mjs` (service client, re-runnable: matched on category + title, inserted or refreshed; data in `scripts/prep-2026/*.mjs`).

- **Question list** per category (+ optional topic filter), every question visible: due redos first (weak answers, lowest rating first, up to today's unused redo slots — see Redo weak answers), then unseen (`sort_order`, else medium → easy → hard), then practiced — remaining due redos first, then longest ago. Each row: Redo (amber dot) / New (accent dot) / Review (grey dot) / ✓ answered today, title, difficulty initial or last-seen date, last rating chip. Pick any row to answer it; the top row is preselected. At `xl` the list (272px) and the answer panel sit side by side; below `xl` the list shows first and a picked question replaces it, with "← All questions" back.
- Each question: a typed answer — prefilled with your last answer only if you answered it today (a repeat on a later day starts blank), word count. **AI review is mandatory before Next** for any answer of ≥40 chars: the primary button reads **Review** until the review lands, then **Next →**. Shorter answers (e.g. a note on a problem solved on the linked site) go straight to Next. An empty box shows **Skip →** instead (secondary style, hint "Nothing typed — Skip won't count it"): it moves to the next question without saving — no `last_seen_at`, no quota credit, the question stays unanswered. Editing after a review dims it with a **Re-review edited answer** link; Next stays available. A failed or budget-fallback review still unlocks Next. Review = `critiqueAnswer(id, answer, spoken)` → `critiqueQuestion()` in `critique.ts`: `ai_native_critique` for AI-native, otherwise `answer_critique`; Haiku, uncached; rubric by category (`rubricFor()`): `technical` for theory/Angular/UI coding/system design/algorithms/backend, `behavioral`, `ai-native`, `code-review` (the diff is included in the prompt). An answer dictated with Speak gets `SPOKEN_NOTE` (ignore transcription errors, judge as spoken). **The AI only judges; code scores.** It returns a JSON scorecard (`Scorecard`, `scorecard.ts`): `points` (the question's `answer_hints` split into key points, or 4–6 it derives when none) each `covered` / `partial` / `missing` with a note; `correctness` 0–2, `depth` 0–2, `clarity` 0–1 (labels per rubric — behavioral: No red flags / Evidence / Direct & concise; AI-native: Judgment / Real example / Clarity); `summary`, 2–3 `fixes`, `followUp`. **Rating** (`scoreCard()`): coverage = (covered + ½·partial) ÷ points, substance = min(1, 2·coverage); rating = round(1 + 9·(0.55·coverage + substance·(0.25·correctness/2 + 0.08·clarity) + 0.12·depth/2)), capped at 4 on correctness 0 and at 5 when coverage < ⅓, clamped 1–10. Verdict from the rating: ≥8 Strong, ≥6 Good, else Needs work. The `AnswerReview` card: rating chip + verdict + summary, a breakdown line (Key points c/n · the three criteria), the key-point checklist (✓ / ◐ / ✗ + note, two columns on `sm+`), numbered Fix next, Follow-up callout, `code` as monospace chips. A reply that isn't a valid scorecard (budget fallback, malformed JSON) shows as plain text with no rating. **Answer** (not on algorithm / JS functions / UI coding, which keep "Open the problem"): `revealModelAnswer()` → `modelAnswer()` (`model_answer`, Sonnet, cached 1 year — the prompt is fixed per question, so only the first reveal costs): a 150–220-word spoken-style model answer covering the key points (theory: what → how under the hood → example → trade-off; system design: compact outline; behavioral / AI-native: an example labelled "adapt it to your own experience"), current as of React 19 / Next.js 15 / Angular 19, fenced code rendered as code blocks. Revealing it **before** any review marks the attempt *studied*: the Review gate lifts, the panel says "won't be rated", and Next saves no rating (`last_seen_at` still updates). Revealing after a review changes nothing. **Answer follow-up →** under the review card's follow-up (Question Bank and Story Bank): your own answer + 🎙 Speak → `critiqueFollowUpAnswer()` → `critiqueFollowUp()`, the same scorecard with derived key points (story follow-ups use the behavioral rubric), shown as a nested review card; practice only — nothing stored, the original rating untouched. **Next →** (`answerQuestion()` → `question_progress`: answer, attempts, `last_seen_at`, and the rating as `last_rating` / `last_rated_at`) moves to the question below in the list.
- Coverage card: per-category seen/total and today's quota.

### Voice mode (web)

A **Speak** mic button (`src/components/MicButton.tsx`, `useDictation()`) sits beside the word count on every answer box: Question Bank, Mock Round, Story Bank rehearsal, and Interviews' "your answer" (add form and edit). Tap to record (`MediaRecorder`: webm/opus, mp4 on iPhone Safari; max 5 min), tap Stop; the audio is POSTed to **`/api/transcribe`** (route handler — server actions cap bodies at 1 MB; checks the Supabase session itself since `/api` is outside the auth middleware; ≤4 MB) → `transcribeAudio()` (`src/lib/transcribe.ts`, Groq `whisper-large-v3-turbo`, `language: en`, a frontend-vocabulary prompt so terms like useMemo come back spelled right). The text is appended to the box (typing and speaking mix); a line shows "m:ss spoken · N fillers" (`speechStats()` in `src/lib/speech-stats.ts`, shared with the voice drill). Nothing is stored but the text; transcription makes no Claude call. A recording in progress is dropped if its question changes (button keyed per question).

### Readiness, War Mode and revision

- **Readiness matrix** (`readiness.ts`, 17 areas in `READINESS_AREAS`): JS, TS, React/Next.js, CSS, Accessibility, Performance, Testing (also fed by `code-review` ratings), Browser/network/security, System design (also fed by `architecture` ratings), AI-native, UI coding, Angular, Backend & APIs (the `backend` category + the Networking & APIs topic), AI-assisted coding (`code-review` ratings — reviewing AI-generated PRs), Algorithms, Behavioral, Leadership. Each averages real signal: AI answer ratings ×10 on the area's topics/category (≥2), coding outcomes from older practice history (solved 100 / with help 60 / struggled 30). Samples under 5 are shrunk (`score × n/5`). Behavioral blends Story Bank coverage with `behavioral` and `resume` ratings; Leadership is Story Bank coverage. `null` = blind spot.
- **Real rounds count** (`withRealRounds()`): each decided round (last 180 days) scores its tested areas (`ROUND_AREAS`: system_design → sysdesign; coding → uicoding, js; technical / phone_screen → js, react, backend; behavioral → behavioral; hiring_manager / onsite → behavioral, leadership) as passed 85 / failed 35, shrunk by `n/3`, combined as `(base + 2 × signal) / 3`.
- **Gates** (`GATES` in `war.ts`): JS 80 · TS 75 · React 80 · CSS 70 · A11y 70 · Perf 75 · Testing 70 · Browser 75 · System design 80 · AI-native 75 · UI coding 80 · Angular 80 · Backend & APIs 70 (weight 8) · AI-assisted coding 75 (weight 8) · DSA 70 · Behavioral 80 · Leadership 75, plus mock average (last 5 reviewed rounds) ≥ 8/10. `warReadiness()`: overall = weighted average (blind spots = 0) × `(0.5 + 0.5 × lowest/100)`; blockers = everything under its gate, biggest gap first.
- **Tiers** (`readinessTier()`): 🔥 TOP 1% READY (no blockers) → ✅ INTERVIEW-READY (overall ≥60, no blind spot in the areas the next booked round tests — every area if none is booked — and mock average ≥7) → ❌ NOT READY.
- **Topic weakness** (`topicWeakness()`): struggle rate ×40 + (1 − avg rating/10) ×25 + days idle (/14, capped) ×15 + interview importance ×20.
- **Revision queue** (`revisionQueue()`): a topic whose rated answers average under 7 comes back after 1 day (<5), 2 (<6) or 4 (<7); overdue/today 🔴, tomorrow 🟠, later 🟡.
- **Focus sessions** (`prep_focus_sessions`): Start on a block starts the timer and jumps straight to the block's work (its in-page `href`: Questions category, Mock format, Stories). No separate screen: the timer is a floating **FocusBar** (bottom centre, above the mobile nav): label (tap = go to the work) · `done/quota` for `bank:` blocks · countdown (bar turns red past the plan) · Pause (+1 interruption) / Finish (ticks the block — not shown on `bank:` blocks) / Stop (keeps the time, block stays open). **A `bank:` block is done only by practice** (`bankShortfall()`, `core.ts`): today's answered count in its category must reach the "× N" quota. `endFocus(finished)` on a short bank block refuses (the session keeps running; Telegram "done" replies "N/M — it ticks itself when you reach M"), Mission rows have no checkbox — a read-only status circle (✓ when done; tooltip "Completes at N/N answered" on open bank blocks). Blocks complete only from the work: bank quota met, Mock Round saved, or FocusBar Finish on a non-bank block (company prep, STAR stories). While focusing, the Mission button reads "Go to work". **Auto-stop:** `updateBlocks()` completes the active session the moment its block turns done from any path (quota met by Question Bank Next, Telegram drill or Mock Round, or a non-bank block finished from the FocusBar); the page mirrors it locally and the bar shows "✓ <block> done · m:ss focused" for 5 s. One active session, shared with Telegram. Focus time is not a scored measure. **Pace** (`dayPace()`, `war.ts`): the window is **08:00–22:00 IST** (14 h). Work done = Σ(block minutes × progress) ÷ planned minutes, where a `bank:` block's progress is questions practiced today in its category ÷ its "× N" quota (`practicedToday()`, `blockQuota()`) and other blocks are 0 or 1. Time used = share of the window gone. `deltaMinutes` = (done − time used) × 840; within ±10 min = On pace, else **Ahead / Behind Xh Ym** (`paceStatus()`, `paceLabel()`). `coachLine()` words it (behind → do the next block; ahead → keep going; after 22:00 → "Day over: N% done, M% undone"), never praising partial work. Mission block rows show `done/quota` on unfinished bank blocks.
- **Weekly forecast** (`forecast.ts`, `prep_forecast`, Sonnet, 6h cache): "if you interviewed tomorrow" — strengths, up to 4 likely failures, the riskiest question, 3 fixes; confidence = readiness. Stored in `prep_forecasts`; generated Sunday night by the evening coach or on demand.

### Mock Round

`mock.ts` + `MockTab.tsx`. Formats (`MOCK_FORMATS`): **Frontend screen** (6 questions, 38 min: JS, React/Next.js, one backend question, the weakest theory area, AI-native, behavioral), **Behavioral** (5 Q&A + 2 STAR prompts, 30 min), **System design** (1 question, 45 min), **Machine coding** (1 UI-coding question, 90 min), **Code review** (2 code-review PRs × 15 min; the diff shows above the answer). The format picker is `sm:grid-cols-2 xl:grid-cols-3`. Unseen first, nothing practiced today. One question at a time with a per-question countdown; Skip / Next; no hints until the end. **Finish** saves (`saveMockRound()`: answered questions → `question_progress`, a `mock_rounds` row, ticks blocks). **AI review of this round**: for most formats one `mock_round_review` call (Haiku) for all answers — per-answer 1–10 rating + note, verdict, outcome, summary, strengths, fixes. **Code review** rounds are graded per answer with the shared scorecard (`critiqueQuestion()`; `review.cards[]` holds each scorecard, shown as an `AnswerReview` card under the answer) and the verdict/outcome derive from the computed ratings (≥8 Strong / ≥6 Good; ≥7 Likely pass / ≥5 Borderline). Stored in `mock_rounds.review` (`review.score` = average rating, computed in code) and the ratings written to `question_progress`. **Mock Interview Calendar** lists every round by day with its review. An in-progress round survives reloads (localStorage `prep-mock-round-v1`).

### Story Bank

STAR stories (`stories`: title, competencies[], situation/task/action/result, metrics, strength 1–5) across 10 competencies (`COMPETENCIES`: ownership, mentoring, influence, technical decision, raising the bar, conflict, ambiguity, failure, delivery under pressure, cross-team collaboration). Coverage grid ✓ / ◐ / ○. **Rehearse** a "Tell me about a time…" prompt (`REHEARSAL_PROMPTS`, 5 per competency, 6 for ownership (feature owned end to end incl. API/data), technical decision (an AI tool's wrong or risky answer) and delivery (shipping outside your usual stack); 🎙 Speak marks it spoken) → `rehearseStory()` → `critiqueStory()` (`story_critique`, Haiku, uncached): the same JSON scorecard + `scoreCard()` rating as the Question Bank, `story` rubric — fixed key points (situation and stakes · your task/role · your specific actions, I not we · a measurable result · shows <competency> · reflection), criteria Own contribution 0–2 · Evidence 0–2 · Concise (~2 min) 0–1. Saved to `story_rehearsals` with `rating`, `scorecard` and the text form in `critique`; shown as the `AnswerReview` card. **Recent rehearsals** (last 10): rows of date · competency · prompt · rating chip; click to expand the full prompt, your answer and its review card; **Retry this prompt** loads the prompt + old answer back into the editor. Pre-scorecard rows show their saved text with no rating.

### Voice drill (Telegram)

`drill.ts`. Daily bot "drill" / "drill system design" / "drill behavioral" / "drill interview" / "drill ai" / "drill angular" / "drill theory" / "drill backend" (also "api", "server", "node", "database") / "drill resume" (also "cv", "experience") / "drill architecture" (also "architect", "lead", "bundling", "monorepo", "micro-frontend", "platform") asks one spoken-answer question (`telegram_drills` row). Default category = the spoken category (behavioral, ai-native, system-design, quiz, angular, backend, resume, architecture) with the biggest readiness gap. Question pick: rated under 7 first, then never practiced, then practiced longest ago; skipping anything drilled in the last 7 days. System-design titles are framed as "Design the frontend for X — requirements, architecture, state, performance, trade-offs".

The next Daily-bot message within 30 minutes (voice or text, not a bot command) is the answer (`answerPendingDrill()`, run by the handler's `preIntercept` hook before intent parsing). It is graded by the same scorecard and `scoreCard()` formula as the Question Bank plus `SPOKEN_NOTE`, and the reply is "Rating N/10 · ~Xs (words ÷ 140 wpm) · Y fillers" (`speechStats()`), the scorecard as text (`scorecardText()`: verdict — summary, the breakdown line, ✓/◐/✗ key points, numbered fixes, follow-up), "Reply DRILL for the next one". The rating goes to `question_progress` and ticks the bank block. **SKIP** closes the drill; a new drill supersedes an unanswered one.

## 3. Interviews (`/interviews`)

For an active job hunt: applying happens elsewhere, so outreach is counted in bulk, and a company is added once a phone screen is booked. Code in `src/features/career/` (`/career` and `/interview` redirect here, `next.config.ts`). Tabs: **Pipeline / Companies / Question Log / Profile**.

- **Segments** (`SEGMENTS` in `pipeline.ts`): big_tech · product_india · startup · ai_company · service · remote_global · other, on `outreach.segment` and `applications.segment` (default other). Set in the Log outreach form and the Add company modal; the Career bot fills it for well-known companies (big tech, Indian product, AI companies, service firms; remote/global when said; startup when said) and otherwise leaves other.
- **Pipeline** (`PipelineTab.tsx`, `pipeline.ts`) — **Funnel** (filterable by segment from a select in the card header; the target only shows for All segments): this week and the 4 before (Monday-start IST): outreach sent → replies (status replied/referred/screen) → screens (companies added that week) → onsites (those that reached a technical/coding/system design/behavioral/hiring manager/onsite round, or `interview`/`offer` status) → offers, each with conversion from the previous stage. **By segment** table under it (`segmentTable()`, the loaded 6 weeks of outreach): sent · reply % · screen % (companies added in the segment ÷ outreach sent), most-sent first; clicking a row filters the funnel. **Bottleneck** line (first that applies): this week under target → "send N more"; ≥20 sent over 5 weeks with <10% replies → switch to referrals/recruiter DMs; ≥3 screens with <30% reaching onsite → first-round skills; ≥2 onsites and no offer → late-stage depth. **Outreach** list (follow-ups due first, highlighted; status select; "Mark followed up" pushes the follow-up 5 days; delete) and a **Log outreach** form (company or "Various", person, channel referral/linkedin/recruiter/application/other, count for a batch, segment, notes). Non-application channels get `follow_up_on` = sent + 5 days.
- **Companies** (`applications`): company, role, stage (`screening` phone screen → `interview` → offer / rejected / withdrawn), segment, job link, JD, notes. **Rounds** (`interview_rounds`): kind (recruiter, phone screen, technical, coding, system design, behavioral, hiring manager, onsite, other), IST date-time, interviewer, status (scheduled/done/cancelled), outcome (pending/passed/failed), notes. Adding a round past the phone screen moves `screening` → `interview`.
- **Questions they asked** (`interview_questions`): question, category (technical, coding, system design, behavioral, AI-native, other), topic (`QUESTION_TOPICS`), round, your answer, how it went (well/ok/badly), notes.
  - **Bank sync** (`bank-sync.ts` `syncInterviewQuestionToBank()`): a question that went badly or ok becomes a `coding_questions` row (category `interview`, source "{company} interview", answer_hints = notes, topic defaulted by category; inserted with the service client since the pool is global), linked via `bank_question_id`, with `question_progress` seeded (badly 3, ok 6, later well 8) so the revision queue and the redo block pick it up. Rows show "in Prep →".
- **Prep for this company** — on-demand **JD analysis** (`analyzeJobDescription()`, `jd_analysis`, Sonnet, uncached → `applications.jd_analysis`: match %, focus, gaps, priority topics linking into the Question Bank), Mock / Story Bank links. **Interview guidance** (`getCompanyInsights()`, `company_insights`, Sonnet, 7-day cache).
- **Question Log** — every question across companies, category chips, "Went badly" filter, search.
- **Profile** (`career_profile`): current role/company/salary (masked)/target role/years/bio — feeds the JD analysis and Ask Brain.
- **Debrief loop** — the prep-coach crons call `sendDebriefPrompts()` first: each scheduled/done round that started 1–36h ago with no questions logged gets one Career-bot prompt (claimed via `debrief_sent_at`). The Career bot's `log_question` then attaches to that round (most recently debriefed within 48h), marks it done and runs the bank sync.

## 4. Finance (`/finance`)

Expenses and budgets scoped to the current calendar month. Tabs: **Expenses / Portfolio / History**.

- **Expenses** — amount, category (Food/Transport/Housing/Health/Shopping/Entertainment/Learning/Utilities/EMIs/Bills/Family/Travel/Other), description, date.
- **Budgets** — one per category per month; a month without a row inherits the category's latest prior amount on load. Remove sets 0 (stays carried forward as 0).
- **Month pace** (`projectMonthSpend()`, shared with the `budget_pace` risk): EMIs count once, everything else extrapolates at this month's daily rate. Drives By Category's stats (Spent, Budget, Left/Over, Month-end pace, ₹/day left) and the "On pace to save X% of salary" header chip.
- **Budget suggestions** (`suggestBudgets()`): per-category average of the last 3 complete months, rounded up to ₹500; review list with Apply all.
- **Over-budget banner** — worst overage first (top 3), ignoring overages under 2% (`FINANCE_THRESHOLDS.overBudgetBannerMinRatio`).
- **Finance profile** (`finance_profile`): `monthly_salary` (changes append to `salary_history`), `emergency_fund_months`, **`liquid_savings`**.
- **Runway** = `runwayMonths(liquid_savings, rolling 3-month average spend)` (`calculations.ts`; red <3, amber <6, green ≥6). Shown as the 4th stat tile (liquid savings inline-editable), in the Hunt Hero, the Money Advisor context and the Finance bot's net-worth reply.
- **Loans** — name, principal, emi, interest_rate, remaining_months (+ `remaining_months_as_of`; live months left = stored − calendar months since, `loanEffectiveRemainingMonths()`), all inline-editable. Total Debt = outstanding principal (`loanOutstanding()`: present value of remaining EMIs at the rate), with "₹X payable incl. interest" as a sub-line. Each row: owed · % repaid · payoff month + repaid bar. EMIs are informational — the actual payment is expected as a logged expense.
- **Investments** — name, type, invested, current value (inline-editable, manual), sorted by current value with ₹ and % return.
- **Financial goals** — name, target, current, target date (shows ₹/mo needed), priority.
- **Spending History** (History tab) — 12-month bar chart + the selected month's category pie (recharts, lazy; Pie needs `isAnimationActive={false}`).
- **Money Advisor** (header) — Q&A (`finance_advisor`, Sonnet, uncached) over salary, EMIs, 3-month average spend, free cash (`salary − avg spend`; EMIs already inside it), runway, portfolio, goals, emergency-fund target.

## 5. Health (`/health`)

Overall fitness: a gradual deficit toward a normal BMI, targets auto-computed (no manual goal).

- **Daily metrics** (`health_metrics`, one row per day): weight_kg, calories, protein_g, steps (inline-editable tiles with 7-day averages); `recovery_score` is Telegram-only.
- **Food log** (`food_log`, Health bot): "200g chicken breast" → calories/protein via `estimate_food_nutrition` (Sonnet, 7-day cache), added onto the day's `health_metrics` totals. **Today's Food** card lists today's items; ✕ deletes and subtracts (`removeFoodLogEntry()`).
- **Workouts** (`workouts`): ad-hoc log via Telegram, auto-fed by the Daily Workout Planner. **Workout stats** (`computeWorkoutStats()`): total and current day streak from this log.
- **Daily Workout Planner** (`workout-core.ts`, deterministic): `workout_library` (55 workouts, 11 categories, global) and `daily_workouts` (one active workout at a time, enforced by a partial unique index). Rotation: Chest & Triceps → Back & Biceps → Shoulders/Legs (alternating) → Active Recovery/Mobility (alternating); a skip still advances; a random variation not done in the last 7. Complete (also logs to `workouts`) / Skip / **Change** (swap category in place).
- **Workout Calendar** — heatmap judged per week: Done / Rest days, a "Wk x/N" column vs `workout_days_per_week`, streaks, weeks on plan.
- **Health profile** — age, gender, height_cm, activity_level, workout_days_per_week, food_preference.
- **Calculations** (`calculations.ts`): BMI; BMR (Mifflin-St Jeor: `10w + 6.25h − 5a + 5` male / `− 161` female); TDEE = BMR × (1.2 / 1.375 / 1.55 / 1.725 / 1.9); normal-BMI weight = `24.9 × (h/100)²`; calorie target = `max(1500, TDEE − deficit)` with a 0.4–1 kg/week deficit while BMI > 24.9; protein = `2g × normal-BMI weight` while cutting; fat 25% of calories, carbs the rest. **Health Score** = `nutrition×0.6 + activity×0.4` (nutrition: calorie accuracy + protein hit 50/50; activity: steps % + workout bonus), each with a reason naming the worse factor.
- **Weight Trend** — sparkline over 30 days: latest, change, least-squares pace (kg/week) vs plan, projected normal-BMI date.
- **Activity-level check** (`suggestActivityLevel()`): last 28 days' workout days/week and average steps vs the profile's level; a one-line notice with Update when they disagree.
- **Health Coach** (header) — module recommendations (`module_recommendations`, Sonnet, 6h cache). Free-form Q&A via the Health bot (`askHealthCoach()`, `health_advisor`).

## 6. Astrology (`/astrology`)

Vedic (sidereal) astrology. Charts are real astronomical calculation — Claude only narrates computed positions. Reached via the profile menu and the mobile More sheet. **Paused in Interview War Mode**: the daily push stops and Characteristics needs a Load click.

- **Ephemeris** (`ephemeris.ts`): `swisseph-wasm` (Swiss Ephemeris as WebAssembly — no native binding), Lahiri ayanamsa. `next.config.ts` bundles its wasm files for the route (`outputFileTracingIncludes`, `serverExternalPackages`).
- **Natal chart** (`chart-calculations.ts`, computed once at save into `astrology_profile.natal_chart`): rashi, nakshatra + pada, whole-sign houses from the Lagna, **Vimshottari Dasha** (Mahadasha + Antardasha), **Yogini Dasha** (`(nakshatra + 3) mod 8`), **Navamsa (D9)**. Rendered as a North Indian SVG kundli with a D1/D9 toggle.
- **Horoscope** — Today / This Month / This Year (`astrology_reading`, Sonnet; cached until the period ends). Today is structured: one-line summary, Favorable For, Avoid, Mood Forecast (+ Chandrashtama warning). Prompt context: dasha + **Gochara** (`gochara.ts`, transits by house from Lagna and Moon) + D9.
- **Characteristics** — a one-time narrative (`astrology_characteristics`, 1-year cache).
- **Remediation** — up to 3 templated remedies (`remedies.ts`, not AI) for Saturn/Rahu/Ketu/Mars/Moon placements.
- **Panchang** (`panchang.ts`, cached per date in `panchang_daily`): tithi/paksha, nakshatra, yoga, karana, sunrise/sunset, Rahu Kalam / Yamaganda / Gulika windows, Choghadiya. Used by the Telegram bot and the daily push (no web card).
- **EN/हिं toggle** (localStorage `astrology-lang`; `i18n/hi.ts`); the Telegram bot and push always reply in Hindi.

## 7. Settings (`/settings`)

- **Account** — email, **Export as JSON** (deterministic backup: Career (applications, profile, skills), Finance, Health, coding question history, reminders, Life Score history), Sign out.
- **AI Budget** — today / this month vs the ceilings (env-only), spend by module (`TASK_MODULE`) and top 5 by task (`TASK_LABEL`, `src/lib/ai-task-modules.ts`; usage rows from removed tasks fall under Shared).
- **System Health** — each cron's last run from `cron_runs` (healthy / stale / never-seen, `getCronJobHealth()`).
- **Reminders** — label, module, morning/evening slot, active. Delivered inside the 7:30am and 9:30pm coach messages.

## 8. Telegram bots

One bot per module (`TELEGRAM_BOT_TOKEN_*`): **Daily** (module key `planner`, `TELEGRAM_BOT_TOKEN_PLANNER`, webhook `/api/telegram/planner`), **Career**, **Finance**, **Health**, **Astrology** — one webhook route (`src/app/api/telegram/[module]/route.ts` → `src/features/telegram/handler.ts`).

**Pipeline:** only `TELEGRAM_ALLOWED_CHAT_ID` is accepted → voice is transcribed (`transcribeVoice()` → shared `transcribeAudio()`, Groq `whisper-large-v3-turbo`, `GROQ_API_KEY`) → photos go to Finance (receipt) / Health (meal) via `VISION_PROMPT` → a daily call cap (`TELEGRAM_DAILY_AI_CAP`, default 300, counted from `telegram_logs`) → the module's optional `preIntercept` (Daily: a pending drill answer) → intent parsing (`telegram_intent`, Haiku; today's IST date injected; may return an array of actions) → `execute()` per action → reply → `telegram_logs`. A budget-exhausted parse replies with a daily or monthly "budget used up" message instead of the help menu.

**Undo:** `undo_last` per bot; "↩️ Undo" buttons on created rows encode the row id (`undo:<table>:<id>`, allowlist `UNDOABLE_TABLES` in `src/lib/telegram/buttons.ts`: applications, interview rounds and questions, outreach, expenses, loans, investments, workouts, food_log). Logging an expense warns when its category is over / ≥90% of budget.

| Bot | Example phrases | Actions |
| --- | --- | --- |
| **Daily** | "start", "pause", "done", "stop", "what now", "drill", "drill system design", "drill resume", "drill architecture", "how was my week", "how was my month", "remind me to log weight every morning", "show my reminders" | Prep focus sessions, today's mission / behind-pace nudge, voice drill, weekly / monthly digest, reminder CRUD. Sends the Prep Coach crons. |
| **Career** | "Stripe booked a phone screen for Senior FE", "Stripe technical round Thursday 3pm", "Stripe asked me to design an autocomplete, went badly", "sent 10 applications today", "Priya at Razorpay referred me", "who do I follow up with", "what's coming up", "what did Stripe ask me" | add company, update stage, schedule round, log questions (bank sync + debrief attach), add / update outreach, list follow-ups due, upcoming rounds, questions asked, undo |
| **Finance** | "spent 500 on Swiggy food", "monthly summary", "set food budget 8000", "actually make that 400", "net worth", "can I afford a car?", *[receipt photo]* | expense add / list / amend / undo, summary, budget, salary, loan, investment, net worth + runway, advisor Q&A |
| **Health** | "weight 88kg", "8000 steps", "200g chicken breast", "did 45 min strength", "today's workout", "finished my workout", "skip today's workout", "why isn't my weight moving?", *[meal photo]* | log metric / food / ad-hoc workout, today's metrics, workout fetch / complete / skip, coach Q&A, undo |
| **Astrology** | "today's reading", "this month's reading", "current dasha", "today's panchang", "my characteristics" | readings (crisp Hindi bullets, `telegram-format.ts`), dasha, panchang, characteristics |

Unmapped messages fall back to each bot's help text.

## 9. Scheduled jobs (Vercel Cron)

Daily-only schedules (Vercel Hobby). Every job checks `Authorization: Bearer $CRON_SECRET` (an unset secret means silent 401s), resolves the single user, and calls `logCronRun()` so `cron-health-check` and Settings → System Health can spot a stale job (`EXPECTED_CRON_JOBS` in `src/lib/cron-log.ts`, kept equal to `vercel.json`).

| Job | UTC / IST | Bot | What it does |
| --- | --- | --- | --- |
| `prep-coach-morning` | `0 2 * * *` / 7:30am | Daily (+ Career for debriefs) | Debrief prompts, then the mission: level (e.g. "Steady (6h)"), readiness + tier, biggest risk, 🏢 company prep first, next interview, today's blocks, debriefs owed, revision due, "Start with…", "Reply DRILL for a spoken rep", + morning reminders. Off: reminders only, if any. No AI. |
| `prep-coach-midday` | `30 7 * * *` / 1pm | Daily | Only when ≥30 min behind pace (8am–10pm window): "N% done · M% of the day gone", next block. |
| `prep-coach-evening` | `0 16 * * *` / 9:30pm | Daily (+ Career) | Debrief prompts, then the day review (% of plan done and how far short, interruptions, mocks, readiness, tomorrow's shift, coach line) + "📌 Still open" (no expense today, open workout, metrics stale ≥3 days via `computeStaleMetrics()`) + evening reminders; Sundays add the weekly forecast. Off: still sends open items / reminders. |
| `weekly-digest` | `30 2 * * 0` / Sun 8am | Daily | 7-day module averages, best/worst day, a short AI review (`weekly_digest`, 6h cache), weekly spend by category. **No-op in Interview War Mode.** |
| `monthly-digest` | `40 2 * * *` / 8:10am | Daily | Same over 30 days, sends only on the 1st (IST). **No-op in Interview War Mode.** |
| `astrology-daily` | `0 4 * * *` / 9:30am | Astrology | Panchang + daily reading in Hindi. **No-op in Interview War Mode.** |
| `cron-health-check` | `0 4 * * *` / 9:30am | Daily | Alerts on any stale job; silent when healthy. |

## 10. AI Gateway

Every AI call goes through `askAI(task, prompt, system?, opts?)` / `askAIWithMeta()` in `src/lib/ai-gateway.ts` (`src/lib/anthropic.ts` is only imported by the gateway).

- **Tasks** (`TASK_CONFIG`; model, cache TTL):

| Task | Model | Cache | Used by |
| --- | --- | --- | --- |
| `telegram_intent` | Haiku | none | every bot |
| `telegram_vision` | Sonnet | none | receipt / meal photos |
| `answer_critique` | Haiku | none | Question Bank, voice drill, follow-up answers |
| `ai_native_critique` | Haiku | none | Question Bank, voice drill (AI-native), follow-up answers (AI-native) |
| `model_answer` | Sonnet | 1 year | Question Bank "Answer" button (one model answer per question) |
| `story_critique` | Haiku | none | Story Bank rehearsal |
| `mock_round_review` | Haiku | none | Mock Round |
| `prep_forecast` | Sonnet | 6h | weekly forecast |
| `jd_analysis` | Sonnet | none | Interviews |
| `company_insights` | Sonnet | 7d | Interviews |
| `finance_advisor` | Sonnet | none | Money Advisor, Finance bot |
| `health_advisor` | Sonnet | none | Health bot Q&A |
| `module_recommendations` | Sonnet | 6h | Health Coach |
| `estimate_food_nutrition` | Sonnet | 7d | Health bot |
| `brain_qa` | Sonnet | none | Ask Brain |
| `weekly_digest` / `monthly_digest` | Sonnet | 6h | digest crons + "how was my week/month" |
| `astrology_reading` | Sonnet | until the period ends (per call) | Astrology |
| `astrology_characteristics` | Sonnet | 1 year | Astrology |

- **Caching** — `ai_cache`, key `sha256(model::system::prompt)`; a changed prompt busts it; images never cached; a hit logs zero cost.
- **Budget** — `ai_usage_logs` logs every call. Ceilings `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD` (production: $0.1667/day, $5/month). **Interactive reserve**: `INTERACTIVE_TASKS` (telegram_intent, telegram_vision, answer_critique, ai_native_critique, story_critique, mock_round_review, model_answer) may use 100% of each ceiling; every other task stops at 70%. Any failure (budget, API, network) returns the task's fallback string — nothing throws. `askAIWithMeta()` also returns `budgetExhausted` + `budgetScope`.
- **Rule engine first** — scores, plans, quotas, readiness, revision, funnel, runway and every coach message are deterministic.

AI feature files: `src/features/ai/` (`career-mentor.ts` — JD analysis + company insights, `finance-advisor.ts`, `health-coach.ts`, `recommendations.ts`, `weekly-digest.ts`, `score-stats.ts`), `src/features/prep/critique.ts`, `prep/forecast.ts`, `prep/actions.ts` (mock review, story critique), `brain/advisor.ts`, `astrology/actions.ts`.

## Stack

- **Framework**: Next.js 15 App Router (TypeScript)
- **Auth + DB**: Supabase (PostgreSQL + Row Level Security)
- **Styling**: Tailwind CSS v3 with a custom `surface` / `accent` token system
- **Components**: hand-rolled (`src/components/`); the one primitive (`ui/tooltip.tsx`) wraps Base UI (`@base-ui/react`)
- **AI**: Anthropic `claude-sonnet-4-6` and `claude-haiku-4-5` via `@anthropic-ai/sdk`, through the AI Gateway
- **Voice**: Groq `whisper-large-v3-turbo`
- **Bots**: Telegram Bot API webhooks
- **Deploy**: Vercel (auto-deploy from `master`) + Vercel Cron

## Architecture

- **Thin page + feature view**: `src/app/[route]/page.tsx` (async server component, fetches) → `src/features/[module]/components/[Module]View.tsx` (`'use client'`, interactivity) → `src/features/[module]/actions.ts` (`'use server'`) + `types.ts`. Data logic shared with crons and bots lives in plain server modules (`prep/core.ts`, `prep/drill.ts`, `career/bank-sync.ts`, `career/pipeline-status.ts`, `dashboard/hunt-hero.ts`) — `'use server'` exports are publicly callable, so they only wrap auth + these.
- **Optimistic UI**: mutations use `useOptimistic` / local state + `useTransition`.
- **Supabase clients**: `lib/supabase/server.ts` (cookies, RLS), `client.ts` (browser), `service.ts` (service role — crons, bots, writes to global pools), `middleware.ts` (session refresh; `/login` redirect; `/api` excluded).
- **Loading / error**: per-route `loading.tsx` (`PageSkeleton` matching the page) and `error.tsx` (Try again).
- **Shared components** (`src/components/`): `MicButton` (voice mode), `TopNav`, `ProfileMenu`, `PageHeader` + `HeaderChip`, `Card`, `StatCard`, `PageTabs`, `Modal`, `ConfirmDialog`, `EmptyState`, `FilterPill`, `Skeleton`, `FormattedText`, `FieldError`, `ModuleRecommendations`, `ThemeProvider`, `AIAdvisorProvider`.
- **Header advisors**: a View calls `useAIAdvisor(label, icon, content)`; `AIAdvisorProvider` portals the content into the TopNav panel (Ask Brain on Dashboard, Money Advisor, Health Coach). Opens and tab switches are logged to `advisor_usage_log`.
- **Cross-module signals**: each module's `signals.ts` → `rankSignals()` (`src/lib/signals.ts`) → Needs Attention.
- **Navigation** (`TopNav.tsx`): desktop pills Dashboard · Prep · Interviews · Finance · Health; Astrology and Settings in the profile menu. Mobile (<`md`): bottom bar Home · Prep · Health · Finance + More (Interviews, Astrology, Settings). The version string links to `/changelog` (renders `CHANGELOG.md`). Redirects: `/coding` → `/prep?tab=questions`, `/career` and `/interview` → `/interviews`.

## Database

Standard: `user_id uuid references auth.users` + select/insert/update/delete RLS policies scoped to `auth.uid()`, except where noted. When a feature is removed, its schema is dropped in the same release (v4.0 dropped 16 tables and 5 columns — see `CHANGELOG.md`).

| Table | Key columns |
| --- | --- |
| `prep_settings` | user_id (PK), hours_per_day (load level: 4 / 6 / 8 / 12; default 8), weekly_outreach_target (default 25), target_date (unused), updated_at |
| `prep_sessions` | date (unique per user), focus, blocks jsonb `[{key, label, detail, minutes, href, done, links?}]` (keys: `company:<id>`, `bank:<category>` (incl. `bank:interview` redo), `mock`, `lead`, or main/concept outside Interview War Mode), completed_at |
| `prep_focus_sessions` | date, block_key, label, planned_minutes, started_at, paused_at, paused_seconds, interruptions, ended_at, actual_seconds, status (active/completed/abandoned) |
| `prep_forecasts` | date (unique per user), forecast jsonb {strengths[], failures[{area, why}], riskQuestion, fixFirst[], confidence} |
| `coding_questions` | title, difficulty, url (null for linkless rows), source, topics text[], category (algorithm / quiz / system-design / javascript-functions / ui-coding / ai-native / behavioral / angular / backend / code-review / interview — unconstrained text, typed in `hunt.ts`), sort_order, answer_hints, body (code shown above the answer: code-review diffs) — **global pool, no user_id** |
| `question_progress` | question_id (unique per user), attempts, last_answer, last_seen_at, last_rating (1–10), last_rated_at |
| `coding_daily_questions` | question_id, assigned_date, completed, completed_at, outcome, … — history from the retired Coding module, still read as practice/readiness signal |
| `mock_rounds` | format (screen / behavioral / system-design / machine-coding / code-review; the check constraint also still allows ai-assisted, unused), items jsonb (each may carry `body`), duration_seconds, review jsonb {verdict, outcome, summary, strengths[], fixes[], notes[], ratings[], score, cards[] for scorecard-graded formats}, created_at |
| `stories` | title, competencies text[], situation, task, action, result, metrics, strength (1–5), last_rehearsed_at |
| `story_rehearsals` | story_id (nullable), competency, prompt, answer, critique (text), rating (1–10, computed), scorecard (jsonb `Scorecard`) |
| `telegram_drills` | question_id → coding_questions, asked_at, answered_at, transcript, rating (1–10), critique |
| `applications` | company, role, status (screening / interview / offer / rejected / withdrawn; `applied` legacy), salary_range, location, url, notes, applied_at, job_description, jd_analysis jsonb, segment (big_tech / product_india / startup / ai_company / service / remote_global / other, default other) |
| `interview_rounds` | application_id (cascade), kind, scheduled_at, status, outcome, interviewer, notes, debrief_sent_at |
| `interview_questions` | application_id (cascade), round_id (set null), question, category, topic, my_answer, went (well/ok/badly), notes, bank_question_id → coding_questions (set null) |
| `outreach` | company, person, channel (referral/linkedin/recruiter/application/other), count (≥1), status (sent/replied/referred/screen/no_response/closed), sent_at, follow_up_on, notes, application_id (set null), segment (same values as applications, default other) |
| `career_profile` | current_role, current_company, current_salary, target_role, years_experience, bio (one row) |
| `skills` | name, category, level |
| `expenses` | amount, category, description, date |
| `budgets` | category, amount, month (unique per user+category+month) |
| `finance_profile` | monthly_salary, emergency_fund_months, liquid_savings (one row) |
| `salary_history` | amount, effective_date, note |
| `loans` | name, principal, emi, interest_rate, remaining_months, remaining_months_as_of |
| `investments` | name, type, invested_amount, current_value, notes |
| `financial_goals` | name, target_amount, current_amount, target_date, priority |
| `health_metrics` | date (unique per user), weight_kg, calories, protein_g, steps, recovery_score, notes |
| `health_profile` | age, gender, height_cm, activity_level, workout_days_per_week, food_preference (one row) |
| `workouts` | date, type, duration_minutes, notes |
| `food_log` | date, item, quantity, unit, calories, protein_g |
| `workout_library` | name, category, difficulty, duration, muscles, equipment, warmup, exercises jsonb, cardio jsonb, cooldown, coach_tips, tags — **global, 55 rows** |
| `daily_workouts` | workout_id, status (pending/in_progress/completed/skipped), assigned_date, completed_at — one active per user (partial unique index) |
| `astrology_profile` | birth date/time/place/lat/lng/timezone, natal_chart jsonb (D1, dashas, D9) (one row) |
| `panchang_daily` | date (PK), tithi, paksha, nakshatra, yoga, karana, sunrise, sunset, kalam windows, choghadiya jsonb — **global** |
| `reminders` | module, label, slot (morning/evening), active |
| `life_score_logs` | date (unique per user), life_score (blended), health_score, finance_score, career_score, projects_score (Practice) |
| `decision_queue_dismissals` | date, kind (unique per user+date+kind) |
| `telegram_logs` | module, telegram_chat_id, message, action_taken jsonb, response — **no user_id**, authenticated-role select |
| `ai_cache` | cache_key (unique), response, model, expires_at — RLS on, no policies (service role only) |
| `ai_usage_logs` | task, model, input_tokens, output_tokens, estimated_cost_usd, cache_hit |
| `advisor_usage_log` | advisor, tab |
| `cron_runs` | job, ok, detail — **no user_id**, service-role writes |

## Development

```bash
npm install      # dependencies
npm run dev      # http://localhost:3000
npm run build    # production build (type-check + lint)
npm run lint     # ESLint
```

### Environment variables

See `.env.example` (copy to `.env.local`): Supabase URL / anon key / service role key, `SUPABASE_USER_ID`, `ANTHROPIC_API_KEY`, `AI_DAILY_BUDGET_USD`, `AI_MONTHLY_BUDGET_USD`, `GROQ_API_KEY`, `CRON_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_BOT_TOKEN_{PLANNER,CAREER,FINANCE,HEALTH,ASTROLOGY}`, optional `TELEGRAM_DAILY_AI_CAP`. Webhooks are registered with `scripts/setup-webhooks.mjs`.

### Deploying your own instance

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vinaysomawat/personal-ai-os&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY,GROQ_API_KEY,CRON_SECRET&envDescription=See%20the%20README%27s%20%22Deploying%20your%20own%20instance%22%20section%20for%20where%20each%20value%20comes%20from&envLink=https://github.com/vinaysomawat/personal-ai-os%23deploying-your-own-instance)

1. Create a Supabase project; copy the URL, anon key and service role key (Project Settings → API).
2. Run every file in `supabase/migrations/` in filename order.
3. Get an Anthropic key (and optionally a Groq key for voice notes); generate `CRON_SECRET` (`openssl rand -hex 32`).
4. Deploy with those env vars.
5. **Create your account and close signups right away**: add a confirmed user in Supabase → Authentication → Users (or sign up at `/login` and immediately disable sign-ups in Authentication → Sign In / Providers). The app has no invite gate of its own.
6. Set `SUPABASE_USER_ID` to your user's UUID and redeploy.
7. *(Telegram)* Create one bot per module with @BotFather, set the tokens and `TELEGRAM_ALLOWED_CHAT_ID`, redeploy, then `node scripts/setup-webhooks.mjs https://your-app.vercel.app`.

### Security model

One user per deployment. Owner-scoped RLS on user tables; `telegram_logs`, `panchang_daily`, `cron_runs`, `workout_library` and `coding_questions` are readable by any authenticated user (global pools / system logs). Audit those before ever adding a second account.

---

## Design System

From `tailwind.config.js`, `globals.css` and `src/components/` — what actually renders.

- **Theme**: `[data-theme="dark"|"light"]` on `<html>`; defaults by time of day (light 6am–6pm) via a blocking init script, manual toggle in `TopNav` persisted to localStorage (`ThemeProvider.tsx`).
- **Tokens**: surfaces `surface` / `surface-1` (cards) / `surface-2` (inputs, insets) / `surface-3` (borders); `accent` (+ `accent-soft`); text `fg-primary` → `fg-secondary` → `fg-tertiary` (any informational text) → `fg-quaternary` (only decorative/hover affordances — below AA for text); semantic `good` / `warn` / `risk` with `-soft` / `-border` / `-strong` variants; `--chart-1..5`; spacing vars `--grid-gap`, `--grid-gap-sm`, `--card-pad-sm|md|lg`. Values come from the Claude Design source's `[data-theme]` blocks — never approximate with Tailwind palette colors.
- **Typography**: Inter; Tailwind's scale plus explicit small sizes (`text-[10.5px]`–`text-[13px]` for dense UI, 20–22px bold `tabular-nums` for stat values, 34px/700 page titles).
- **Layout shell** (`layout.tsx`): `ThemeProvider` > `TooltipProvider` > `AIAdvisorProvider` > `TopNav` + `<main className="max-w-[1180px] mx-auto …">` + `QuickAdd`; bottom padding on mobile clears the bottom bar and FAB.
- **Primitives**: `Card` (`bg-surface-1 border-surface-3 rounded-2xl`, optional title + action, sizes to content); `StatCard` (11px uppercase label, 20px value, one sub-line); `PageHeader` (title, chips, right action); `PageTabs` (underline tabs, scrollable); `Modal` / `ConfirmDialog`; `EmptyState`; skeletons (`animate-pulse`, no spinners); `InlineEdit` (Finance).
- **Charts**: recharts, always `next/dynamic({ ssr: false })` behind a placeholder; shared styling in `src/lib/chart-theme.ts`. Rings (Life Score, Health Score, `MiniRing`) are hand-drawn SVG.
- **Icons**: `lucide-react`; Astrology uses 🔮.
- **Numbers**: ₹ via `en-IN` grouping, no decimals; AI $ to 4 decimals under a cent; `tabular-nums` on live numbers.
- **Density rules**: compact over airy; `items-start` on grids so cards don't stretch; 5+ sub-areas → tabs; check every change at iPhone 16 Pro (393×852).

## UI Reference (screen-by-screen)

Top-to-bottom layout of every page.

### Dashboard (`/dashboard`)

1. `PageHeader` "Dashboard" — right: date · dasha link (or greeting; greeting only in Interview War Mode)
2. **Top Priority** banner (conditional, risk-tinted row link)
3. **Hunt Hero** — a full-width **Today's score** card (`ScoreCard` in `HuntHero.tsx`; stacks on mobile, `sm:flex-row`): left — the score at 40px in its tone, "/ 100", level · blocks done x/y, 7-day avg · best (14d); right — a 14-day bar chart (96px; 13 past days by whole blocks from `recentScores` + today with partial credit; bars toned 90+ good / 70+ accent / 40+ warn / else risk, value above each bar, today full-opacity and bold, no-plan days as a stub, dashed target line at 90; date labels "Tue 14" / "Today" on `sm+`, every other day as a bare number on mobile). Below it 4 tiles `grid-cols-2 sm:grid-cols-4` (Readiness, Next interview, Pace today, Runway). (The Life Score ring + Quick Stats layout is not shown while War Mode is always on.)
4. **Needs Attention** + **Daily Mission** `lg:grid-cols-2 items-start`
5. **Life Score Trend** (not in Interview War Mode)

App-wide: Quick Add FAB; Ask Brain in the header.

### Prep (`/prep`)

1. Header — "Prep" + 🔥 streak, 🎯 today's focus, 📅 Interview-ready by {date}
2. Stat tiles (4) — Interview readiness (% + tier · blockers), Mock rounds this week, Story Bank, Pace (Ahead/Behind · % done · % of day gone · full days of 7)
3. Tabs: Today / Questions / Mock Round / Story Bank
4. **Today** — War header (title + level switch Light/Steady/Intense/Max with hours · questions/day; pace-colored coach line, next-interview link, pace line: Ahead/Behind · % of plan done · % of 8am–10pm gone · blocks, readiness % + tier label) → `lg:grid-cols-[1fr_380px]`: left **Today's Mission** ("Do this now" + Start focus, progress, block rows with links) above **Revision Queue** + **Weakest Topics** (`sm:grid-cols-2`); right **Readiness Gates**, **Forecast**. Floating FocusBar (timer + progress + Pause / Finish / Stop) while focusing; no full-screen overlay.
5. **Questions** `lg:grid-cols-[1fr_340px]` — Sprint (category chips with today/quota, topic select, then `xl:grid-cols-[272px_1fr]`: scrollable question list | answer panel — question, answer, key points / link · 🎙 Speak + word count, structured AI review card (Answer follow-up → nested answer box + review), model answer panel, Answer / Hide answer · Review → Next; below `xl` list and panel alternate with "← All questions") + Coverage
6. **Mock Round** — format picker (4) + Mock Interview Calendar; running round (progress, countdown, answer, 🎙 Speak + word count, Skip/Next); round detail (review box, every answer with rating + note)
7. **Story Bank** — competency coverage → `lg:grid-cols-2`: Rehearse (prompt + shuffle, linked story, answer, 🎙 Speak + word count, Get feedback, review card; Recent rehearsals: expandable rows with rating chip → prompt, answer, review card, Retry this prompt) + Stories; story modal

### Interviews (`/interviews`)

1. Header — "Interviews" + 🎯 N active, 📅 Next
2. Stat tiles (4) — Active processes, Upcoming rounds (7d), Questions logged, Offers
3. Tabs: Pipeline / Companies / Question Log / Profile
4. **Pipeline** `lg:grid-cols-[1fr_360px] items-start` — left: **Funnel** table (segment select + "This week N/target" in the header, 5 weeks, conversion %) + **By segment** table (clickable rows) + Bottleneck line, **Outreach** list (follow-ups due highlighted, Mark followed up, status select, delete); right: **Log outreach** form
5. **Companies** `lg:grid-cols-[320px_1fr]` — companies list | company card (stage, link, notes, rounds + add-round row) → **Prep for this company** + **Interview guidance** (`xl:grid-cols-2`) → **Questions they asked** (form with your-answer box + 🎙 Speak and topic select; rows with went badge and "in Prep →", expanded rows with answer + 🎙 Speak)
6. **Question Log** — chips, Went badly toggle, search, expandable rows
7. **Profile** — inline-edit fields

### Finance (`/finance`)

1. Header — "💰 On pace to save X%" chip + 3-month average chip
2. Over-budget banner (conditional)
3. Stat tiles (4) — Monthly Salary (masked, inline edit, last raise), Portfolio, Total Debt, **Runway** (months, inline-edit liquid savings)
4. Tabs: **Expenses** (By Category with stats row + suggestions | Just Added, `lg:grid-cols-2`) · **Portfolio** (Loans | Investments | Financial Goals, `lg:grid-cols-3 items-start`) · **History** (Spending History bars + pie)
5. Money Advisor in the header; add modals for expense / loan / investment / goal

### Health (`/health`)

1. Header — Health Score chip (or yesterday's / nothing logged) + workout status chip
2. Profile setup banner (no profile yet)
3. Today's metrics — 4 editable tiles
4. **Daily Workout** + **Health Score** hero `lg:grid-cols-2` (activity-level notice at the bottom of the hero)
5. Targets row (4) — BMI, Calorie Target, Protein Target, Workouts / Week (4 wk)
6. **Weight Trend** + **Today's Food** `lg:grid-cols-2 items-start`
7. **Workout Calendar**
8. Health Coach in the header

### Astrology (`/astrology`)

1. Header + EN/हिं pill
2. **Birth Details** (inline grid, one save)
3. **Current Dasha** strip (Vimshottari + Yogini)
4. **Your Characteristics** (collapsed `<details>`; Load button in Interview War Mode)
5. **Natal Chart** (D1/D9 kundli) + **Horoscope** (Today / Month / Year) and **Remediation** `lg:grid-cols-[minmax(280px,380px)_1fr]`

### Settings (`/settings`)

1. **Account** — email · Export as JSON · Sign out
2. **AI Budget** + **System Health** `lg:grid-cols-2`
3. **Reminders** — list + New Reminder modal
