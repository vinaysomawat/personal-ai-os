# AI Gateway

Every AI call goes through `askAI(task, prompt, system?, opts?)` / `askAIWithMeta()` in `src/lib/ai-gateway.ts` (`src/lib/anthropic.ts` is only imported by the gateway).

- **Tasks** (`TASK_CONFIG`; model, cache TTL). Models: Sonnet = `claude-sonnet-4-6`; Haiku 4.5 = `claude-haiku-4-5`, kept for Telegram intent parsing, where thinking would slow every reply; Haiku 5.5 (low) = `claude-haiku-5-5` at low effort with an 8K output cap (`LOW`). It thinks first, so a review costs about $0.0009 against $0.0034 on Haiku 4.5. Answer reviews, digests and narrative tasks run on it, and Sonnet is kept for images, `model_answer` (generated once and cached for a year) and the free-form advisors:

| Task | Model | Cache | Used by |
| --- | --- | --- | --- |
| `telegram_intent` | Haiku 4.5 | none | every bot |
| `telegram_vision` | Sonnet | none | receipt / meal photos |
| `answer_critique` | Haiku 5.5 (low) | none | Question Bank, voice drill, follow-up answers |
| `ai_native_critique` | Haiku 5.5 (low) | none | Question Bank, voice drill (AI-native), follow-up answers (AI-native) |
| `model_answer` | Sonnet | 1 year | Question Bank "Answer" button (one model answer per question) |
| `interview_plan` | Haiku 5.5 (`claude-haiku-5-5`, effort low, 16K max tokens) | 7d | Prep → Interview tab (JD → prep plan JSON) |
| `story_critique` | Haiku 5.5 (low) | none | Story Bank rehearsal |
| `mock_round_review` | Haiku 5.5 (low) | none | Mock Round |
| `finance_advisor` | Sonnet | none | Money Advisor, Finance bot |
| `health_advisor` | Sonnet | none | Health bot Q&A |
| `module_recommendations` | Haiku 5.5 (low) | 6h | Health Coach |
| `estimate_food_nutrition` | Haiku 5.5 (low) | 7d | Health bot |
| `brain_qa` | Sonnet | none | Ask Brain |
| `weekly_digest` / `monthly_digest` | Haiku 5.5 (low) | 6h | digest crons + "how was my week/month" |
| `astrology_reading` | Haiku 5.5 (low) | until the period ends (per call) | Astrology |
| `astrology_characteristics` | Sonnet | 1 year | Astrology |

- **Caching** — `ai_cache`, key `sha256(model::system::prompt)`; a changed prompt busts it; images never cached; a hit logs zero cost.
- **Budget** — `ai_usage_logs` logs every call. Ceilings `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD` (production: $0.1667/day, $5/month). **Interactive reserve**: `INTERACTIVE_TASKS` (telegram_intent, telegram_vision, answer_critique, ai_native_critique, story_critique, mock_round_review, model_answer) may use 100% of each ceiling; every other task stops at 70%. Any failure (budget, API, network) returns the task's fallback string — nothing throws. `askAIWithMeta()` also returns `budgetExhausted` + `budgetScope`.
- **Rule engine first** — scores, plans, quotas, readiness, revision, funnel, runway, the timeline and every Telegram Prep reply are deterministic.

AI feature files: `src/features/ai/` (`finance-advisor.ts`, `health-coach.ts`, `recommendations.ts`, `weekly-digest.ts`, `score-stats.ts`), `src/features/prep/critique.ts`, `prep/actions.ts` (mock review, story critique), `brain/advisor.ts`, `astrology/actions.ts`.
