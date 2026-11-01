# Personal OS

[![CI](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml/badge.svg)](https://github.com/vinaysomawat/personal-ai-os/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/r194dme8y/c/19242327)

A personal, single-user AI Operating System: one Next.js app for interview prep, the job hunt, money, health and a Vedic astrology module. Claude is used only where judgment is needed (answer reviews, coaching, narratives). Each module has a Telegram bot for hands-free logging (text, voice or photo), plus scheduled Telegram coaching.

**Since v4.0 the app is built around an active job hunt:** Prep's Interview War Mode is always on, the Dashboard is a Hunt Hero, and the Prep page's timeline runs the day.

**Status:** a personal project for one person's life and workflow, open-sourced as a working example of an AI-assisted personal system (Next.js + Supabase + Claude + Telegram). Not multi-tenant. Fork it and borrow the patterns. MIT licensed — see `LICENSE`.

## Modules

| Module | What it does | Spec |
| --- | --- | --- |
| Dashboard | Hunt Hero (interview readiness and today's prep), Needs Attention, Ask Brain; Life Score outside War Mode | [docs/modules/dashboard.md](docs/modules/dashboard.md) |
| Prep | The day plan and timeline, Question Bank with AI-reviewed answers, readiness gates, interview prep from a JD, mock rounds, Story Bank, the AI engineering path | [docs/modules/prep.md](docs/modules/prep.md) |
| Finance | Expenses and budgets, month pace, runway, loans, investments, goals, Money Advisor | [docs/modules/finance.md](docs/modules/finance.md) |
| Health | Daily metrics, food log, workouts and planner, weight trend, Health Score, Health Coach | [docs/modules/health.md](docs/modules/health.md) |
| Astrology | Natal chart, Panchang, daily / monthly / yearly readings | [docs/modules/astrology.md](docs/modules/astrology.md) |
| Settings | Account and JSON export, AI budget, system health of the crons, reminders | [docs/modules/settings.md](docs/modules/settings.md) |

Also: [Telegram bots](docs/telegram.md) · [scheduled jobs](docs/cron.md) · [AI Gateway](docs/ai-gateway.md) (every AI task, its model, cache and budget) · [architecture, stack and design system](docs/architecture.md) · [database](docs/database.md) · [UI reference](docs/ui-reference.md). The [docs index](docs/README.md) says what each file covers. History lives in `CHANGELOG.md` and git.

## Stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres + Row Level Security) · Tailwind CSS · Anthropic Claude through one AI Gateway · Groq Whisper for voice · Telegram Bot API · Vercel + Vercel Cron.

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
