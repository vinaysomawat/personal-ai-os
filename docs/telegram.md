# Telegram bots

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
