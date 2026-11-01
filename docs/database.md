# Database

Standard: `user_id uuid references auth.users` + select/insert/update/delete RLS policies scoped to `auth.uid()`, except where noted. When a feature is removed, its schema is dropped in the same release (v4.0 dropped 16 tables and 5 columns — see `CHANGELOG.md`).

| Table | Key columns |
| --- | --- |
| `prep_settings` | user_id (PK), day_start_min (the default day start, minutes after IST midnight, default 660 = 11:00am), day_template jsonb (`DayTemplate`: sessions, gaps, minutes per day per plan key; null = defaults), updated_at |
| `roadmap_progress` | week (1–11 in use; the column check allows 1–13; unique per user), proof_url (http/https), metric (one key number), notes, completed_at, updated_at — a shipped week of the AI engineering path (AI Engineer tab) |
| `roadmap_steps` | week, step (0-based within the week), done_at; primary key (user_id, week, step) — a ticked step of the AI engineering path; Learn / Build follow the week's first unticked step |
| `prep_sessions` | date (unique per user), focus, blocks jsonb `[{key, label, detail, minutes, href, done, links?}]` (the day's items in order; keys: `learn`, `build`, `bank:<category>`, `mock`, `custom:<id>` (your own slots), `apply` (job applications); older days may hold `bank:interview` (the removed redo block), `lead` / `company:<id>` / `outreach`, or main/concept outside Interview War Mode; a few days hold `fight:<area>` / `mock:<format>`), completed_at, start_min (today's own start, null = the default), interview jsonb `{start, minutes, label}` (null = none), breaks jsonb `[{start, end, label?, meal?}]` (your breaks for the day, and meals moved today — `meal` = the gap index; null = none) |
| `prep_focus_sessions` | date, block_key, label, planned_minutes, started_at, paused_at, paused_seconds, interruptions, ended_at, actual_seconds, status (active/completed/abandoned) |
| `coding_questions` | title, difficulty, url (null for linkless rows), source, topics text[], category (algorithm / quiz / system-design / javascript-functions / ui-coding / ai-native / behavioral / angular / backend / code-review / resume / architecture / ai-engineering; older rows may hold `interview`, which is not a Question Bank category — unconstrained text, typed in `hunt.ts`), sort_order, answer_hints, body (code shown above the answer: code-review diffs) — **global pool, no user_id** |
| `question_progress` | question_id (unique per user), attempts, last_answer, last_seen_at, last_rating (1–10), last_rated_at |
| `coding_daily_questions` | question_id, assigned_date, completed, completed_at, outcome, … — history from the retired Coding module, still read as practice/readiness signal |
| `mock_rounds` | format (screen / behavioral / system-design / machine-coding / code-review / ai-system-design; the check constraint also still allows ai-assisted, unused), items jsonb (each may carry `body`; `answer` is always blank — answers are never stored), duration_seconds, review jsonb {verdict, outcome, summary, strengths[], fixes[], notes[], ratings[], score, cards[] for scorecard-graded formats}, created_at |
| `interview_preps` | company, role, round, jd, interview_date (Prep date), start_min (minutes after IST midnight), minutes (15–240), matched jsonb (`JdMatch`), plan jsonb (`InterviewPlan`, null until the AI plan succeeds), research jsonb (`InterviewResearch`, from the `/interview-prep` skill), created_at, updated_at |
| `stories` | title, competencies text[], situation, task, action, result, metrics, strength (1–5), last_rehearsed_at |
| `story_rehearsals` | story_id (nullable), competency, prompt, answer, critique (text), rating (1–10, computed), scorecard (jsonb `Scorecard`) |
| `telegram_drills` | question_id → coding_questions, asked_at, answered_at, transcript, rating (1–10), critique |
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
