# Self-hosting

Personal OS is single-user: each person runs their own copy, with their own Supabase project, their own Vercel deployment and their own API keys. Everything below fits in the free tiers except the Anthropic API, which is pay-as-you-go and capped by the app's own AI budget.

## What you need

| Service | Used for | Required |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Postgres database, auth (email + password), Row Level Security | Yes |
| [Vercel](https://vercel.com) | Hosting the Next.js app and running the scheduled jobs (Vercel Cron) | Yes |
| [Anthropic](https://console.anthropic.com) | Claude, for answer reviews, coaching and summaries, all through the AI Gateway | Yes |
| [Groq](https://console.groq.com) | Whisper speech-to-text for voice notes and 🎙 Speak | Optional |
| [Telegram](https://telegram.org) | One bot per module for hands-free logging and reminders | Optional |

Locally you need Node.js 20 or newer, npm and git. `psql` is optional; it makes running the migrations one command.

## 1. Get the code

```bash
git clone https://github.com/vinaysomawat/personal-ai-os.git
cd personal-ai-os
npm install
cp .env.example .env.local
```

Fork the repository first if you want Vercel to deploy your copy and to pull in updates later.

## 2. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com). Pick the region closest to you; the app does several queries per page.
2. In **Project Settings → API**, copy the **Project URL**, the **anon (public) key** and the **service_role (secret) key** into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

The service role key bypasses Row Level Security. It is only used on the server (the AI Gateway, cron jobs, Telegram webhooks, seed scripts). Never expose it in a `NEXT_PUBLIC_` variable.

## 3. Create the database schema

The schema is the SQL files in `supabase/migrations/`, run **in filename order** (`ls` already sorts them correctly). Each file creates its tables with Row Level Security policies scoped to `auth.uid()`; later files alter or drop what earlier ones created, so the order matters.

**With psql (recommended).** Copy the connection string from **Connect → Session pooler** in Supabase, then:

```bash
export DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres"
for f in supabase/migrations/*.sql; do
  echo "== $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f" || break
done
```

The loop stops at the first error and prints the file it was on.

**With the SQL Editor.** Open each file in order, paste it into **SQL Editor → New query** and run it. That works, but there are many files, so psql is much faster.

**Check it worked:**

```sql
select count(*) from information_schema.tables where table_schema = 'public';
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
```

Every user table should show `rowsecurity = true`.

**Question Bank content.** The migrations seed part of the global question pool (`coding_questions`). The rest of the 2026 sets (backend, system design, code review, architecture, AI engineering and others) come from a re-runnable seed script that uses the service role key:

```bash
node --env-file=.env.local scripts/seed-prep-2026.mjs
```

The script matches rows on category + title, so it only inserts or refreshes questions and never deletes them. `From my resume` is about one specific person's resume; skip it with `node --env-file=.env.local scripts/seed-prep-2026.mjs backend system-design code-review …` and write your own.

## 4. Create your account and close sign-ups

The app has no invite gate of its own, so do this before the URL is public:

1. In **Authentication → Users**, choose **Add user → Create new user**, enter your email and a password, and tick **Auto Confirm User**.
2. In **Authentication → Sign In / Providers**, turn off **Allow new users to sign up**.
3. Copy your user's **UID** into `.env.local` as `SUPABASE_USER_ID`. The AI Gateway, cron jobs and Telegram bots act as this user when there is no browser session.

## 5. Fill in the rest of `.env.local`

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) |
| `SUPABASE_USER_ID` | Supabase → Authentication → Users → your UID |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `AI_DAILY_BUDGET_USD` | Optional, default `3`. The AI Gateway's daily spend ceiling |
| `AI_MONTHLY_BUDGET_USD` | Optional, default `50`. The monthly ceiling |
| `GROQ_API_KEY` | Optional. [console.groq.com](https://console.groq.com) → API Keys |
| `CRON_SECRET` | Any long random string: `openssl rand -hex 32` |
| `TELEGRAM_ALLOWED_CHAT_ID` | Optional. Your Telegram chat ID; the bots ignore every other chat |
| `TELEGRAM_BOT_TOKEN_PLANNER` | Optional. The Daily bot (the Prep coach, drills, reminders) |
| `TELEGRAM_BOT_TOKEN_FINANCE` | Optional. The Finance bot |
| `TELEGRAM_BOT_TOKEN_HEALTH` | Optional. The Health bot |
| `TELEGRAM_BOT_TOKEN_ASTROLOGY` | Optional. The Astrology bot |
| `TELEGRAM_DAILY_AI_CAP` | Optional, default `300`. Max AI-backed Telegram calls a day |

The AI budget is a hard ceiling: when it's reached, AI features return a short fallback message instead of failing, and the rest of the app keeps working. Start low, for example `AI_DAILY_BUDGET_USD=0.5` and `AI_MONTHLY_BUDGET_USD=10`, and raise it once you've seen your real usage in **Settings → AI Budget**.

## 6. Run it locally

```bash
npm run dev      # http://localhost:3000, sign in with the user from step 4
npm run build    # the production build: type-check + lint
```

## 7. Deploy to Vercel

1. In Vercel choose **Add New → Project**, import your fork, keep the detected Next.js settings, and add every variable from `.env.local` under **Environment Variables**.
2. Deploy. Pushes to the default branch redeploy automatically.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to your Vercel URL.

**Scheduled jobs** are declared in `vercel.json` (digests, reminders, the astrology push and a daily health check) and start once the project is deployed. Vercel sends `Authorization: Bearer $CRON_SECRET` with each run, and every route checks it. The schedules are daily or weekly, so they fit the Hobby plan. Each run writes a row to `cron_runs`, and **Settings → System Health** shows which jobs ran and which are stale.

## 8. Telegram bots (optional)

1. Message [@BotFather](https://t.me/BotFather) and create one bot per module you want: Daily (planner), Finance, Health, Astrology. Put each token in its `TELEGRAM_BOT_TOKEN_*` variable.
2. Find your chat ID, for example by messaging [@userinfobot](https://t.me/userinfobot), and set `TELEGRAM_ALLOWED_CHAT_ID`.
3. Add the variables in Vercel and redeploy, then register the webhooks against your deployment:

```bash
node --env-file=.env.local scripts/setup-webhooks.mjs https://your-app.vercel.app
```

Each bot's webhook is `/api/telegram/<module>`. Voice notes need `GROQ_API_KEY`.

## Updating

```bash
git pull upstream master   # or sync your fork on GitHub
```

Then run only the migration files newer than the last one you applied, in order (the same psql loop over just those files), re-run the seed script if `scripts/prep-2026/` changed, and let Vercel redeploy. `CHANGELOG.md` lists what each version changed.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Signing in sends you back to `/login` | Wrong Supabase URL or anon key, or the user isn't confirmed |
| A page errors with "relation … does not exist" | A migration was skipped or run out of order; re-run from the missing file |
| AI features reply "over my AI budget" | The daily or monthly ceiling was reached, or `ANTHROPIC_API_KEY` is wrong |
| Cron jobs show as stale in System Health | `CRON_SECRET` is missing or differs between Vercel and the app |
| A bot never answers | The webhook isn't registered, the token is wrong, or the message came from a chat other than `TELEGRAM_ALLOWED_CHAT_ID` |
| AI calls work locally but not on Vercel | A variable was added to `.env.local` but not to Vercel |

## Security model

One user per deployment. User tables are owner-scoped with Row Level Security; `telegram_logs`, `panchang_daily`, `cron_runs`, `workout_library` and `coding_questions` are readable by any authenticated user (global pools and system logs). Audit those before ever adding a second account. Keep sign-ups closed, keep the service role key server-side, and rotate any key that was ever committed or shared.
