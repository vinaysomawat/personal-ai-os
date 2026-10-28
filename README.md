# Personal OS

[![CI](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml/badge.svg)](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/r194dme8y/c/19242327)

A personal, single-user AI Operating System: one Next.js app for interview prep, the job hunt, money, health and a Vedic astrology module — with Claude used only where judgment is needed (answer reviews, coaching, narratives), a per-module Telegram bot for hands-free logging (text, voice or photo), scheduled Telegram coaching, and a daily Life Score.

**Since v4.0 (2026-10-10) the app is built around an active job hunt.** Prep's Interview War Mode is always on: the Dashboard is a Hunt Hero, the Prep page's Timeline runs the day, and non-essentials (astrology push, weekly/monthly digests) are paused. The day is a template: Morning (from 11am), Library (2:30–9:30pm) and Late (10:30pm–12:30am) sessions with a recommended plan per weekday, editable for today or as the default.

This document describes exactly what the app does today — module by module, field by field, formula by formula — so it can be pasted into a fresh AI chat and give complete understanding with no other context. It is kept current with every functional change (`CLAUDE.md`'s post-task checklist). **History lives in `CHANGELOG.md` and git, not here.**

**Status:** a personal project for one person's life and workflow, open-sourced as a working example of an AI-assisted personal system (Next.js + Supabase + Claude + Telegram). Not multi-tenant. Fork it and borrow the patterns.

To run your own instance: clone, `npm install`, `cp .env.example .env.local` and fill it in (see [Environment variables](#environment-variables)), run every SQL file in `supabase/migrations/` in filename order, then `npm run dev`. MIT licensed — see `LICENSE`.

---

## 1. Dashboard (`/dashboard`)

Server-computed on every load (`src/features/dashboard/actions.ts` `getDashboardData()` + `getHuntHero()`, brain `getExecutiveData()`).

### Hunt Hero

`loadHuntHero()` (`dashboard/hunt-hero.ts`, deterministic). A full-width Today's score card, then four tiles (`HuntHero.tsx`), each linking to where you act on it. **Today's score** (full-width card): 0–100 = % of today's plan done (`dayPace().donePct`: block minutes weighted, partial credit on question blocks by time — `blockProgress()`); 90+ green · 70+ accent · 40+ amber · else red, and green on a good day (3 blocks done, `isGoodDay()`) whatever the %; "/ 100", level · blocks done x/y, 7-day avg · best of 14 days, and a 14-day bar chart: the 13 days before today (`recentScores` from `loadPrepData()`, whole blocks only; no plan = grey stub) and today, with a dashed target line at 90. Pace lives on Prep only.

| Tile | Value | Sub-line |
| --- | --- | --- |
| Readiness | Prep's gated readiness % (§2), colored by tier | tier label (🔥 TOP 1% READY / ✅ INTERVIEW-READY · N blockers to close / ❌ NOT READY · N blockers) |
| Mock average | average of the last 5 reviewed mock rounds /10 (`war.mockAvg`); green ≥7, amber ≥5, else red | "last 5 reviewed · ready at 7"; links to `/prep?tab=mock` |
| Revision due | revision-queue topics due today or overdue | amber when any; links to `/prep` |
| Runway | `liquid_savings ÷ avg monthly spend (last 90 days ÷ 3)` months | "at 90-day avg spend" or "set liquid savings" |

### Life Score (not shown while War Mode is always on — code kept)

Every module score blends today with the trailing week:
`moduleScore = dailyRaw × 0.6 + weeklyAvg × 0.4` (`LIFE_SCORE_THRESHOLDS` in `src/lib/thresholds.ts`), then
`lifeScore = round((health + finance + practice) / 3)`.

- **dailyRaw** is the only per-module value persisted to `life_score_logs` (never the blend, so the weekly average never averages an average). `life_score` itself is stored blended. **weeklyAvg** = mean of the trailing 7 days' raw score incl. today; a day with no row counts as 0 (accounts under 7 days old average only over days since signup).
- **Health** = Health's own `calculateHealthScore()` (§4, `nutrition×0.6 + activity×0.4` against real targets); without a health profile it falls back to `(workout today ? 60 : 0) + (metrics logged today / 4) × 40`.
- **Finance** = banded budget ratio, smoothed within bands: `≤0.70 → 100`, `≤0.85 → 90→75`, `≤1.00 → 75→55`, `≤1.20 → 55→30`, else `max(10, 30 − (ratio−1.20)×40)`; `60` with no budget and zero spend, `50` otherwise.
- **Practice** (`projects_score` column) = `round(volume×0.5 + consistency×0.5)` over Question Bank / Mock answers in the last 30 days (`question_progress.last_seen_at`): volume = `min(100, Σ category weight × 3.2)` (system-design 1.5, algorithm 1.0, backend 1.0, code-review 1.0, quiz / javascript-functions / ui-coding 0.6, anything else 1.0); consistency = `min(100, distinct practice days ÷ 20 × 100)`.
- The upsert of today's raw sub-scores + blended life score runs after the response (`next/server` `after()`, service client).
- **Explain My Score** — clicking the ring opens `ScoreExplainer.tsx`: per module "{today} today · {weeklyAvg} week avg → {blended}", the day-over-day delta of the blended figure, and a deterministic tip naming the biggest point gap, biggest movers first. No AI.
- **Life Score Trend** (`LifeScoreTrend.tsx`, recharts, lazy-loaded) — Weekly/Monthly toggle over 30 days of `life_score_logs`. Hidden in Interview War Mode.
- **Quick Stats** (`QuickStats.tsx`) — Prep Streak (+ today's blocks done/total), Workout Streak, Budget Remaining (3-tier color; "Over ₹X" in red when over; "—" without a budget), Workout Today. Replaced by the Hunt Hero in Interview War Mode.

### Always shown

- **Header line** — date + `{Mahadasha}/{Antardasha} dasha` link to Astrology when a chart exists, else a time-of-day greeting. The dasha segment is hidden in Interview War Mode.
- **Top Priority banner** — item 0 of the same ranked list Needs Attention renders (`buildPriorityItems()` in `dashboard/priority.ts`), whole row links to its module.
- **Needs Attention** (`NeedsAttention.tsx`) — up to 3 items: risks first, then Today's Focus signals. A signal is dropped when a risk already covers it (`SIGNALS_COVERED_BY_RISK`: `budget_pace` covers `finance.over_budget`/`near_budget`). Risks are dismissible for today (`decision_queue_dismissals`); signals are plain links.
  - **Signals** (each module's `signals.ts`, ranked by `rankSignals()` in `src/lib/signals.ts`): over budget (80), revision topics due in Prep (62, `prep.revision_due`), workout still open (60), ≥90% of budget used (55), no health metric today (50).
  - **Risks** (`computeRiskEngine()` in `brain/risk-opportunity-engine.ts`, thresholds in `src/lib/thresholds.ts`): `budget_pace` — month-end projection (`projectMonthSpend()`) over budget by ≥5% (impact tiers at 15% / 25%); `protein_decline` — last-3-day protein average ≥20% below the prior 3 days.
- **Daily Mission** (`daily-progress.ts`) — a checklist that resets at midnight: log today's health metrics, complete today's workout (when one is assigned), "Prep session: X/Y blocks done" (when a plan exists), log today's expenses. Score = done/total % (100 when nothing applies). Ring + full list, done items struck through.
- **Ask Brain** (header advisor, `BrainPanel.tsx` → `BrainChat.tsx`) — multi-turn Q&A over a reshape of the dashboard data (`brain/context-builder.ts`: scores, finance incl. goals, health, career memory incl. bio, practice in the last 30 days) via `askBrain()` (`brain_qa`, Sonnet, uncached). The prompt forbids inventing facts and markdown.
- **Quick Add** (app-wide floating "+", `QuickAdd.tsx`) — fast Expense or Metric (weight/steps/calories/protein) entry.
- **Realtime** — `RealtimeRefresh.tsx` refreshes on `workouts` / `health_metrics` changes (e.g. after a Telegram log).

## 2. Prep (`/prep`)

The center of the app: *what do I practice today, and am I interview-ready?* for Senior Frontend / AI Product Engineer roles. Code in `src/features/prep/`. `loadPrepData(db, userId)` (`core.ts`, a plain server module, not `'use server'`) is the one data path for the page, the crons and the Telegram bot. It runs all its reads in one parallel round (settings and the question bank included); the **global question pool** (`coding_questions`, ~1,200 rows, no user_id) is cached for an hour across requests (`unstable_cache`, tag `question-pool`; pages read two at a time when cold), so a re-seed shows up within the hour — your own progress (`question_progress`) is read fresh every time. Tabs (`PageTabs`): **Today / AI Engineer / Questions / Mock Round / Story Bank**, deep-linkable via `?tab=` (`today` / `ai` / `questions` / `mock` / `stories`), `&cat=<category>`, `&topic=`, `&format=screen|behavioral|system-design|machine-coding|code-review|ai-system-design`.

### Interview War Mode and the day plan

- **Always on.** There is no off switch; `isHuntMode()` (`hunt.ts`) returns true and stays the one shared check. There are no load levels and no rest day: the day template sets the day.
- **Day template** (`dayplan.ts` `DayTemplate`, stored in `prep_settings.day_template`, null = `DEFAULT_TEMPLATE`; `templateOf()` fills missing pieces): **sessions** — Morning (start → 1:00pm), Library (2:30pm → 9:30pm), Late (10:30pm → 12:30am); **gaps** between them — "🍽️ Lunch" (1:00–2:30pm), "🍽️ Dinner + walk" (9:30–10:30pm); and **minutes per day** per plan key (`minutes`, the same every day; a template saved with per-weekday minutes reads as each slot's highest value). There are no automatic breaks — you add breaks for a day in Edit today. The day starts at `prep_settings.day_start_min` (default 11:00am, after the gym); **only the first session moves** with it. **The Prep day rolls over at 04:00 IST, not midnight** (`prepToday()` / `toPrepDateStr()` / `prepDaysAgo()` / `prepDayStartUtc()` in `src/lib/date.ts`, `PREP_DAY_ROLLOVER_HOUR`): everything in Prep — the plan, block ticks, "answered today", focus time, streak, pace, mock-round days — and the Dashboard's Prep items use the prep date, so work at 12:30am still counts for the day it started. The rest of the app keeps the IST calendar day. `isHuntMode()` is the shared check — code identifiers (`hunt.ts`, `isHuntMode`, `HuntHero`) keep the older "hunt" name; every user-facing string says Interview War Mode.
- **Recommended plan** (`planItems()`), stored once per day in `prep_sessions.blocks` (focus "Today"): the template's keys in `ORDER` with their minutes, each built by `blockFor()`; the mock only on its scheduled days. Default minutes a day (≈ 590 + the mock): Algorithms 30 · JS functions 30 · Theory 30 (weakest topic named) · Frontend system design 60 · UI coding 45 · Code review 30 · **Learn 20 + Build 90** (the roadmap week, `learnBlock()` / `buildBlock()`, done by FocusBar Finish) · FE architecture & lead 30 · the scheduled mock · **AI engineering 45** (the week's theme, label "Theme: {topics}") · Backend & APIs 45 · **💼 Job applications 30** (`apply`, no questions — done by FocusBar Finish) · AI-native 30 · **Angular 30** · Behavioral Q&A 15 · From my resume 30. A backend-themed roadmap week folds AI engineering into Backend (label "Backend: {topics}"). It is built around the week of the 11-week AI Product Engineer roadmap (`roadmap.ts`: `ROADMAP`, week counted from `BUILD_START` = 2026-10-19, Mondays; `roadmapWeek()` is null before the start and after the last week, `ROADMAP.length`). Each week builds one feature into Personal OS itself, **UI-first with a thin backend** (the frontend side of AI features is the senior-frontend edge): 1 backend & jobs (raw SQL + EXPLAIN, a retrying background job with progress in the UI) · 2 streaming chat UI (Ask Brain token by token, stop/retry, cost per message) · 3 embeddings (pgvector, a ranked "similar questions" list) · 4 hybrid retrieval (full-text + vector with RRF, recall@5) · 5 RAG with citations (citation chips with hover preview, "not in your data") · 6 agent with tools (over loadPrepData / finance / health, a live tool-call timeline) · 7 human-in-the-loop (Approve / Edit / Reject cards for agent writes) · 8 evals (golden set vs `answer_critique`, in CI) · 9 MCP server (stretch: remote over Streamable HTTP with OAuth 2.1 + PKCE) · 10 production (tracing, latency / cost panel, fallback model) · 11 package it. Week themes for the drill (`THEMES`): 1 backend Data + Node / Next.js server · 2 LLM fundamentals + AI product UX · 3 Embeddings & chunking + Vector databases · 4 RAG & retrieval + Vector databases · 5 RAG & retrieval + Agentic RAG · 6 Agents & workflows · 7 Human-in-the-loop + AI product UX · 8 and 10 Evals & production · 9 MCP & A2A · 11 From my resume (all topics).
- **Mock schedule** (`mockFormatForDay()`, `mock.ts`): Sun frontend screen · Tue behavioral · on alternate weeks Thu AI system design + Sat frontend system design, or Thu frontend system design + Sat machine coding (the week bucket runs Thu–Wed, so a week's Thu and Sat pair up); Mon / Wed / Fri none.
- **On the clock** (`layoutDay(items, template, start, interview, breaks)`): the sessions minus fixed events (the interview with its warm-up and debrief, your breaks) give free stretches; each stretch takes the **first items in order that fit** (a shorter later item fills a gap a longer one can't, so the order moves only as much as needed); whatever is left in a stretch (≥10 min) is **Flex** ("finish any open block, or redo weak answers"); items that fit nowhere come back as `dropped` (shown as "Doesn't fit today"). `ORDER` is quick, sharp work first (morning), deep work at the library, lighter spoken work late — and the later a key, the sooner it gives way on a short day.
- **Interview today** (`prep_sessions.interview` `{start, minutes, label}`): a 30-min **warm-up** before and a 15-min **debrief** after (`WARMUP_MINUTES`, `DEBRIEF_MINUTES`) are cut out of the sessions; if the warm-up is before the day's start, the day starts then (gym skipped). Items that no longer fit drop from the end of `ORDER`.
- **Editing** (nothing saves until Save): **Edit today** (`EditToday` in `DayEditor.tsx` → `savePrepToday()`) — today's start (`prep_sessions.start_min`), the interview, **today's meals** (each template gap — lunch, dinner — with its own start, end and name for today; stored in `prep_sessions.breaks` as `{start, end, label, meal: <gap index>}` only when it differs from the default plan, `mealsOf()`; `layoutDay()` ends the session before it at its start and starts the next at its end), **your breaks** (`prep_sessions.breaks`: start and end time + an optional name, up to 10, each ≤ 4h; fixed on the timeline, blocks flow around them), and the items: reorder (↑ / ↓), change minutes (5–300; the mock keeps its format's), remove, add any plan key not already there or **your own slot** (`custom:<id>`, a name + minutes, done by FocusBar Finish); a live preview shows the laid-out day and what doesn't fit; Save sends **only what changed** (`diffToday()` → `TodayPatch`: start, interview, breaks, removed / added slots, changed minutes or names, and the full order only when something moved); the page applies it at once with the same `applyTodayPatch()` the server uses and closes the editor, then `savePrepToday(patch)` → `patchToday()` saves it behind in one read and one write of only the changed columns, re-checking progress only for question blocks that were added or resized (a failed save restores the day and reopens the editor with the error). Existing items keep their state. **Default plan** (`EditDefaultPlan` → `savePrepTemplate()`) — session names and times (the first's start = the default day start), gap labels, and **minutes per day** for each plan key (one value, the same every day; the mock an on/off for its Sun / Tue / Thu / Sat; the total in red when over the sessions' time); it applies from the next day's plan, while today's times re-lay with the new sessions and breaks.
- **Question blocks are time boxes**: a block's minutes (rounded to 5, at least one question's worth) are its target, and the question count in its detail ("about N") is only a guide = minutes ÷ the category's minutes per question (`BANK_CATEGORIES`: UI coding 45 · System design 60 · Theory 5 · Backend & APIs 8 · JS functions 25 · AI-native 10 · Algorithms 30 · Angular 6 · Behavioral Q&A 10 · Code review 15 · From my resume 8 · FE architecture & lead 8 · AI engineering 8), at least 1. Categories with no block that day have no planned minutes (still free to practise); the Questions tab's per-category planned minutes, done ✓ and guide count (which sizes redo slots) are read live from today's plan blocks, so they match the timeline and follow Edit today. Behavioral Q&A, Angular and other unplanned categories are practised through mocks, Telegram drills or by choice. **Redo weak answers** (`isRedoDue()` / `redoSlots()` in `hunt.ts`): a question whose latest rating is under 7 is due again 1 day (<5), 2 days (<6) or 4 days (<7) after that rating — the revision queue's gaps (`redoInterval()`), and not if already answered today. Up to 40% of a block's quota (`REDO_SHARE`, rounded — so a quota of 1 has none) is redo slots: the day's first answers in that category go to due weak answers, the rest to new questions; a redo replaces the old rating, and at 7+ the question stops coming back. `bankCoverage()` counts `redoDue` per category, and the plan block's detail says "the first N redo your weak answers"; the answer panel's header reads "Redo · was N/10 on MM-DD". **Block progress** (`blockProgress()`, `war.ts`) = the larger of the minutes focused on the block today (`focusedMinutes()` over `prep_focus_sessions`) and today's answers in its category × its minutes per question, capped at the block's minutes — so Telegram drills and Mock Round answers count without the timer. A question block auto-ticks when progress reaches its minutes (`blockReached()`; `syncBankBlocks()` after every answer, drill, mock save and focus stop; the page also finishes the running session on the minute tick once its time is reached); the mock block when a round is saved.
- **Prep streak** = consecutive days with a completed session (today given grace; `prepStreak()`, also on the Dashboard).

### Question Bank (Questions tab)

The global `coding_questions` pool (~1,100): theory `quiz`, `angular`, `ai-native`, `behavioral`, `javascript-functions`, `ui-coding`, `system-design`, `algorithm`, `backend`, `code-review`, `resume`, `architecture`, and `ai-engineering`. Older rows with category `interview` (synced from interviews logged earlier) stay in the table but are not a category: no tab, plan block or drill shows them (their past ratings still feed readiness by topic). Linked rows open the source (GreatFrontEnd); linkless rows show key points (`answer_hints`). **Theory** (`quiz`, 267 rows) is ordered by `sort_order` (`scripts/prep-2026/quiz.mjs`): 226 GreatFrontEnd quiz questions by how many people completed each on greatfrontend.com (most first; the least-completed 20% are not in the pool), then 41 linkless Prep additions (TypeScript, React 19, accessibility, security). **Algorithms** (`algorithm`, 83), **JS functions** (`javascript-functions`, 176) and **UI coding** (`ui-coding`, 73 = 53 GreatFrontEnd + 20 linkless Prep additions such as typeahead, infinite scroll and virtualized list) are ordered the same way as Theory: GreatFrontEnd problems by completions on greatfrontend.com, most first, with the least-completed 10% not in the pool; UI coding's Prep additions follow (`scripts/prep-2026/algorithm.mjs`, `javascript-functions.mjs`, `ui-coding.mjs`). Each set's file holds the ordered titles and the dropped ones; `dropAndOrderPatch()` in `order.mjs` deletes the dropped rows (and old Coding-module picks pointing at them), then `orderPatch()` writes `sort_order` and throws if the list and the category drift. **Backend & APIs** (`backend`, 45 linkless rows, source 'Prep additions', must-haves first by `sort_order`): API design (8), Node / Next.js server (8), Auth & security (7), Data (8), Caching & performance (6), AI backend (8) — each with 4–6 key points; reviewed with the `technical` rubric. **Code review** (`code-review`, 37 rows, data in `scripts/prep-2026/code-review.mjs`): an "AI-generated PR" diff of 30–120 lines in `coding_questions.body` (diffs in `scripts/prep-2026/code-review/*.diff`) — React / Next.js / TypeScript / Node (22: components, hooks, Express and Next API handlers, a CSS change, server actions, Next.js caching leaks, derived state, a typed API client, virtualization, optimistic updates, CSV streaming), Angular (8, tagged `Angular`: RxJS subscription leaks, OnPush mutation, signals and effects, an auth interceptor, `bypassSecurityTrustHtml`, reactive forms, guards and resolvers, a BehaviorSubject store) and FE lead & architecture (7, tagged `Architecture`: a design-system Button API break, Module Federation, monorepo boundaries, a Vite build config, a GitHub Actions preview workflow, a feature-flag rollout, a one-store Redux migration) with 5–6 planted issues across correctness, accessibility, security, performance and API/naming as `answer_hints`. The body renders above the answer box as a monospace block (`CodeBlock` in `AnswerReview.tsx`, +/- lines tinted, scrolls inside a 420px box, no highlighting dependency). Reviewed with the `code-review` rubric: points = planted issues found, Findings correct 0–2 · Severity & prioritization 0–2 · Fix quality 0–1, same `scoreCard()` formula; the model answer is a senior's review ranked by severity. **From my resume** (`resume`, 130 linkless rows, 45 must-haves first): what an interviewer probes on each claim of the current resume (`~/Downloads/Resumes`, data in `scripts/prep-2026/resume.mjs`) — Walkthrough & fit (6), SS&C (21), Shiprocket (20), Biofourmis (14), Novopay (12), Personal OS (14), Skills (22), Earlier resume versions (21, claims from older resumes, kept); key points describe what a strong answer covers (the decision, alternatives, trade-off, a real number), never facts about the work. `technical` rubric; the model answer uses [your number]-style placeholders where only you know the fact. Its plan block reads "Answer N resume deep-dive questions out loud from your real work"; its gap is Behavioral + Leadership (`CATEGORY_AREAS`), and its ratings feed the Behavioral readiness area. **FE architecture & lead** (`architecture`, 138 linkless rows, 56 must-haves first; data in `scripts/prep-2026/architecture.mjs`): what Senior / Lead / Staff / Frontend Architect loops ask beyond component design — Architecture strategy (17: rendering strategy, codebase structure for many teams, state architecture, BFF, multi-tenant, plugins, offline, real-time, TypeScript at scale, i18n, accessibility governance), Build & bundling (18: Webpack/Vite/Turbopack, tree shaking, code splitting, caching, budgets, source maps, library publishing, polyfills, CSS bundling, duplicate deps, preload/prefetch), Webpack (10: loaders vs plugins, the build pipeline, splitChunks and the runtime chunk, stable hashes, custom loaders/plugins, Babel vs SWC vs esbuild, Webpack 5 / Rspack / Vite migration, dev vs prod config, build profiling), Monorepo & tooling (8: Nx/Turborepo/pnpm, affected CI, boundaries, upgrades), Micro-frontends (16: when not to, composition options, Module Federation sharing and 2.0, single-spa, Next.js Multi-Zones, Angular Native Federation, shell governance, failure isolation, communication, migration), Performance architecture (10: Web Vitals, RUM, hydration, third parties, CDN, Next.js caching layers, edge middleware), Platform & delivery (13: CI/CD, feature flags, canary, observability, testing strategy, migrations, API mocking with MSW, error budgets, infra cost), CI/CD & GitHub Actions (14: workflow anatomy, pipeline speed and caching, reusable workflows vs composite actions, secrets and OIDC, pipeline security, preview deploys, branch protection and merge queue, build once deploy many, Changesets vs semantic-release, E2E in CI, environments and approvals, runners, Dockerizing Next.js, rollback), Security (7: incl. npm supply chain), Design system platform (8: incl. Web Components, Storybook and visual regression) and Tech lead (17: RFCs, ADRs, tech debt, standards, incidents, influence, scaling teams, levels). `technical` rubric. Its plan block reads "Answer N architecture & lead questions out loud — the options, the trade-off, your call"; its gap is System design + Leadership (`CATEGORY_AREAS`), and its ratings feed the System design readiness area (rows tagged Performance also feed Performance). **AI engineering** (`ai-engineering`, 91 linkless rows, 36 must-haves first; data in `scripts/prep-2026/ai-engineering.mjs`): what AI product / full-stack AI engineer loops ask — LLM fundamentals (8: tokens, sampling, structured output, context window, prompt design, prompt caching, model routing, hallucination), Embeddings & chunking (7), Vector databases (8: HNSW vs IVF, Pinecone Serverless vs Qdrant vs FAISS vs ChromaDB, filtering, multi-tenancy, pgvector, quantization, benchmarking), RAG & retrieval (10: end-to-end design, hybrid search, reranking, query transformation, citations, RAG vs fine-tuning, debugging, permissions), Agentic RAG (6), Agents & workflows (8: agent vs workflow, ReAct, tool design, LangGraph, multi-agent, MCP, memory, streaming to React), Human-in-the-loop (6: approval interrupts and resume, which actions to gate, approval UX, feedback, rubber-stamping), Frameworks (6: LangChain vs LlamaIndex, Hugging Face, transformers and attention, bi- vs cross-encoders, self-hosting, LoRA) MCP & A2A (14: what MCP solves, server and client primitives, lifecycle, stdio vs Streamable HTTP, remote-server OAuth (protected-resource metadata, PKCE, audience binding), no token passthrough, tool design, security risks, tool-context bloat, MCP vs function calling, A2A vs MCP, agent cards and tasks, an internal agent platform for 50 teams, testing), AI product UX (10: streaming render in React, showing tool steps, citations, action approvals, generative UI, errors and uncertainty, resumable chat state, feedback capture, rendering-LLM-output security, accessible chat) and Evals & production (8: RAG metrics, LLM-as-judge, prompt injection, guardrails, latency, observability, cost, safe rollout). `technical` rubric. Its plan block reads "Answer N AI-engineering questions out loud … — the pipeline, the trade-off, how you'd evaluate it"; its ratings feed the AI engineering readiness area. New rows for v4.1 are seeded by `scripts/seed-prep-2026.mjs` (service client, re-runnable: matched on category + title, inserted or refreshed; data in `scripts/prep-2026/*.mjs`).

- **Question list** per category (+ optional topic filter), every question visible: due redos first (weak answers, lowest rating first, up to today's unused redo slots — see Redo weak answers), then unseen (`sort_order`, else medium → easy → hard), then practiced — remaining due redos first, then longest ago. Each row: Redo (amber dot) / New (accent dot) / Review (grey dot) / ✓ answered today, title, difficulty initial or last-seen date, last rating chip. Pick any row to answer it; the top row is preselected. At `xl` the list (272px) and the answer panel sit side by side; below `xl` the list shows first and a picked question replaces it, with "← All questions" back.
- Each question: a typed answer — prefilled with your last answer only if you answered it today (a repeat on a later day starts blank), word count. **AI review is mandatory before Next** for any answer of ≥40 chars: the primary button reads **Review** until the review lands, then **Next →**. Shorter answers (e.g. a note on a problem solved on the linked site) go straight to Next. An empty box shows **Skip →** instead (secondary style, hint "Nothing typed — Skip won't count it"): it moves to the next question without saving — no `last_seen_at`, no quota credit, the question stays unanswered. Editing after a review dims it with a **Re-review edited answer** link; Next stays available. A failed or budget-fallback review still unlocks Next. Review = `critiqueAnswer(id, answer, spoken)` → `critiqueQuestion()` in `critique.ts`: `ai_native_critique` for AI-native, otherwise `answer_critique`; Haiku, uncached; rubric by category (`rubricFor()`): `technical` for theory/Angular/UI coding/system design/algorithms/backend, `behavioral`, `ai-native`, `code-review` (the diff is included in the prompt). An answer dictated with Speak gets `SPOKEN_NOTE` (ignore transcription errors, judge as spoken). **The AI only judges; code scores.** It returns a JSON scorecard (`Scorecard`, `scorecard.ts`): `points` (the question's `answer_hints` split into key points, or 4–6 it derives when none) each `covered` / `partial` / `missing` with a note; `correctness` 0–2, `depth` 0–2, `clarity` 0–1 (labels per rubric — behavioral: No red flags / Evidence / Direct & concise; AI-native: Judgment / Real example / Clarity); `summary`, 2–3 `fixes`, `followUp`. **Rating** (`scoreCard()`): coverage = (covered + ½·partial) ÷ points, substance = min(1, 2·coverage); rating = round(1 + 9·(0.55·coverage + substance·(0.25·correctness/2 + 0.08·clarity) + 0.12·depth/2)), capped at 4 on correctness 0 and at 5 when coverage < ⅓, clamped 1–10. Verdict from the rating: ≥8 Strong, ≥6 Good, else Needs work. The `AnswerReview` card: rating chip + verdict + summary, a breakdown line (Key points c/n · the three criteria), the key-point checklist (✓ / ◐ / ✗ + note, two columns on `sm+`), numbered Fix next, Follow-up callout, `code` as monospace chips. A reply that isn't a valid scorecard (budget fallback, malformed JSON) shows as plain text with no rating. **Answer** (not on algorithm / JS functions / UI coding, which keep "Open the problem"): `revealModelAnswer()` → `modelAnswer()` (`model_answer`, Sonnet, cached 1 year — the prompt is fixed per question, so only the first reveal costs): a 150–220-word spoken-style model answer covering the key points (theory: what → how under the hood → example → trade-off; system design: compact outline; behavioral / AI-native: an example labelled "adapt it to your own experience"), current as of React 19 / Next.js 15 / Angular 19, fenced code rendered as code blocks. Revealing it **before** any review marks the attempt *studied*: the Review gate lifts, the panel says "won't be rated", and Next saves no rating (`last_seen_at` still updates). Revealing after a review changes nothing. **Answer follow-up →** under the review card's follow-up (Question Bank and Story Bank): your own answer + 🎙 Speak → `critiqueFollowUpAnswer()` → `critiqueFollowUp()`, the same scorecard with derived key points (story follow-ups use the behavioral rubric), shown as a nested review card; practice only — nothing stored, the original rating untouched. **Next →** (`answerQuestion()` → `question_progress`: answer, attempts, `last_seen_at`, and the rating as `last_rating` / `last_rated_at`) moves to the question below in the list.
- **Time left** (`minutesPerQ` from `BANK_CATEGORIES`): unseen questions × the category's minutes per question, shown in whole hours rounded up (`Math.ceil`). The Sprint header reads `N answered today · {planned} planned · N questions · ≈ Xh to complete`, and the Coverage card shows `≈ Xh` on each category row and the all-category total in its header.
- Coverage card: per-category seen/total · % · ≈ hours to complete, and today's planned minutes (green with ✓ once the block is done); header = overall % (bold, accent color) · seen/total · ≈ total hours, with an overall accent progress bar above the green per-category bars.

### Voice mode (web)

A **Speak** mic button (`src/components/MicButton.tsx`, `useDictation()`) sits beside the word count on every answer box: Question Bank, Mock Round and Story Bank rehearsal. Tap to record (`MediaRecorder`: webm/opus, mp4 on iPhone Safari; max 5 min), tap Stop; the audio is POSTed to **`/api/transcribe`** (route handler — server actions cap bodies at 1 MB; checks the Supabase session itself since `/api` is outside the auth middleware; ≤4 MB) → `transcribeAudio()` (`src/lib/transcribe.ts`, Groq `whisper-large-v3-turbo`, `language: en`, a frontend-vocabulary prompt so terms like useMemo come back spelled right). The text is appended to the box (typing and speaking mix); a line shows "m:ss spoken · N fillers" (`speechStats()` in `src/lib/speech-stats.ts`, shared with the voice drill). Nothing is stored but the text; transcription makes no Claude call. A recording in progress is dropped if its question changes (button keyed per question).

### Readiness, War Mode and revision

- **Readiness matrix** (`readiness.ts`, 17 areas in `READINESS_AREAS`): JS, TS, React/Next.js, CSS, Accessibility (its topic counts rated answers), Performance, Testing (also fed by `code-review` ratings), Browser/network/security, System design (also fed by `architecture` ratings), AI-native, UI coding, Backend & APIs (the `backend` category + the Networking & APIs topic), AI-assisted coding (`code-review` ratings — reviewing AI-generated PRs), AI engineering (`ai-engineering` ratings — RAG, vector DBs, agents, HITL, evals), Algorithms, Behavioral, Leadership. Each averages real signal: AI answer ratings ×10 on the area's topics/category (≥2), coding outcomes from older practice history (solved 100 / with help 60 / struggled 30). Samples under 5 are shrunk (`score × n/5`). Behavioral blends Story Bank coverage with `behavioral` and `resume` ratings; Leadership blends Story Bank coverage with ratings on Tech-lead `architecture` questions. Angular is not an area (the role target is framework-agnostic; the `angular` category stays in the Question Bank for practice). `null` = blind spot.
- **Gates** (`GATES` in `war.ts`, weights follow the day split — frontend areas weigh most: React and UI coding 12, System design 15): JS 80 · TS 75 · React 80 · CSS 70 · A11y 70 · Perf 75 · Testing 70 · Browser 75 · System design 80 · AI-native 75 · UI coding 80 · Backend & APIs 60 (weight 5) · AI-assisted coding 75 (weight 8) · AI engineering 70 (weight 10) · DSA 70 · Behavioral 80 · Leadership 75, plus mock average (last 5 reviewed rounds) ≥ 8/10. `warReadiness()`: overall = weighted average (blind spots = 0) × `(0.5 + 0.5 × lowest/100)`; blockers = everything under its gate, biggest gap first.
- **Tiers** (`readinessTier()`): 🔥 TOP 1% READY (no blockers) → ✅ INTERVIEW-READY (overall ≥60, no blind spot, and mock average ≥7) → ❌ NOT READY.
- **Topic weakness** (`topicWeakness()`): struggle rate ×40 + (1 − avg rating/10) ×25 + days idle (/14, capped) ×15 + interview importance ×20.
- **Revision queue** (`revisionQueue()`): a topic whose rated answers average under 7 comes back after 1 day (<5), 2 (<6) or 4 (<7); overdue/today 🔴, tomorrow 🟠, later 🟡.
- **Focus sessions** (`prep_focus_sessions`): Start on a block starts the timer and jumps straight to the block's work (its in-page `href`: Questions category, Mock format, Stories). No separate screen: the timer is a floating **FocusBar** (bottom centre, above the mobile nav): label (tap = go to the work) · on `bank:` blocks "{progress}/{minutes}m · N answered" · countdown (bar turns red past the plan) · Pause (+1 interruption) / Finish (ticks the block; on a `bank:` block disabled until progress reaches 80% of its minutes, `FINISH_SHARE` / `canFinishBlock()`) / Stop (keeps the time; a `bank:` block whose time is then reached ticks). `endFocus(finished)` under 80% refuses (`bankShortfall()`, `core.ts` — the session keeps running; Telegram "done" replies "{progress}/{minutes} min — it ticks itself at {minutes}, and DONE works from {80%}"). Mission rows have no checkbox — a read-only status circle (✓ when done; tooltip "Completes at {minutes} of practice" on open bank blocks). Blocks complete only from the work: a question block's minutes reached (or Finish from 80%), Mock Round saved, or FocusBar Finish (Learn, Build). While focusing, the Mission button reads "Go to work". **Auto-stop:** `updateBlocks()` completes the active session the moment its block turns done from any path (minutes reached by answers, a Telegram drill, a Mock Round or focus time, or a block finished from the FocusBar); the page mirrors it locally and the bar shows "✓ <block> done · m:ss focused" for 5 s. One active session, shared with Telegram. Focus time is not a scored measure. **Pace** (`dayPace()`, `war.ts`): the window is today's timeline, first slot to last (`windowOf(rows)`, read in prep hours: after midnight they keep counting past 24, so 1am = 25, via `prepHourNow()`). Work done = Σ(block minutes × progress) ÷ planned minutes, where a `bank:` block's progress is `blockProgress()` ÷ its minutes (focus time or `practicedToday()` answers × minutes per question) and other blocks are 0 or 1. Time used = share of the window gone. `deltaMinutes` = (done − time used) × the window's minutes; within ±10 min = On pace, else **Ahead / Behind Xh Ym** (`paceStatus()`, `paceLabel()`). `coachLine(pace, nextBlock, good)` names what got done first, then the single next step — "3/12 blocks done. Next: <block>." (none done yet: "Start with <block>."; after 19:00: "N/M blocks done."; all done: "All N blocks done — a good day ✓"); factual, no guilt wording, shown in a neutral tone (green on a good day). **Good day** (`isGoodDay()`, `war.ts`) = 3 blocks done (`GOOD_DAY_BLOCKS`), whatever the % — a ✓ in the evening review, the War header line and the Hunt Hero score. Mission block rows show "{progress}/{minutes} · N answered" on unfinished bank blocks. **Speed:** the web timer is optimistic — Start shows the bar at once with a local session (Pause / Finish / Stop wait only while that first save is in flight), Pause / Finish / Stop update the page immediately, and the server call runs behind it; none of the timer actions revalidate the page (`startFocusSession(block)` → `startFocusOn()`: the running session or one insert; `endFocusSession()` → `endFocus(…, verified)` skips re-reading progress the page already checked with `canFinishBlock()`, and `updateBlocks(…, closeActive=false)` skips re-closing it). Telegram start / done use the full checks.
- **Timeline** (`timeline.ts`, `TimelineCard.tsx`, deterministic, client-safe): today's laid-out day (`layoutDay()`, computed on the page from the stored items, start and interview) re-flowed every minute by `liveTimeline()`: rows that ended stay put; blocks not done in their slot move to now (marked "moved"); **fixed-time rows** — meals, your breaks, the interview with its warm-up and debrief — keep their place and blocks / breaks / Flex flow around them (`fitAt()`); a block or Flex in progress gives way to any missed blocks, so "now" is the earliest undone work; Flex shrinks first; anything past the planned end shows as "N min over" (`overHint()`). Times are prep minutes; `clock()` formats them ("12:30am").

### Mock Round

`mock.ts` + `MockTab.tsx`. Formats (`MOCK_FORMATS`): **Frontend screen** (6 questions, 38 min: JS, React/Next.js, one backend question, the weakest theory area, AI-native, behavioral), **Behavioral** (5 Q&A + 2 STAR prompts, 30 min), **System design** (1 question, 45 min), **Machine coding** (1 UI-coding question, 90 min), **Code review** (2 code-review PRs × 15 min; the diff shows above the answer), **AI system design** (4 questions, 55 min: one `system-design` question on the AI topic, 35 min, then one each from AI engineering's MCP & A2A, AI product UX and Evals & production topics; reviewed by the whole-round review). The format picker is `sm:grid-cols-2 xl:grid-cols-3`. Unseen first, nothing practiced today. One question at a time with a per-question countdown; Skip / Next; no hints until the end. **Finish** saves (`saveMockRound()`: answered questions → `question_progress`, a `mock_rounds` row, ticks blocks). **AI review of this round**: for most formats one `mock_round_review` call (Haiku) for all answers — per-answer 1–10 rating + note, verdict, outcome, summary, strengths, fixes. **Code review** rounds are graded per answer with the shared scorecard (`critiqueQuestion()`; `review.cards[]` holds each scorecard, shown as an `AnswerReview` card under the answer) and the verdict/outcome derive from the computed ratings (≥8 Strong / ≥6 Good; ≥7 Likely pass / ≥5 Borderline). Stored in `mock_rounds.review` (`review.score` = average rating, computed in code) and the ratings written to `question_progress`. **Mock Interview Calendar** lists every round by day with its review. An in-progress round survives reloads (localStorage `prep-mock-round-v1`).

### Story Bank

STAR stories (`stories`: title, competencies[], situation/task/action/result, metrics, strength 1–5) across 10 competencies (`COMPETENCIES`: ownership, mentoring, influence, technical decision, raising the bar, conflict, ambiguity, failure, delivery under pressure, cross-team collaboration). Coverage grid ✓ / ◐ / ○. **Rehearse** a "Tell me about a time…" prompt (`REHEARSAL_PROMPTS`, 5 per competency, 6 for ownership (feature owned end to end incl. API/data), technical decision (an AI tool's wrong or risky answer) and delivery (shipping outside your usual stack); 🎙 Speak marks it spoken) → `rehearseStory()` → `critiqueStory()` (`story_critique`, Haiku, uncached): the same JSON scorecard + `scoreCard()` rating as the Question Bank, `story` rubric — fixed key points (situation and stakes · your task/role · your specific actions, I not we · a measurable result · shows <competency> · reflection), criteria Own contribution 0–2 · Evidence 0–2 · Concise (~2 min) 0–1. Saved to `story_rehearsals` with `rating`, `scorecard` and the text form in `critique`; shown as the `AnswerReview` card. **Recent rehearsals** (last 10): rows of date · competency · prompt · rating chip; click to expand the full prompt, your answer and its review card; **Retry this prompt** loads the prompt + old answer back into the editor. Pre-scorecard rows show their saved text with no rating.

### Voice drill (Telegram)

`drill.ts`. Daily bot "drill" / "drill system design" / "drill behavioral" / "drill ai" / "drill angular" / "drill theory" / "drill backend" (also "api", "server", "node", "database") / "drill resume" (also "cv", "experience") / "drill architecture" (also "architect", "lead", "bundling", "monorepo", "micro-frontend", "platform") / "drill rag" (also "agent", "llm", "vector", "embedding", "hitl", "langchain", "llamaindex", "ai engineering") asks one spoken-answer question (`telegram_drills` row). Default category = the spoken category (behavioral, ai-native, system-design, quiz, angular, backend, resume, architecture, ai-engineering) with the biggest readiness gap. Question pick: rated under 7 first, then never practiced, then practiced longest ago; skipping anything drilled in the last 7 days. System-design titles are framed as "Design the frontend for X — requirements, architecture, state, performance, trade-offs".

The next Daily-bot message within 30 minutes (voice or text, not a bot command) is the answer (`answerPendingDrill()`, run by the handler's `preIntercept` hook before intent parsing). It is graded by the same scorecard and `scoreCard()` formula as the Question Bank plus `SPOKEN_NOTE`, and the reply is "Rating N/10 · ~Xs (words ÷ 140 wpm) · Y fillers" (`speechStats()`), the scorecard as text (`scorecardText()`: verdict — summary, the breakdown line, ✓/◐/✗ key points, numbered fixes, follow-up), "Reply DRILL for the next one". The rating goes to `question_progress` and ticks the bank block. **SKIP** closes the drill; a new drill supersedes an unanswered one.

## 3. Finance (`/finance`)

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

## 4. Health (`/health`)

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

## 5. Astrology (`/astrology`)

Vedic (sidereal) astrology. Charts are real astronomical calculation — Claude only narrates computed positions. Reached via the profile menu and the mobile More sheet. **Paused in Interview War Mode**: the daily push stops and Characteristics needs a Load click.

- **Ephemeris** (`ephemeris.ts`): `swisseph-wasm` (Swiss Ephemeris as WebAssembly — no native binding), Lahiri ayanamsa. `next.config.ts` bundles its wasm files for the route (`outputFileTracingIncludes`, `serverExternalPackages`).
- **Natal chart** (`chart-calculations.ts`, computed once at save into `astrology_profile.natal_chart`): rashi, nakshatra + pada, whole-sign houses from the Lagna, **Vimshottari Dasha** (Mahadasha + Antardasha), **Yogini Dasha** (`(nakshatra + 3) mod 8`), **Navamsa (D9)**. Rendered as a North Indian SVG kundli with a D1/D9 toggle.
- **Horoscope** — Today / This Month / This Year (`astrology_reading`, Sonnet; cached until the period ends). Today is structured: one-line summary, Favorable For, Avoid, Mood Forecast (+ Chandrashtama warning). Prompt context: dasha + **Gochara** (`gochara.ts`, transits by house from Lagna and Moon) + D9.
- **Characteristics** — a one-time narrative (`astrology_characteristics`, 1-year cache).
- **Remediation** — up to 3 templated remedies (`remedies.ts`, not AI) for Saturn/Rahu/Ketu/Mars/Moon placements.
- **Panchang** (`panchang.ts`, cached per date in `panchang_daily`): tithi/paksha, nakshatra, yoga, karana, sunrise/sunset, Rahu Kalam / Yamaganda / Gulika windows, Choghadiya. Used by the Telegram bot and the daily push (no web card).
- **EN/हिं toggle** (localStorage `astrology-lang`; `i18n/hi.ts`); the Telegram bot and push always reply in Hindi.

## 6. Settings (`/settings`)

- **Account** — email, **Export as JSON** (deterministic backup: Career (stored applications, profile, skills), Finance, Health, coding question history, reminders, Life Score history), Sign out.
- **AI Budget** — today / this month vs the ceilings (env-only), spend by module (`TASK_MODULE`) and top 5 by task (`TASK_LABEL`, `src/lib/ai-task-modules.ts`; usage rows from removed tasks fall under Shared).
- **System Health** — each cron's last run from `cron_runs` (healthy / stale / never-seen, `getCronJobHealth()`).
- **Reminders** — label, module, morning/evening slot, active. Delivered by the reminder crons at 9:00am (morning slot) and 9:30pm (evening slot).

## 7. Telegram bots

One bot per module (`TELEGRAM_BOT_TOKEN_*`): **Daily** (module key `planner`, `TELEGRAM_BOT_TOKEN_PLANNER`, webhook `/api/telegram/planner`), **Finance**, **Health**, **Astrology** — one webhook route (`src/app/api/telegram/[module]/route.ts` → `src/features/telegram/handler.ts`).

**Pipeline:** only `TELEGRAM_ALLOWED_CHAT_ID` is accepted → voice is transcribed (`transcribeVoice()` → shared `transcribeAudio()`, Groq `whisper-large-v3-turbo`, `GROQ_API_KEY`) → photos go to Finance (receipt) / Health (meal) via `VISION_PROMPT` → a daily call cap (`TELEGRAM_DAILY_AI_CAP`, default 300, counted from `telegram_logs`) → the module's optional `preIntercept` (Daily: a pending drill answer) → intent parsing (`telegram_intent`, Haiku; today's IST date injected; may return an array of actions) → `execute()` per action → reply → `telegram_logs`. A budget-exhausted parse replies with a daily or monthly "budget used up" message instead of the help menu.

**Undo:** `undo_last` per bot; "↩️ Undo" buttons on created rows encode the row id (`undo:<table>:<id>`, allowlist `UNDOABLE_TABLES` in `src/lib/telegram/buttons.ts`: expenses, loans, investments, workouts, food_log). Logging an expense warns when its category is over / ≥90% of budget.

| Bot | Example phrases | Actions |
| --- | --- | --- |
| **Daily** | "start", "pause", "done", "stop", "what now", "drill", "drill system design", "drill resume", "drill architecture", "drill rag", "how was my week", "how was my month", "remind me to log weight every morning", "show my reminders" | Prep focus sessions, "what now" → the timeline's Now / Next rows (`nowLine()`) above today's plan with start times (`morningMessage()`), voice drill, weekly / monthly digest, reminder CRUD. Sends the reminder crons; there are no scheduled Prep coach messages. |
| **Finance** | "spent 500 on Swiggy food", "monthly summary", "set food budget 8000", "actually make that 400", "net worth", "can I afford a car?", *[receipt photo]* | expense add / list / amend / undo, summary, budget, salary, loan, investment, net worth + runway, advisor Q&A |
| **Health** | "weight 88kg", "8000 steps", "200g chicken breast", "did 45 min strength", "today's workout", "finished my workout", "skip today's workout", "why isn't my weight moving?", *[meal photo]* | log metric / food / ad-hoc workout, today's metrics, workout fetch / complete / skip, coach Q&A, undo |
| **Astrology** | "today's reading", "this month's reading", "current dasha", "today's panchang", "my characteristics" | readings (crisp Hindi bullets, `telegram-format.ts`), dasha, panchang, characteristics |

Unmapped messages fall back to each bot's help text.

## 8. Scheduled jobs (Vercel Cron)

Daily-only schedules (Vercel Hobby). Every job checks `Authorization: Bearer $CRON_SECRET` (an unset secret means silent 401s), resolves the single user, and calls `logCronRun()` so `cron-health-check` and Settings → System Health can spot a stale job (`EXPECTED_CRON_JOBS` in `src/lib/cron-log.ts`, kept equal to `vercel.json`).

| Job | UTC / IST | Bot | What it does |
| --- | --- | --- | --- |
| `reminders-morning` | `30 3 * * *` / 9:00am | Daily | Morning-slot reminders; silent when there are none. No AI. |
| `reminders-evening` | `0 16 * * *` / 9:30pm | Daily | "📌 Still open" (no expense today, an open workout, health metrics stale ≥3 days via `computeStaleMetrics()`, `stillOpenLine()` in `prep/coach.ts`) + evening-slot reminders; silent when there is nothing. No AI. |
| `weekly-digest` | `30 2 * * 0` / Sun 8am | Daily | 7-day module averages, best/worst day, a short AI review (`weekly_digest`, 6h cache), weekly spend by category. **No-op in Interview War Mode.** |
| `monthly-digest` | `40 2 * * *` / 8:10am | Daily | Same over 30 days, sends only on the 1st (IST). **No-op in Interview War Mode.** |
| `astrology-daily` | `0 4 * * *` / 9:30am | Astrology | Panchang + daily reading in Hindi. **No-op in Interview War Mode.** |
| `cron-health-check` | `0 4 * * *` / 9:30am | Daily | Alerts on any stale job; silent when healthy. |

## 9. AI Gateway

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
- **Rule engine first** — scores, plans, quotas, readiness, revision, funnel, runway, the timeline and every Telegram Prep reply are deterministic.

AI feature files: `src/features/ai/` (`finance-advisor.ts`, `health-coach.ts`, `recommendations.ts`, `weekly-digest.ts`, `score-stats.ts`), `src/features/prep/critique.ts`, `prep/actions.ts` (mock review, story critique), `brain/advisor.ts`, `astrology/actions.ts`.

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
- **Failed actions don't crash the page**: every transition callback that calls a server action is wrapped in `guard()` (`src/lib/guard.ts`). A rejection (most often `TypeError: Failed to fetch` when the network drops) is logged, the rest of the callback is skipped (optimistic state rolls back), and an `action-error` window event shows `ActionErrorToast`, instead of the route's `error.tsx` replacing the page. Next's redirect / notFound signals are rethrown (`unstable_rethrow`). Nothing is retried automatically (a lost response could otherwise save twice), except Prep's auto-finish of a question block, which tries again on the next minute tick.
- **Supabase clients**: `lib/supabase/server.ts` (cookies, RLS), `client.ts` (browser), `service.ts` (service role — crons, bots, writes to global pools), `middleware.ts` (session refresh; `/login` redirect; `/api` excluded).
- **Loading / error**: per-route `loading.tsx` (`PageSkeleton` matching the page) and `error.tsx` (Try again).
- **Shared components** (`src/components/`): `MicButton` (voice mode), `TopNav`, `ProfileMenu`, `PageHeader` + `HeaderChip`, `Card`, `StatCard`, `PageTabs`, `Modal`, `ConfirmDialog`, `EmptyState`, `FilterPill`, `Skeleton`, `FormattedText`, `FieldError`, `ModuleRecommendations`, `ThemeProvider`, `AIAdvisorProvider`, `ActionErrorToast`.
- **Header advisors**: a View calls `useAIAdvisor(label, icon, content)`; `AIAdvisorProvider` portals the content into the TopNav panel (Ask Brain on Dashboard, Money Advisor, Health Coach). Opens and tab switches are logged to `advisor_usage_log`.
- **Cross-module signals**: each module's `signals.ts` → `rankSignals()` (`src/lib/signals.ts`) → Needs Attention.
- **Navigation** (`TopNav.tsx`): desktop pills Dashboard · Prep · Finance · Health; Astrology and Settings in the profile menu. Mobile (<`md`): bottom bar Home · Prep · Health · Finance + More (Astrology, Settings). The version string links to `/changelog` (renders `CHANGELOG.md`). Redirects: `/coding` → `/prep?tab=questions`.

## Database

Standard: `user_id uuid references auth.users` + select/insert/update/delete RLS policies scoped to `auth.uid()`, except where noted. When a feature is removed, its schema is dropped in the same release (v4.0 dropped 16 tables and 5 columns — see `CHANGELOG.md`).

| Table | Key columns |
| --- | --- |
| `prep_settings` | user_id (PK), day_start_min (the default day start, minutes after IST midnight, default 660 = 11:00am), day_template jsonb (`DayTemplate`: sessions, gaps, minutes per day per plan key; null = defaults), weekly_outreach_target (unused), daily_outreach_target (unused), target_date (unused), updated_at |
| `roadmap_progress` | week (1–11 in use; the column check allows 1–13; unique per user), proof_url (http/https), metric (one key number), notes, completed_at, updated_at — a shipped Build-roadmap week (AI Engineer tab) |
| `prep_sessions` | date (unique per user), focus, blocks jsonb `[{key, label, detail, minutes, href, done, links?}]` (the day's items in order; keys: `learn`, `build`, `bank:<category>`, `mock`, `custom:<id>` (your own slots), `apply` (job applications); older days may hold `bank:interview` (the removed redo block), `lead` / `company:<id>` / `outreach`, or main/concept outside Interview War Mode; a few days hold `fight:<area>` / `mock:<format>`), completed_at, start_min (today's own start, null = the default), interview jsonb `{start, minutes, label}` (null = none), breaks jsonb `[{start, end, label?, meal?}]` (your breaks for the day, and meals moved today — `meal` = the gap index; null = none) |
| `prep_focus_sessions` | date, block_key, label, planned_minutes, started_at, paused_at, paused_seconds, interruptions, ended_at, actual_seconds, status (active/completed/abandoned) |
| `prep_fights` | unused — no code reads or writes it; old fight rows are kept |
| `coding_questions` | title, difficulty, url (null for linkless rows), source, topics text[], category (algorithm / quiz / system-design / javascript-functions / ui-coding / ai-native / behavioral / angular / backend / code-review / resume / architecture / ai-engineering; older rows may hold `interview`, which is not a Question Bank category — unconstrained text, typed in `hunt.ts`), sort_order, answer_hints, body (code shown above the answer: code-review diffs) — **global pool, no user_id** |
| `question_progress` | question_id (unique per user), attempts, last_answer, last_seen_at, last_rating (1–10), last_rated_at |
| `coding_daily_questions` | question_id, assigned_date, completed, completed_at, outcome, … — history from the retired Coding module, still read as practice/readiness signal |
| `mock_rounds` | format (screen / behavioral / system-design / machine-coding / code-review / ai-system-design; the check constraint also still allows ai-assisted, unused), items jsonb (each may carry `body`), duration_seconds, review jsonb {verdict, outcome, summary, strengths[], fixes[], notes[], ratings[], score, cards[] for scorecard-graded formats}, created_at |
| `stories` | title, competencies text[], situation, task, action, result, metrics, strength (1–5), last_rehearsed_at |
| `mood_logs` | date, mood, energy, note — unused; no code reads or writes it |
| `story_rehearsals` | story_id (nullable), competency, prompt, answer, critique (text), rating (1–10, computed), scorecard (jsonb `Scorecard`) |
| `telegram_drills` | question_id → coding_questions, asked_at, answered_at, transcript, rating (1–10), critique |
| `applications` | unused — the job-hunt pipeline's rows are kept (still in the Settings export); no other code reads or writes it |
| `interview_rounds` | unused — the job-hunt pipeline's rows are kept (still in the Settings export); no other code reads or writes it |
| `interview_questions` | unused — the job-hunt pipeline's rows are kept (still in the Settings export); no other code reads or writes it |
| `outreach` | unused — the job-hunt pipeline's rows are kept (still in the Settings export); no other code reads or writes it |
| `career_profile` | current_role, current_company, current_salary, target_role, years_experience, bio (one row) — read by Ask Brain's context; no in-app editor |
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
| `life_score_logs` | date (unique per user), life_score (blended), health_score, finance_score, career_score (no longer written, default 0), projects_score (Practice) |
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

See `.env.example` (copy to `.env.local`): Supabase URL / anon key / service role key, `SUPABASE_USER_ID`, `ANTHROPIC_API_KEY`, `AI_DAILY_BUDGET_USD`, `AI_MONTHLY_BUDGET_USD`, `GROQ_API_KEY`, `CRON_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_BOT_TOKEN_{PLANNER,FINANCE,HEALTH,ASTROLOGY}`, optional `TELEGRAM_DAILY_AI_CAP`. Webhooks are registered with `scripts/setup-webhooks.mjs`.

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
- **Layout shell** (`layout.tsx`): `ThemeProvider` > `TooltipProvider` > `AIAdvisorProvider` > `TopNav` + `<main className="max-w-[1180px] mx-auto …">` + `QuickAdd` + `ActionErrorToast` (top-center, `role="alert"`: "Couldn't reach the server — nothing was saved. Try again." with a dismiss ×, risk-bordered, gone after 5s; at the top so it never covers the mobile bottom bar or the FAB); bottom padding on mobile clears the bottom bar and FAB.
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
3. **Hunt Hero** — a full-width **Today's score** card (`ScoreCard` in `HuntHero.tsx`; stacks on mobile, `sm:flex-row`): left — the score at 40px in its tone (green on a good day whatever the %), "/ 100", level · blocks done x/y (+ "✓ good day"), 7-day avg · best (14d); right — a 14-day bar chart (96px; 13 past days by whole blocks from `recentScores` + today with partial credit; bars toned 90+ (or a good day) good / 70+ accent / 40+ warn / else risk, value above each bar, today full-opacity and bold, no-plan days as a stub, dashed target line at 90; date labels "Tue 14" / "Today" on `sm+`, every other day as a bare number on mobile). Below it 4 tiles `grid-cols-2 sm:grid-cols-4` (Readiness, Mock average, Revision due, Runway). (The Life Score ring + Quick Stats layout is not shown while War Mode is always on.)
4. **Needs Attention** + **Daily Mission** `lg:grid-cols-2 items-start`
5. **Life Score Trend** (not in Interview War Mode)

App-wide: Quick Add FAB; Ask Brain in the header.

### Prep (`/prep`)

1. Header — "Prep" + 🔥 streak, 🎯 today's focus, 📅 Interview-ready by {date}
2. Stat tiles (4) — Interview readiness (% + tier · blockers), Mock rounds this week, Story Bank, Pace (Ahead/Behind · % done · % of day gone · full days of 7)
3. Tabs: Today / AI Engineer / Questions / Mock Round / Story Bank
4. **Today** — **Today header** ("Today · {window}" + "· 🎤 interview {time}"; coach line; pace line: Ahead/Behind · % of plan done · % of the day gone · blocks; buttons **🎤 Interview today**, **✎ Edit today**, **✎ Default plan**) → when editing, the editor in place: **Edit today** (`lg:grid-cols-[1fr_320px] items-start`: left — "Day starts" time input, the 🎤 Interview today box (time, minutes, company/round, the warm-up / debrief note), the ☕ Meals & breaks box (one row per meal: start – end time inputs, its length, its name; then Add break; per break: start – end time inputs, its length, an optional name, ✕), the item list (↑ / ↓, name — an input for your own slots — minutes input, ✕), "Add a slot…" select + Add, Save / Cancel; right — the Preview: time range + label per row, and "Doesn't fit: …" in amber) or **Default plan** (sessions: name, start – end time inputs, gap label, the sessions' total time; "Minutes per day · the same every day": one row per plan key with a minutes input (`sm:grid-cols-2`), the mock an on/off "Sun · Tue · Thu · Sat"; the total line (red when over the sessions' time); Save / Cancel) → otherwise the full-width **Timeline** (header "{window} · ends {time}" + "· N min over" in amber; one compact row per slot `grid-cols-[50px_1fr_auto] sm:grid-cols-[124px_1fr_auto]`: start time on mobile / full range from `sm`, label — blocks bold with ✓ when done, meals / breaks / Flex muted, warm-up / interview / debrief in accent — an amber "moved" tag, minutes, and ⏱ Start / Go on the current, next or moved block; the current row accent-tinted, past rows dimmed; the over-hint and "Doesn't fit today" lines under it). Floating FocusBar (timer + progress + Pause / Finish / Stop) while focusing; no full-screen overlay.
5. **AI Engineer** `lg:grid-cols-[1fr_340px] items-start` — left **Roadmap** (header: week N of 11 · shipped/11 · with proof; progress bar; 11 rows: status circle (✓ shipped green · this week accent · past and not shipped amber · upcoming grey), W{n} · title, IST date range, milestone, then either the proof link + key-number chip ("no proof link yet" when missing) or "Done when …"; **Mark done** / **Edit** + **Undo** on this and past weeks → modal: proof link (http/https only), key number, notes → `saveRoadmapWeek()` / `undoRoadmapWeek()`). Right: **This week** (W{n} · title, date range, the daily Learn → Build → drill line, theme topic chips opening Questions filtered, doc links) above **AI topic mastery** (each AI-engineering topic: answered/total, average rating chip (≥7 green, ≥5 amber, else red), progress bar; this week's topics first in accent, then lowest average; click opens Questions on that topic).
6. **Questions** `lg:grid-cols-[1fr_340px]` — Sprint (header: answered today · planned minutes · questions · ≈ hours to complete; category chips with today's answers · planned minutes (✓ green when today's block is done — the same done state as the Today timeline, from focus time or answers), topic select, then `xl:grid-cols-[272px_1fr]`: scrollable question list | answer panel — question, answer, key points / link · 🎙 Speak + word count, structured AI review card (Answer follow-up → nested answer box + review), model answer panel, Answer / Hide answer · Review → Next; below `xl` list and panel alternate with "← All questions") + Coverage (seen/total · % · ≈ hours to complete per category; header: overall % in accent + total, with an overall accent bar on top)
7. **Mock Round** — format picker (6) + Mock Interview Calendar; running round (progress, countdown, answer, 🎙 Speak + word count, Skip/Next); round detail (review box, every answer with rating + note)
8. **Story Bank** — competency coverage → `lg:grid-cols-2`: Rehearse (prompt + shuffle, linked story, answer, 🎙 Speak + word count, Get feedback, review card; Recent rehearsals: expandable rows with rating chip → prompt, answer, review card, Retry this prompt) + Stories; story modal

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
