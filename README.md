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
| Prep | The day plan and timeline, Question Bank with AI-reviewed answers, readiness gates, interview prep from a JD, mock rounds, Story Bank | [docs/modules/prep.md](docs/modules/prep.md) |
| Finance | Expenses and budgets, month pace, runway, loans, investments, goals, Money Advisor | [docs/modules/finance.md](docs/modules/finance.md) |
| Health | Daily metrics, food log, workouts and planner, weight trend, Health Score, Health Coach | [docs/modules/health.md](docs/modules/health.md) |
| Astrology | Natal chart, Panchang, daily / monthly / yearly readings | [docs/modules/astrology.md](docs/modules/astrology.md) |
| Settings | Account and JSON export, AI budget, system health of the crons, reminders | [docs/modules/settings.md](docs/modules/settings.md) |

Also: [Telegram bots](docs/telegram.md) · [scheduled jobs](docs/cron.md) · [AI Gateway](docs/ai-gateway.md) (every AI task, its model, cache and budget) · [architecture, stack and design system](docs/architecture.md) · [self-hosting](docs/self-hosting.md) · [database](docs/database.md) · [UI reference](docs/ui-reference.md). The [docs index](docs/README.md) says what each file covers. History lives in `CHANGELOG.md` and git.

## Stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres + Row Level Security) · Tailwind CSS · Anthropic Claude through one AI Gateway · Groq Whisper for voice · Telegram Bot API · Vercel + Vercel Cron.

## Development

```bash
npm install      # dependencies
npm run dev      # http://localhost:3000
npm run build    # production build (type-check + lint)
npm run lint     # ESLint
```

## Self-hosting

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vinaysomawat/personal-ai-os&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY,GROQ_API_KEY,CRON_SECRET&envDescription=See%20the%20self-hosting%20guide%20for%20where%20each%20value%20comes%20from&envLink=https://github.com/vinaysomawat/personal-ai-os/blob/master/docs/self-hosting.md)

The [self-hosting guide](docs/self-hosting.md) covers it end to end: create the Supabase project, run the migrations, create your account and close sign-ups, set the env vars (`.env.example` lists them), deploy to Vercel with the cron jobs, and optionally connect the Telegram bots. It also covers updates, troubleshooting and the security model. The guide, the architecture and the AI Gateway pages are also a public docs site at `/docs` in every deployment.
