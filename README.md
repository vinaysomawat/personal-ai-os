# Personal OS

[![CI](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml/badge.svg)](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/r194dme8y/c/19242327)

A personal, single-user AI Operating System: one Next.js app that tracks tasks, career, money, health, learning, coding practice, and a personal knowledge base — with Claude generating insight in every module, a per-module Telegram bot for hands-free logging (text, voice, or photo), scheduled proactive nudges, and a gamified "Life Score" that rolls all of it into one daily number.

This document describes exactly what the app does today, module by module, field by field, formula by formula, so it can be pasted into a fresh AI chat and give that AI complete understanding of the system with no other context needed. It is kept current with every functional change (see `CLAUDE.md`'s post-task checklist).

**Status:** this is a personal project built for one person's specific life and workflow — not a product, and not designed for multi-tenant use. It's open-sourced as a working example of an AI-assisted personal system (Next.js + Supabase + Claude + Telegram), not as a tool meant to be deployed as-is for someone else's life. Fork it, borrow the patterns you like, adapt the modules you don't need.

To run your own instance: clone the repo, `npm install`, copy `.env.example` to `.env.local` and fill in your own Supabase project / Anthropic key / Telegram bot tokens (see [Environment variables](#environment-variables)), run the SQL files in `supabase/migrations/` against your Supabase project in order, then `npm run dev`. Licensed under MIT — see `LICENSE`.

---

## 1. Dashboard (`/dashboard`)

The home screen. Server-computed on every load (`src/features/dashboard/actions.ts`):

- **Life Score (0–100)** — a weighted daily aggregate:
  `health×0.25 + finance×0.20 + career×0.20 + learning×0.20 + projects×0.15`
  - **Health score**: `(anyWorkoutLoggedToday ? 60 : 0) + (metricsLoggedToday out of 6 fields / 6) × 40`
  - **Finance score**: if a budget exists this month, scored on spend-to-budget ratio (`≤70%→100, ≤90%→85, ≤100%→70, ≤120%→45, else→20`); `60` if no budget set and zero spend logged; `50` neutral default otherwise
  - **Career score**: `min(100, (profile filled ? 25 : 0) + min(25, skills×3) + min(30, activeApplications×10) + (interview-QA bank non-empty ? 20 : 0))` — profile is "filled" once both `current_role` and `target_role` are set; active applications = status in `applied`/`screening`/`interview`
  - **Learning score**: `min(100, round((completed + in-progress×0.5) / total resources × 100))`
  - **Projects/Coding score**: `min(100, codingQuestionsSolvedLast30Days × 4)` — counts completed `coding_daily_questions` rows in the last 30 days (the old manual Projects tracker was removed — see §7; an earlier GitHub-push-activity version was replaced with this since GITHUB_USERNAME/GITHUB_TOKEN were never actually configured, silently keeping the score at 0).
  - Every dashboard load **upserts today's row** into `life_score_logs` (one row per user per day, all 5 sub-scores + the combined score)
- **Gamification (computed, not currently displayed)**: total XP = sum of `life_score` over the trailing 365 days; 9 level thresholds `[0,200,500,1000,2000,3500,5000,7500,10000]`; a day-streak counter; 9 badges (`🌱 First Step`, `📅 Week Warrior`, `💪 Month Master`, `🔥 7-Day Streak`, `⚡ 30-Day Streak`, `⭐ Half Century`, `🏆 Century Club`, `💎 Elite`, `🎯 1K XP Club`) — all still recomputed and upserted into `user_xp` on every load, and the 30-day per-module score history is still fetched, but **neither is rendered in the UI** (the Level/XP card and score-history chart were removed from `DashboardView.tsx`; the underlying data pipeline was left running rather than ripped out).
- **Today's Progress card** — deterministic (no AI), separate from Life Score: a fresh checklist that resets every midnight, distinct from Life Score's blend of persistent module state (month-to-date budget, 30-day coding activity, career profile completeness, etc.). Items (`src/features/dashboard/daily-progress.ts`): each Planner task with `due_date` = today (one item per task); today's health metrics logged (weight/calories/protein/steps); today's workout, only counted if one is currently assigned, done on completed *or* skipped; today's coding question, only counted on days one's assigned (excluded on revision days); today's trending read, only counted if one was generated; a study session logged today, only counted if any Learning resources exist; an expense logged today. Score = `round(completed/total × 100)`, or `100` if nothing applies today (not a `0/0`). Renders as a compact ring + up to 5 not-yet-done items as direct links to their module — the unclosed checklist items double as the "what to do next" recommendations, reusing the same computed data rather than a second pass or an AI call.
- **Today's Focus card** — deterministic ranking (no AI), top 5 of these candidates by score: overdue tasks (100, 🔴), interview-stage applications (90, 🎯), over-budget this month (80, 💸) or ≥90% of budget used (55, 💸), high-priority non-overdue tasks (70, ⚡), today's coding question still open (65, 💻), today's workout still open (60, 🏋️), no health metric logged today (50, 📊), a Learning resource completed but not revised in 14+ days (45, 📚, reusing the same rule as §6's revision nudge), a solved coding question not re-solved in 14+ days (40, 🔁, auto-detected complement to §7's manual `needs_revision` flag — dedupes by question so a recently re-solved question isn't flagged from an old row). Each links to its module. Each candidate is produced by its own module's `signals.ts` (e.g. `src/features/planner/signals.ts`) as a `Signal`, aggregated and ranked by `src/lib/signals.ts`'s `rankSignals()` — a shared layer per Product Principle 4, rather than one hardcoded candidate list.
- **Insights card** (client-computed, sits beside Today's Focus) — up to 6 deterministic one-liners in priority order: budget remaining/over, low sleep last night (<7h), active-application count, pending-task count, in-progress learning count, a nudge to log steps/water if Health score is low.
- **Recent bot activity** — last 50 rows from `telegram_logs`, rendered as compact single-line rows (emoji + module + user message + first line of bot reply + relative time), paginated client-side 10 at a time; header shows today's/month's AI spend (`$0.0047`-style 4-decimal formatting for sub-cent amounts) and a cache-hit-rate tooltip.
- **Module Scores** — 5 mini progress rings (Health/Finance/Career/Learning/Coding), each with a deterministic hover tip naming the single highest-point-value gap for that score (e.g. "No workout logged today — worth 60% of this score") — computed from the same sub-components the score itself is built from, no AI — plus a separate 7-tile Modules grid (Planner, Career, Health, Finance, Learning, Coding, Documents), each with a one-line live stat and a link out.
- **Quick Add** — floating "+" button for fast Task / Expense / Metric entry without leaving the dashboard.
- Realtime refresh: subscribes to Supabase Realtime changes on `workouts`, `tasks`, `health_metrics` and debounce-refreshes the page (e.g. after logging via Telegram).

## 2. Planner (`/planner`)

Simple task list. Fields: `text`, `done`, `priority` (high/medium/low), `area` (free text, defaults "General"), `due_date`, `recurrence` (daily/weekly/monthly or none).

- Add / delete / toggle-done; no manual priority-edit or sort UI (the old "AI Sort" feature — which was actually deterministic, not AI — was removed entirely per user request; tasks render in creation order, pending then completed)
- **Stats row** (Pending / High Priority / Overdue / Completed) above the task list, and a **By Area** panel beside it on wide viewports (`lg:` breakpoint, task list `lg:col-span-3` / panel `lg:col-span-2`) — deterministic counts grouping pending tasks by their `area` field, no AI
- **Recurring tasks**: completing a task with `recurrence` set auto-creates the next open instance with the same text/priority/area before marking the current one done
- **Two-way sync with Coding and Trending Reading**: toggling a task also mirrors `done`/`completed_at` onto the linked row in `coding_daily_questions` and/or `trending_readings` (matched via `task_id`) — see §7 for the full sync mechanics
- **External links on synced tasks**: a task auto-created by Coding (daily question or trending read) shows a small link-out icon that opens the original question/article directly, so reaching it doesn't require detouring through the Coding page. `getTasks()` (`planner/actions.ts`) does the reverse lookup — `task_id` lives on `coding_daily_questions`/`trending_readings`, not on `tasks` itself — and attaches the resolved URL per task; not stored as a `tasks` column.
- Pending task rows show their `due_date` when set (red if overdue), and the **By Area** panel below the list shows a proportion bar per area alongside the count
- **Plan Coach** — `ModuleRecommendations` content registered as the page's AI advisor (see "AI advisor header architecture" under Architecture, below), opened from the header trigger rather than an inline widget
- No focus/deep-work session tracking exists (added, then removed a few days later per user request — the table and UI are both gone)

## 3. Career (`/career`)

Five sub-areas sharing one page:

- **Applications** — pipeline: `company`, `role`, `status` (applied → screening → interview → offer/rejected), `salary_range`, `location`, `url`, `notes`, `applied_at`, `resume_version_id` (optional link to which resume was sent). Add / update status / delete.
- **Career profile** — single row: `current_role`, `current_company`, `current_salary`, `target_role`, `years_experience`, `bio`.
- **Resume Versions** — `name`, `content` (pasted text), `url`, `notes`, `is_primary`. Multiple tailored resume variants can be tracked; the first one added is auto-primary; "Set primary" reassigns it. When adding an application, a resume version can be picked from a dropdown (defaults to the primary) and shown inline on that application's row.
- **Skills** — `name`, `category` (Frontend/Backend/Testing/DevOps/Architecture/Soft Skills/Other), `level` (beginner→expert, click to cycle). Add / delete.
- **Interview Q&A bank** — `question`, `answer`, `topic` (JS/TS/React/Angular/Node/Playwright/Testing/System Design/Behavioral/General), `difficulty`, `last_reviewed_at`. Add / edit answer / delete.
- **Revision nudge ("what am I forgetting")** — deterministic, not AI: same 14-day idle rule as Learning's (§6) and Coding's (§7), applied to the whole Q&A bank (not filtered to one topic). `getQAsNeedingRevision` (`career/calculations.ts`) flags any item whose `last_reviewed_at` (or `created_at`, if never reviewed) is 14+ days old. A "Needs Revision" card surfaces these with a one-click "✓ Mark reviewed" action (also available inline when a Q&A row is expanded) — reviewing is a distinct, explicit action from editing the answer, so opening a row to fix a typo doesn't silently count as having studied it. Also feeds a Dashboard Today's Focus signal (`career.qa_needs_revision`, weight 42).
- **Suggested Questions** — a curated, hand-written (not AI-generated) list of ~17 Staff-level prep questions across JavaScript/React/System Design/Behavioral (`career/suggested-questions.ts`), shown in a collapsible panel grouped by topic. Deduped against the existing bank by exact question text; "+ Add" inserts via the same `addInterviewQA` action with `answer: null` — you write your own answer rather than getting a canned one.
- **Job Alerts** (Telegram-only, no web UI) — a daily cron (`job-alerts`, §11) checks a fixed list of ~16 companies' public Greenhouse/Lever job-board APIs for new frontend/UI postings and alerts via the Career bot. See `job-alerts.ts` and the `job-alerts` cron entry in §11 for the full mechanics.
- **Coding + Learning streaks → Career**: `getCareerData()` pulls the current Coding practice streak (`computeCodingStats` from `daily-core.ts`) and the current Learning study streak (`getStudyStreak` from `learning/calculations.ts`) and (a) shows `🔥 {N}-day coding streak` / `📚 {N}-day study streak` badges on the profile card (each only shown when its streak is `> 0`), and (b) folds both into the AI Career Mentor's context string — Product Principle 4 ("modules should connect") implemented via the shared signals pattern in `src/lib/signals.ts`.
- **AI features** (no generic `ModuleRecommendations` widget here — replaced by a dedicated mentor):
  - **Career Mentor** — `askCareerMentor(question, context)` — free-form Q&A fed the full profile + skills-by-category + pipeline snapshot + coding streak + study streak; answers under 250 words with direct verdicts on role-readiness/salary; opened from the header trigger (see "AI advisor header architecture" under Architecture) with quick-prompt chips
  - `generateInterviewQuestions(role, topic, difficulty)` — Claude generates 5 realistic Q&A pairs as JSON, used to bulk-seed the QA bank via an "AI Generate" modal on the Interview Q&A card (stays inline — a bulk action, not conversational, so it isn't part of the header advisor)

## 4. Finance (`/finance`)

The richest module — full personal finance tracking, scoped to the **current calendar month** for expenses/budgets:

- **Expenses** — `amount`, `category` (Food/Transport/Housing/Health/Shopping/Entertainment/Learning/Utilities/EMIs/Bills/Other), `description`, `date`, optional `recurring_expense_id` (set when auto-posted by the recurring-expense cron). Add / delete.
- **Budgets** — one amount per category per month (`upsert` on `user_id,category,month`).
- **Finance profile** — `monthly_salary`, `emergency_fund_months`. Changing salary auto-appends a row to `salary_history` (`amount`, `effective_date`, `note`) so raises are tracked over time.
- **Loans** — `name`, `principal`, `emi`, `interest_rate`, `remaining_months`, all **inline-editable** (EMI/rate/remaining-months can be updated in place without delete+recreate). Total remaining debt = `Σ emi × remaining_months`.
- **Investments** — `name`, `type` (mutual_fund/stocks/fd/crypto/other), `invested_amount`, `current_value` (both inline-editable), `notes`. P&L = current − invested. Split into two sub-sections in the UI: **SIPs** and **Lump Sum**.
- **SIPs** — a mode on the same investments row (`is_sip`, `sip_amount`, `sip_day_of_month` 1–28), not a separate table. A daily cron (§11) adds `sip_amount` to `invested_amount` on its due day each month, idempotently (`sip_last_contribution_month` watermark prevents double-applying if the cron fires twice) — deterministic, no AI. `current_value` is still manually edited (no market/NAV data source exists in the app). Cancel a SIP (keep the investment, stop auto-contributions) via the × next to its badge.
- **Recurring expenses** — `name`, `amount`, `category`, `day_of_month` (1–28), `active`. A daily cron (§11) auto-posts each active template into `expenses` on its scheduled day, tagging the row `description: "{name} (recurring)"` with `recurring_expense_id` set, idempotently (won't double-post the same month). Pause/resume and delete from the UI.
- **Financial goals** — `name`, `target_amount`, `current_amount`, `target_date`, `priority`. Add / update progress / delete.
- **EMI is not double-counted**: `loans.emi` is purely informational (shown only in the "Total Debt" card) and is never added on top of logged expenses — if EMI is paid, it's expected to already appear as a regular (typically "Bills") expense, and spend totals reflect only actual logged `expenses` rows.
- **By Category drill-down**: each category row in the "By Category" breakdown is clickable — expanding it lists every individual expense logged in that category this month (date, description, amount, delete), not just the aggregate spent total.
- **Rolling 3-month average expense** — computed on every load from the last 90 days of expenses, used as the "realistic monthly spend" baseline (as opposed to just this month's partial total).
- **Money Advisor** (`finance-advisor.ts`) — free-form Q&A fed the full financial snapshot: salary, EMIs (itemized per loan), 3-month avg spend, free cash/month (`salary − EMIs − avg spend`), portfolio with per-holding P&L, goals with target dates, and emergency-fund target in ₹. Answers under 200 words, numbers-driven. Opened from the header trigger with quick-prompt chips (see "AI advisor header architecture" under Architecture).

## 5. Health (`/health`)

Daily metrics, a structured Daily Workout Planner, and overall-fitness coaching. **The old habit tracker (with its 7-day streak grid) has been fully removed.** **The goal is overall fitness — a gradual deficit toward a normal BMI, not a target weight or deadline** — daily calorie/macro targets are auto-computed from height/current weight, no manual weight-loss goal needed. **Sleep and Water Intake tracking, and the Recovery metric, have been removed** per direct request ("these generally flow as much as it needs").

- **Daily metrics** (`health_metrics`, one upsertable row per user per day) — `weight_kg`, `calories`, `protein_g`, `steps` are the only fields shown in the UI (`sleep_hours`, `water_ml`, `recovery_score` columns still exist on the table but are no longer surfaced in Today's Metrics or used by the Health Score). Each shown as a compact inline-editable card with a "7d avg."
- **Ad-hoc workout log** (`workouts` table) — `date`, `type`, `duration_minutes`, `notes`. Whether a workout was logged today directly boosts the Activity sub-score; the Daily Workout Planner (below) auto-feeds this table on completion so both surfaces agree.
- **Daily Workout Planner** — a structured session planner modeled directly on the Coding daily-question system (§7), deterministic end to end, no AI in the selection logic:
  - **`workout_library`** — a static, curated pool of 55 workouts (11 categories × 5 variations: Chest & Triceps, Back & Biceps, Legs, Shoulders, Arms, Core & Abs, Full Body, Cardio & Conditioning, HIIT, Mobility & Recovery, Active Recovery), each with warmup, a full exercise table (sets/reps/rest/tempo/RPE/notes), an optional cardio finisher, cooldown, coach tips, and tags. Generated once from `workout-library-specification.md` and seeded via migration — global pool, no `user_id`, same pattern as `coding_questions`.
  - **`daily_workouts`** — per-user assignment: `workout_id`, `status` (`pending`/`in_progress`/`completed`/`skipped`), `assigned_date`, `completed_at`, `task_id`. **Not date-scoped like the coding system** — the rule is "one active workout at a time," not "one per day": a pending/in-progress workout stays active across days until explicitly completed or skipped, and only then is the next one generated.
  - **Rotation** (`workout-core.ts`, `pickNextWorkout()`) — excludes workouts completed in the last 7 sessions and whatever category was trained in the last 2 sessions (recovery-aware), falling back to progressively relaxed filters if that would empty the candidate pool; random pick among what's left for variety. History beyond the last 7 completed workouts is pruned automatically.
  - **Two-way sync** — identical pattern to Coding/Trending Reading: generating inserts a linked Planner task (`area: "Health"`) first; completing from the Health page marks the task done *and* inserts into the `workouts` log (so the Health Score picks it up); completing/un-completing the task in Planner mirrors back via `task_id`. Skipping deletes the linked task rather than marking it done.
  - Full detail (warmup/exercises/cardio/cooldown/coach tips) is behind a "Show full workout" toggle on the card; Start/Complete/Skip actions are always visible.
- **Health profile** — `age`, `gender`, `height_cm`, `activity_level` (sedentary→very_active), `workout_days_per_week`, `food_preference`. (`target_weight_kg`/`goal_deadline` columns still exist on the table for backward compatibility but are no longer collected by the profile form or used by any calculation.) The "Edit health profile" control lives on the Health Score card, not a separate row.
- **Calculations** (`calculations.ts`, pure functions, no AI):
  - **BMI** = `weightKg / (heightCm/100)²`
  - **BMR** (Mifflin-St Jeor): `10×weightKg + 6.25×heightCm − 5×age`, `+5` for male / `−161` for female
  - **TDEE** = `BMR × activity multiplier` (`sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9`)
  - **Normal-BMI target weight** = `24.9 × (heightCm/100)²` (upper bound of the normal BMI range — the most achievable target for someone starting overweight, auto-computed from height, no manual entry)
  - **Daily targets** (`calculateDailyTargets`): if current weight puts BMI above 24.9, calorie target carries a modest deficit (`0.4–1kg/week`, scaled to how much is left to lose) toward the normal-BMI weight; otherwise it's maintenance. `dailyCalorieTarget = max(1500, round(TDEE − deficit))`. **Protein target is based on the normal-BMI target weight while cutting, not current scale weight** (`2g × targetWeightKg`) — standard fat-loss guidance, since 2g/kg of an overweight starting weight overshoots real need. Fat = `25% of calorie target ÷ 9`, carbs = remainder `÷ 4`.
  - **Health Score (0–100)**: `nutrition×0.6 + activity×0.4` — nutrition blends calorie-accuracy and protein-hit-rate (0 if nothing logged); activity blends step-target-% with a workout-today bonus/floor; each sub-score carries a plain-English reason (e.g. "Protein is 24g below target"). No sleep component (removed).
- **No charts** — the Weight Trend and Progress line charts (and `MetricChart.tsx`) were removed per direct request; only the current-day metric cards and 7-day averages remain.
- **AI features**:
  - **Health Coach** (header advisor — see "AI advisor header architecture" under Architecture) — tabbed panel merging the generic recommendations widget with `getHealthReport`'s weekly trend report (weight change, calorie/protein/step averages, a /10 score, what's working, what isn't, 3 recommendations, under 200 words); each tab lazy-fetches independently on first view
  - `getDailyHealthPlan` — today's remaining calories/protein vs. target, BMI/deficit context, tied to the current Health Score — plain-text emoji checklist, under 150 words; stays inline on the page as `TodaysPlanCard` (per-day, not part of the header advisor)

## 6. Learning (`/learning`)

Resource tracker: `title`, `type` (course/book/video/article/podcast), `url`, `category`, `status` (not-started/in-progress/completed), `progress` (0–100), `notes`.

- Add / update status+progress+notes / delete
- **Study logs** — `resource_id`, `duration_minutes`, `notes`, `date`; drives a study-streak counter and "minutes this week" stat
- **Revision nudge ("what am I forgetting")** — deterministic, not AI: a `Needs Revision` card surfaces any `completed` resource with no study-log activity in the last 14 days, with a one-click "+ Log session" action. Same rule is exposed via the Telegram bot ("what needs revision").
- **Study Coach** (header advisor — see "AI advisor header architecture" under Architecture) — tabbed panel merging the generic recommendations widget with the AI daily study plan: given in-progress/not-started/completed counts and what's already been studied today, Claude proposes a "main focus" (60 min, references an actual resource by name), a "quick review" (15 min), and an optional stretch item — under 150 words; each tab lazy-fetches independently on first view
- **AI resource quiz** — `generateResourceQuiz(title, category, type, notes)` generates 5 mixed conceptual/applied/comparison questions as JSON for self-testing, click-to-reveal in the UI; stays inline as a per-resource "Quiz me" button (tied to one resource row, not part of the header advisor)
- **Suggested Resources** — a curated, hand-verified (every URL checked live before being added, not AI-generated — avoids the real risk of an LLM inventing plausible-but-fake links) list of ~12 frontend blog posts/articles across JS Deep Dive, React Fundamentals, Advanced React, System Design, and Performance (`learning/suggested-resources.ts`), shown in a collapsible panel grouped by category. Deduped against the user's existing resources by URL; "+ Add" inserts via the same `addResource` action.

## 7. Coding (`/coding`)

Two systems: an automated **daily coding-challenge habit** and a **trending-reading habit**, both synced into Planner. (The old manual "Projects" tracker with tech-stack tags was removed — GitHub push activity now drives the Coding score on the Dashboard instead.)

- **Daily coding challenge** (`daily-core.ts`, driving `coding_daily_questions` + `coding_questions`):
  - Two modes, per-user in `coding_settings`: **rotation** (weekday-based difficulty mix — Sun: none/revision day, Mon: 2 easy, Tue–Fri: 1 medium (Sat: 1 hard) — never two medium/hard in a day) or **fixed** (always N random questions/day)
  - Idempotent per day; if a difficulty bucket is exhausted, the pool cycle restarts (questions can repeat)
  - **Each assigned question auto-creates a linked Planner task** (`area: "Coding"`, priority "high" for hard else "medium") — see the two-way sync below
  - **Stats**: current/longest streak (today is allowed to be pending without breaking the current streak), total/easy/medium/hard solved, completion rate
  - **Contribution calendar** — a traditional single-month grid (Sun–Sat, day numbers, prev/next navigation) rather than a rolling 26-week heatmap strip, since the latter ran wide and space-heavy; each day classified solved/partial/missed/none, navigation bounded to the last 182 days of fetched data
  - `telegram_notify` setting turns off the daily Telegram push without disabling assignment logic
- **Trending reading** (`trending_readings`, mirrors the coding-question pattern) — one per day, deterministic (no AI): fetches Hacker News's front page (`hn.algolia.com` Algolia API), keyword-matches titles against a ~50-term frontend/AI/JS/system-design word list (word-boundary regex — avoids false positives like "ai" inside "maintain"; system-design terms are kept specific — "system design", "microfrontend", "monorepo", "scalability", etc. — rather than bare "architecture"/"scale" to avoid pulling in unrelated hardware/backend-only HN stories), excludes stories already surfaced before, picks the highest-points match. Surfaced as a card on the Coding page ("Today's Trending Read") and auto-creates a linked, low-priority Planner task until read.
- **Two-way sync (Planner ↔ Coding ↔ Trending)**: both `coding_daily_questions` and `trending_readings` carry a `task_id` FK into `tasks`. Generating either inserts the Planner task first, then the module row referencing it. Completing from the Coding page marks the linked task done. Completing/un-completing the task in Planner mirrors back onto both tables via `task_id` (no-op if there's no match). Both directions revalidate `/planner` and `/coding`.

## 8. Documents (`/documents`)

A personal full-text knowledge base: `title`, `content`, `tags` (array), `summary`, `updated_at`.

- Add / edit / delete; two-pane UI with search across title/content/tags
- **Auto-summarization**: any create/update where content is ≥300 characters triggers a 2–3 sentence Claude summary (content truncated to 6000 chars first), stored in `summary`; skipped (and left as `''`) for short content. Re-summarizes only when title/content actually changed, not on tag-only edits.
- **AI document Q&A** (`doc-qa.ts`): ask a question about one specific document; Claude answers strictly from that document's content and says explicitly if the answer isn't in the text
- **AI document summarization** — on-demand 3–5 bullet-point summary (separate prompt/code path from the auto-summary, used interactively via an "Ask AI" panel)

## 9. Settings (`/settings`)

- **Account** — shows the signed-in email; Sign Out.
- **Data Export** — one-click download of a full JSON backup spanning essentially every table (Planner, Career incl. resumes, Finance incl. recurring expenses, Health incl. workouts, Learning, Coding, Documents, Reminders, and score/XP history) — deterministic, no AI.
- **AI Budget** — read-only display of today's/this-month's AI spend against the daily/monthly ceilings (see AI Gateway, §12); ceilings themselves are env-var-only (`AI_DAILY_BUDGET_USD`/`AI_MONTHLY_BUDGET_USD`), not editable from the UI. Below the ceilings, a **spend-by-feature breakdown** (top 5, this month) groups `ai_usage_logs` by `task` — deterministic aggregation, no AI — turning a bare total into "what's actually costing money."
- **System Health** — passive view of the same cron self-monitoring data `cron-health-check` already uses (§11): each of the 8 scheduled jobs' last-confirmed-run time and a status dot (green/healthy, red/stale, gray/never-run-yet). `getCronJobHealth()` (`src/lib/cron-log.ts`) is the single source of truth for the staleness rule, shared between this card and the `cron-health-check` route itself — previously the only way to see cron health at all was a Telegram alert *after* something had already gone quiet; this surfaces it proactively.
- **Reminders** — freeform `label` + `module` + `slot` (morning/evening). Delivery isn't its own cron — it piggybacks on the existing daily-briefing (morning) and evening-checkin (evening) cron windows, since the hosting plan only supports daily-granularity schedules.

## 10. Telegram bot — the interaction layer

Each module is its own Telegram bot (own `TELEGRAM_BOT_TOKEN_*`), all pointed at one webhook (`src/app/api/telegram/[module]/route.ts` → `src/features/telegram/handler.ts`).

**Processing pipeline:**
1. Only messages from `TELEGRAM_ALLOWED_CHAT_ID` are accepted (single-user, single-chat system).
2. A daily AI-call cap (`TELEGRAM_DAILY_AI_CAP`, default 300) counted from `telegram_logs` protects against runaway spend — once hit, the bot replies with a quota message and skips processing entirely for the rest of the day.
3. **Voice messages** are transcribed first via Groq's `whisper-large-v3-turbo` (needs `GROQ_API_KEY`) before anything else happens.
4. **Photos** are supported by Finance (receipt → extracts amount + category) and Health (meal photo → estimates calories + protein) via a per-module `VISION_PROMPT`; other bots reply that photos aren't supported yet.
5. The transcribed/typed text (or image) goes to Claude with a module-specific system prompt defining a JSON action grammar, plus the actual current date injected (so "today" never relies on the model's training cutoff). A single message can produce **multiple actions** (e.g. a voice note describing a workout, water, and a finished chapter all at once) — the model returns a JSON array instead of one object, and each is executed and replied to in turn.
6. Claude's response is parsed and dispatched to that module's `execute()`, which does the real Supabase read/write and formats a Markdown reply.
7. Every interaction (module, chat id, message, parsed action(s), reply) is logged to `telegram_logs`, non-fatal on logging failure.

**Cross-cutting bot features:**
- **Undo/amend**: every bot supports `undo_last` (deletes/reverts the most recent write for that module — task, expense, application, ad-hoc workout log, resource, coding-question/reading completion, or document); Finance additionally supports `amend_expense` (corrects just the amount on the most recent expense).
- **Reminders**: Planner can `set_reminder`/`list_reminders`/`delete_reminder` (writes the `reminders` table used by Settings, §9).
- **Inline buttons**: adding a task attaches a "✅ Mark Done" button; tapping it completes the task (and syncs Coding/Trending if linked) without going through the AI layer at all. Every "add" action across all 7 modules (task, application, expense, loan, investment, recurring expense, ad-hoc workout log, learning resource, document) also attaches an "↩️ Undo" button (`src/lib/telegram/buttons.ts`) — unlike the `undo_last` text command, which always targets the most-recently-created row, the button encodes the specific row's id in its `callback_data`, so tapping it later (after newer items were added) still undoes the correct one, not whatever's newest at tap time. An explicit table allowlist (`UNDOABLE_TABLES`) guards the generic `undo:<table>:<id>` callback handler in `handler.ts` against acting on an unexpected table.
- **Proactive budget nudge**: logging an expense via Finance checks that category's budget and appends a warning if it's now over or ≥90% used.

**Per-module natural-language capabilities:**

| Bot | Example phrases | Actions |
|---|---|---|
| **Planner** | "add buy groceries high priority", "show pending tasks", "done with buy groceries", "delete buy groceries", "undo that", "how am I doing" (briefing), "how was my week" (digest), "how was my month" (monthly digest), "executive summary" (cross-module score + AI suggestions), "remind me to log weight every morning" | add/list/complete/delete/undo task, morning briefing, weekly/monthly digest, executive summary, reminder CRUD |
| **Career** | "applied to Google as Frontend Engineer", "Google moved me to interview", "show all applications", "add note to Google: good culture fit", "pipeline summary", "am I ready for a staff role?", "undo that" | add/update-status/list/undo application, add note, status summary, free-form AI mentor Q&A |
| **Finance** | "spent 500 on Swiggy food", "show today's expenses", "monthly summary", "set food budget 8000", "actually make that 400" (amend), "undo that", "net worth", "my salary is 120000", "add home loan 20L EMI 15000 180 months", "add SIP Axis Bluechip invested 50000 current 65000", "can I afford a car?", "rent is 15000 every month", "show my recurring expenses", *[receipt photo]* | expense add/list/undo/amend, monthly summary, set budget/salary, add loan/investment, net-worth snapshot, free-form AI advisor Q&A, add/list recurring-expense templates, receipt-photo expense capture |
| **Health** | "weight 88kg", "8000 steps", "2000 calories", "120g protein", "did 45 min strength training", "today's workout", "finished my workout", "skip today's workout", "undo that workout", "today's plan", "how was my week", "why isn't my weight moving?", *[meal photo]* | log metric/ad-hoc workout, today's metrics, fetch/complete/skip today's structured workout (fuzzy-free — always operates on the single active workout), undo last ad-hoc workout log, AI daily plan, AI weekly report, free-form AI coach Q&A, meal-photo calorie/protein estimate |
| **Learning** | "add Next.js course from Udemy", "started JavaScript: The Good Parts book", "update Next.js to 60%", "finished React docs", "show in-progress resources", "what should I study today", "what am I forgetting", "quiz me on React hooks", "undo that" | add/undo resource, update progress, complete, list by status/needs-revision, AI daily study plan, on-demand 5-question AI quiz on a resource |
| **Coding** | "today's question", "solved Two Sum", "today's reading", "finished reading", "explain closures in JS", "undo that" | fetch/complete today's coding challenge (fuzzy title match), fetch/complete today's trending read, free-form AI coding-mentor Q&A (uses recent streak/solved/reading as context), undo the most recently completed question or reading (whichever is newer) |
| **Documents** | "note that Next.js 15 uses server components by default", "create doc Interview Prep with content...", "add to Interview Prep: practice system design", "search React hooks", "list documents", "what did I write about system design?", "undo that" | create/append/search/list/undo documents, free-form AI Q&A grounded in the best-matching document's content |

Any message the model can't confidently map to an action falls back to `{"action":"help"}`, answered with that bot's own cheat-sheet.

## 11. Scheduled jobs (Vercel Cron)

Defined in `vercel.json`, all protected by `Authorization: Bearer $CRON_SECRET`, all resolving the single app user via `supabase.auth.admin.listUsers()[0]` (single-user deployment). **If `CRON_SECRET` isn't actually set in the deployment's environment variables, every job below fires on schedule but is immediately rejected with 401 before any logic runs — silently, with no error surfaced anywhere in the app.** (This happened in production for an unknown period; fixed by setting the env var and redeploying. Worth spot-checking after any env var changes: `curl -H "Authorization: Bearer $CRON_SECRET" https://<deployment>/api/cron/<job>` should return `{"ok":true}`, not 401.)

**Self-monitoring**: every job below calls `logCronRun(supabase, '<job-name>')` (`src/lib/cron-log.ts`) right after its auth check passes, writing a row to `cron_runs` — proof the route executed past `CRON_SECRET`, independent of whatever the rest of the job does. `getCronJobHealth()` (same file) reads that table and classifies each job `healthy`/`stale`/`never-seen` against its own cadence (26h for daily jobs, 8 days for the Sunday-only `weekly-digest`) — shared by two consumers: `cron-health-check` (below), which Telegram-alerts on any `stale` job so a repeat of the `CRON_SECRET` outage gets caught within a day instead of going undiagnosed, and Settings' System Health card (§9), which shows the same data passively. A job with **no history at all yet** (e.g. `weekly-digest` before its first Sunday since this table existed) is `never-seen`, not alarmed on — there's no prior "healthy" baseline for it to have gone stale from.

| Job | Schedule (UTC / IST) | Sends via | What it does |
|---|---|---|---|
| `daily-briefing` | `0 3 * * *` (~8:30am IST) | Planner bot | Recomputes today's Life Score vs. yesterday's, has Claude write a <120-word morning message, appends any active morning Reminders. Always sends. |
| `daily-coding` | `5 3 * * *` (~8:35am IST) | Coding bot | Generates/fetches today's coding assignment; on a revision day, surfaces up to 3 incomplete past questions instead of going silent. Skipped if `coding_settings.telegram_notify = false`. Appends a "Tip of the day" from `coding_tips` (see `health-tip` below for the shared rotation mechanism). |
| `recurring-expenses` | `10 3 * * *` (~8:40am IST) | — (no message) | Auto-posts any active recurring-expense template due today into `expenses`, idempotently. Purely a DB write, silent by design. |
| `sip-contribution` | `15 3 * * *` (~8:45am IST) | — (no message) | Adds `sip_amount` to `invested_amount` for any SIP due today, idempotently (`sip_last_contribution_month` watermark). Purely a DB write, silent by design. |
| `trending-reading` | `20 3 * * *` (~8:50am IST) | Coding bot | Generates/fetches today's trending read and sends it. Skipped if `coding_settings.telegram_notify = false` or no matching story exists today. |
| `evening-checkin` | `30 14 * * *` **and** `0 17 * * *` (8:00pm and 10:30pm IST — runs twice) | Planner bot | Checks for un-logged habits/tasks/expenses/metrics, an at-risk coding streak, and a still-open daily workout; appends any active evening Reminders; **only sends if something is actually outstanding**, otherwise stays silent. |
| `weekly-digest` | `30 2 * * 0` (Sunday ~8am IST) | Planner bot | Averages the last 7 days of `life_score_logs` per module, identifies strongest/weakest module and best/worst day, has Claude write a 3-sentence review (<80 words), renders an ASCII progress-bar scorecard, and appends a deterministic category-wise weekly spend breakdown (highest-spend category first). |
| `monthly-digest` | `40 2 * * *` (~8:10am IST, every day) | Planner bot | Same shape as `weekly-digest` but a 30-day window — runs daily like every other cron (Vercel Hobby only supports daily granularity) but self-gates to only actually send on the 1st of the month (IST); every other day it's a silent no-op. Also triggerable on demand via "how was my month". |
| `health-tip` | `25 3 * * *` (~8:55am IST) | Health bot | Sends a "Health Tip of the Day" via `getDailyTip()` (`src/lib/daily-tip.ts`) — a deterministic rotation over a static curated pool (`health_tips`/`coding_tips` tables, ~30 tips each to start), not AI-generated, to avoid an LLM asserting wrong factual/health claims. Excludes tips this user has already seen (`daily_tips_log`), restarting the cycle once the whole pool is exhausted — same "no-repeat-until-exhausted" shape as the Workout Planner's rotation. Idempotent per day. |
| `job-alerts` | `35 3 * * *` (~9:05am IST) | Career bot | Fetches a fixed list of ~16 companies' public Greenhouse/Lever job-board APIs (`src/features/career/job-alerts.ts`) — same "free public API, no auth" pattern as `trending-reading`'s Hacker News integration — filters titles by frontend/UI keywords, dedupes against `job_alerts_seen`, and alerts only on postings genuinely new since the last check (capped at 10 per message). FAANG-tier companies aren't reachable this way — they don't expose a public Greenhouse/Lever board. |
| `cron-health-check` | `0 4 * * *` (~9:30am IST) | Planner bot | Reads `cron_runs`; if a job that's run before has gone quiet past its expected cadence, sends a Telegram alert naming which ones. Jobs with no history yet aren't alarmed on. Silent (no message) when everything's healthy. |

## 12. AI Gateway

Every AI call in the app funnels through one function: `askAI(task, prompt, system?, opts?)` in `src/lib/ai-gateway.ts`. No feature module calls Anthropic directly (`src/lib/anthropic.ts`'s `callClaude()` is a low-level primitive only the gateway imports). This is Product Principle 3 made concrete.

- **Model routing** — a fixed per-task table picks the model. Only `telegram_intent` and `doc_summary` route to Haiku (`claude-haiku-4-5`); every other task (`doc_qa`, `career_mentor`, `interview_questions`, `finance_advisor`, `health_report`, `health_daily_plan`, `health_advisor`, `study_plan`, `resource_quiz`, `coding_mentor`, `module_recommendations`, `daily_briefing`, `weekly_digest`, `monthly_digest`, `telegram_vision`) routes to Sonnet (`claude-sonnet-4-6`).
- **Response caching** — `ai_cache` table, key = `sha256(model::system::prompt)`. A changed prompt (i.e. changed underlying data) naturally busts the cache. Per-task TTLs range from none (always fresh, e.g. Q&A tasks) up to 7 days (`doc_summary`); images are never cached. A cache hit skips the API call entirely and logs zero cost.
- **Budget enforcement** — `ai_usage_logs` logs every call (task, model, tokens, `estimated_cost_usd`, cache-hit flag). Before calling the model, the gateway sums today's and this month's spend; if either meets `AI_DAILY_BUDGET_USD` (default $3) or `AI_MONTHLY_BUDGET_USD` (default $50), it skips the API call and returns that task's configured fallback string instead — most tasks fall back to an empty string or `'[]'`/`'{"action":"help"}'` for silent degradation, while a few user-facing Q&A tasks (`doc_qa`, `career_mentor`, `finance_advisor`, `health_report`) return an explicit "I'm over my AI budget for today" message. No page or cron job can break from this.
- **Rule-engine-first**: score math, sorting, chart data, the coding rotation, the trending-reading pick, the recurring-expense post, and the revision-nudge rule are all deterministic — never routed through `askAI`, per Product Principle 2.

**AI feature files** (`src/features/ai/`), all going through the gateway: `career-mentor.ts`, `finance-advisor.ts`, `health-report.ts` (includes `askHealthCoach`, the Health bot's free-form Q&A), `coding-mentor.ts` (the Coding bot's free-form Q&A — recent streak/solved-questions/readings as context), `study-plan.ts`, `doc-qa.ts`, `weekly-digest.ts`, `recommendations.ts` (the generic recommendations widget behind Plan Coach, Code Mentor, and half of Health Coach/Study Coach — wired into Planner, Health, Learning, and Coding only; Career and Finance have a dedicated mentor/advisor instead, and Documents' Ask AI is per-document, so none of those three use the generic widget), `executive-summary.ts` (Planner bot's "executive summary" action — composes `generateWeeklyDigest` + one consolidated `getModuleRecommendations` call spanning every module at once, rather than a separate AI call per module; no new Gateway task, both underlying calls already route through `weekly_digest`/`module_recommendations`).

---

## Stack

- **Framework**: Next.js 15 App Router (TypeScript)
- **Auth + DB**: Supabase (PostgreSQL + Row Level Security)
- **Styling**: Tailwind CSS v3 with a custom `surface` / `accent` color system
- **Components**: shadcn/ui (Radix UI primitives)
- **AI**: Anthropic Claude — `claude-sonnet-4-6` (reasoning/coaching tasks) and `claude-haiku-4-5` (structured/mechanical tasks) via `@anthropic-ai/sdk`, both routed through the AI Gateway (§12)
- **Voice transcription**: Groq `whisper-large-v3-turbo` (for Telegram voice notes)
- **Bot**: Telegram Bot API webhooks, one bot token per module, supporting text/voice/photo input
- **Deploy**: Vercel (auto-deploy from `master`), Vercel Cron for scheduled jobs

## Architecture

**Thin page + feature view pattern:**
- `src/app/[route]/page.tsx` — async server component, fetches data, passes to view
- `src/features/[module]/components/[Module]View.tsx` — `'use client'` component, owns all interactivity
- `src/features/[module]/actions.ts` — `'use server'` functions (CRUD via Supabase)
- `src/features/[module]/types.ts` — TypeScript types for the module

**Optimistic UI:** mutations use `useOptimistic` + `useTransition` so the UI updates instantly before the server confirms.

**Supabase clients:**
- `src/lib/supabase/server.ts` — server components and server actions (cookies-based, RLS-scoped to the logged-in user)
- `src/lib/supabase/client.ts` — client components (browser)
- `src/lib/supabase/service.ts` — service-role client (used by cron jobs and the Telegram webhook — bypasses RLS since those code paths run without a browser session)
- `src/lib/supabase/middleware.ts` — session refresh + redirect logic, wired in root `src/middleware.ts` (matcher excludes `/api`, `_next/static`, `_next/image`, favicon, and image assets — so Telegram/cron webhooks are never gated by the browser auth check). Unauthenticated users on a page route are redirected to `/login`; authenticated users hitting `/login` are redirected to `/planner` (the authenticated landing page — distinct from `/dashboard`).

**Loading / error states:**
- `src/app/[route]/loading.tsx` — skeleton shown while the server fetches data
- `src/app/[route]/error.tsx` — error boundary with a "Try again" reset button

**Shared components** (`src/components/`): `Sidebar`, `BottomNav`, `Header`, `Card`, `UserInfo`, `Skeleton`, `AIAdvisorProvider`.

**AI advisor header architecture** — every module's whole-page AI advisor (Plan Coach, Career Mentor, Money Advisor, Health Coach, Study Coach, Code Mentor) lives in the top nav bar, not inline in page content. `Header.tsx` is a separate component from each page's `*View.tsx` in the layout tree and can't read a page's local state directly, so `AIAdvisorProvider` (wrapping the whole app in root `layout.tsx`) provides a shared registration slot: each View calls `useAIAdvisor(label, icon, content)` once, which registers the trigger's label/icon and portals `content` (real JSX from that View's own render, with full access to its local state) directly into the panel body DOM node via `createPortal` — content never round-trips through Context state, so typing/interacting inside the panel only re-renders the View itself, not the Provider (an earlier version that lifted content into Context state caused an infinite re-render loop; portaling was the fix). `Header.tsx` reads the currently-registered trigger via `useAIAdvisorTrigger()` and renders nothing on routes with no registered advisor (Dashboard, Documents, Settings). Not every AI feature moved here — only whole-page advisors did; per-item contextual AI (Documents' "Ask AI"/"Summarise", Career's bulk "AI Generate" interview questions, Learning's per-resource "Quiz me") stays inline, tied to whichever item is selected.

**Navigation structure** — desktop `Sidebar` groups modules by PRD-v2's "Growth Engine" pillars (Dashboard sits ungrouped above them): **Learn** → Learning; **Build** → Coding; **Perform** → Planner, Career; **Recover** → Health; then Finance and Documents ungrouped below (they don't map to a pillar), with Settings pinned in the footer. Mobile `BottomNav` uses a different, usage-frequency-based grouping instead (Home/Planner/Health/Finance in the primary row, everything else — including Career and Learning — behind a "More" sheet) rather than mirroring the pillar structure.

## Database

Standard pattern: `user_id uuid references auth.users` + 4 RLS policies (select/insert/update/delete scoped to `auth.uid()`), except where noted.

| Table | Key columns |
|---|---|
| `tasks` | text, done, priority, area, due_date, recurrence |
| `applications` | company, role, status, salary_range, location, url, notes, applied_at, resume_version_id |
| `resume_versions` | name, content, url, notes, is_primary |
| `career_profile` | current_role, current_company, current_salary, target_role, years_experience, bio (one row/user) |
| `skills` | name, category, level |
| `interview_qa` | question, answer, topic, difficulty, last_reviewed_at |
| `expenses` | amount, category, description, date, recurring_expense_id |
| `recurring_expenses` | name, amount, category, day_of_month (1–28), active |
| `budgets` | category, amount, month (unique per user+category+month) |
| `finance_profile` | monthly_salary, emergency_fund_months (one row/user) |
| `salary_history` | amount, effective_date, note — appended automatically on salary change |
| `loans` | name, principal, emi, interest_rate, remaining_months |
| `investments` | name, type, invested_amount, current_value, notes, is_sip, sip_amount, sip_day_of_month (1–28), sip_last_contribution_month |
| `financial_goals` | name, target_amount, current_amount, target_date, priority |
| `health_metrics` | date, weight_kg, calories, protein_g, sleep_hours, steps, water_ml, recovery_score, notes (unique per user+date) |
| `workouts` | date, type, duration_minutes, notes — ad-hoc log; auto-fed by the Daily Workout Planner on completion |
| `workout_library` | name, category, difficulty, duration_minutes, estimated_calories, primary_muscles, secondary_muscles, equipment, environment, warmup, exercises (jsonb), cardio (jsonb), cooldown, coach_tips, tags — global pool, 55 rows, no `user_id` |
| `daily_workouts` | workout_id, status (pending/in_progress/completed/skipped), assigned_date, completed_at, task_id (links to `tasks`) |
| `health_profile` | age, gender, height_cm, target_weight_kg, activity_level, workout_days_per_week, food_preference, goal_deadline (one row/user; target_weight_kg/goal_deadline unused — see §5) |
| `resources` | title, type, url, category, status, progress, notes |
| `study_logs` | date, resource_id, duration_minutes, notes |
| `coding_questions` | title, difficulty, url, source — global question pool, **no `user_id`** |
| `coding_daily_questions` | question_id, assigned_date, completed, completed_at, time_spent_minutes, notes, rating, favorite, needs_revision, task_id (links to `tasks`) |
| `coding_settings` | mode (rotation/fixed), fixed_count, telegram_notify (one row/user) |
| `trending_readings` | assigned_date, title, url, source, points, completed, completed_at, task_id (unique per user+date) |
| `coding_tips` / `health_tips` | tip — global curated pools, **no `user_id`**, ~30 rows each, read-only via app logic |
| `daily_tips_log` | category (coding/health), tip_id, assigned_date — which tip was shown to this user on which day, per category (unique per user+category+date) |
| `job_alerts_seen` | source (greenhouse/lever), company, external_id, title, url — dedupe log so `job-alerts` (§11) never re-alerts the same posting (unique per user+source+external_id) |
| `documents` | title, content, tags (text[]), summary, updated_at |
| `reminders` | module, label, slot (morning/evening), active |
| `life_score_logs` | date, life_score, health_score, finance_score, career_score, learning_score, projects_score (unique per user+date; append-only history) |
| `user_xp` | xp, level, badges, updated_at (one row/user; recomputed on every dashboard load, currently not surfaced in the UI) |
| `telegram_logs` | module, telegram_chat_id, message, action_taken (jsonb), response, created_at — **no `user_id`**; select policy is role-scoped (`auth.role() = 'authenticated'`), not owner-scoped |
| `ai_cache` | cache_key (unique), response, model, expires_at — RLS enabled with **no policies** (service-role access only, by design) |
| `ai_usage_logs` | task, model, input_tokens, output_tokens, estimated_cost_usd, cache_hit, created_at — select/insert-own only, no update/delete policies |
| `cron_runs` | job, ok, detail, created_at — **no `user_id`**, global/system table; proof-of-execution log written by every cron route right after its `CRON_SECRET` check, read by `cron-health-check` (§11); select policy is role-scoped (`authenticated`), writes are service-role only |

**Dropped tables** (existed at some point, since removed — mentioned here so their absence isn't mistaken for an oversight): `habits`, `habit_logs` (habit tracker retired), `projects` (manual project tracker retired in favor of GitHub-activity scoring), `focus_sessions` (deep-work tracking, removed days after being added).

## Development

```bash
npm install          # install dependencies
npm run dev           # start dev server at http://localhost:3000
npm run build          # production build (runs type-check + lint)
npm run lint            # ESLint
```

### Environment variables

Required in `.env.local` (and Vercel project settings) — see `.env.example` for the full list with inline comments; copy it (`cp .env.example .env.local`) and fill in your own values.

Telegram webhooks (one per module bot) are registered via `scripts/setup-webhooks.mjs`.

### Deploying your own instance

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vinaysomawat/personal-ai-os&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY,GROQ_API_KEY,CRON_SECRET&envDescription=See%20the%20README%27s%20%22Deploying%20your%20own%20instance%22%20section%20for%20where%20each%20value%20comes%20from&envLink=https://github.com/vinaysomawat/personal-ai-os%23deploying-your-own-instance)

This app is a single-user system — there's no way around some manual setup and a specific order of operations, since a few values (your own user ID, your own Telegram chat ID) don't exist until you've deployed once and signed up. Steps:

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough). Get `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.
2. **Run every file in `supabase/migrations/`** against that project, in filename order (Supabase Dashboard → SQL Editor, or the Supabase CLI).
3. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com) (`ANTHROPIC_API_KEY`). Optionally get a Groq key at [console.groq.com](https://console.groq.com) (`GROQ_API_KEY`) — only needed for Telegram voice-note transcription; the app works without it.
4. **Generate `CRON_SECRET`** — any random string (e.g. `openssl rand -hex 32`).
5. **Deploy** — click the button above, or `vercel deploy`, setting the env vars from steps 1–4.
6. **Sign up** at `https://<your-deployment>/login`, confirm your email, then log in. Copy your new user's UUID from Supabase Dashboard → Authentication → Users, and add it to your Vercel project's environment variables as `SUPABASE_USER_ID`, then redeploy — cron jobs and the Telegram bots use this to know whose data to act on.
7. **Lock down signups** in your Supabase project (Authentication → Sign In / Providers) once your own account exists — the app has no invite gate of its own, and by default the `/login` page's "Sign up" button lets anyone create an account against your database.
8. *(Optional, for Telegram)* Create one bot per module you want via [@BotFather](https://t.me/BotFather), set the resulting `TELEGRAM_BOT_TOKEN_*` env vars, message any of your new bots once to learn your chat ID (e.g. via [@userinfobot](https://t.me/userinfobot)) and set `TELEGRAM_ALLOWED_CHAT_ID`, redeploy, then run:
   ```bash
   node scripts/setup-webhooks.mjs https://your-app.vercel.app
   ```
