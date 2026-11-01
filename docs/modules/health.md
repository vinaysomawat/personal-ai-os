# Health (`/health`)

Overall fitness: a gradual deficit toward a normal BMI, targets auto-computed (no manual goal).

- **Daily metrics** (`health_metrics`, one row per day): weight_kg, calories, protein_g, steps (inline-editable tiles with 7-day averages); `recovery_score` is Telegram-only.
- **Food log** (`food_log`, Health bot): "200g chicken breast" → calories/protein via `estimate_food_nutrition` (Haiku 5.5, 7-day cache), added onto the day's `health_metrics` totals. **Today's Food** card lists today's items; ✕ deletes and subtracts (`removeFoodLogEntry()`).
- **Workouts** (`workouts`): ad-hoc log via Telegram, auto-fed by the Daily Workout Planner. **Workout stats** (`computeWorkoutStats()`): total and current day streak from this log.
- **Daily Workout Planner** (`workout-core.ts`, deterministic): `workout_library` (55 workouts, 11 categories, global) and `daily_workouts` (one active workout at a time, enforced by a partial unique index). Rotation: Chest & Triceps → Back & Biceps → Shoulders/Legs (alternating) → Active Recovery/Mobility (alternating); a skip still advances; a random variation not done in the last 7. Complete (also logs to `workouts`) / Skip / **Change** (swap category in place).
- **Workout Calendar** — heatmap judged per week: Done / Rest days, a "Wk x/N" column vs `workout_days_per_week`, streaks, weeks on plan.
- **Health profile** — age, gender, height_cm, activity_level, workout_days_per_week, food_preference.
- **Calculations** (`calculations.ts`): BMI; BMR (Mifflin-St Jeor: `10w + 6.25h − 5a + 5` male / `− 161` female); TDEE = BMR × (1.2 / 1.375 / 1.55 / 1.725 / 1.9); normal-BMI weight = `24.9 × (h/100)²`; calorie target = `max(1500, TDEE − deficit)` with a 0.4–1 kg/week deficit while BMI > 24.9; protein = `2g × normal-BMI weight` while cutting; fat 25% of calories, carbs the rest. **Health Score** = `nutrition×0.6 + activity×0.4` (nutrition: calorie accuracy + protein hit 50/50; activity: steps % + workout bonus), each with a reason naming the worse factor.
- **Weight Trend** — sparkline over 30 days: latest, change, least-squares pace (kg/week) vs plan, projected normal-BMI date.
- **Activity-level check** (`suggestActivityLevel()`): last 28 days' workout days/week and average steps vs the profile's level; a one-line notice with Update when they disagree.
- **Health Coach** (header) — module recommendations (`module_recommendations`, Haiku 5.5, 6h cache). Free-form Q&A via the Health bot (`askHealthCoach()`, `health_advisor`).
