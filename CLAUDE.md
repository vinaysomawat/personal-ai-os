# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal OS is a single-user AI Operating System — a Next.js 15 web app backed by Supabase and deployed to Vercel. It covers Dashboard (Life Score + Today's Focus), Planner, Career, Finance, Health, Learning, Coding, Documents, and Settings, all reachable from a per-module Telegram bot.

**For the full, current, module-by-module spec (exact fields, formulas, AI features, Telegram capabilities, cron jobs, complete DB schema) — read `README.md`, not this section.** This file covers workflow/conventions only; README.md is the single source of truth for what the app does, and per the checklist below it's kept current with every functional change.

## Workflow

Before touching code for any non-trivial feature or fix, give a spec first: what's changing, why, the approach, and any tradeoffs — then wait for explicit go-ahead before writing code. Small, obvious one-line fixes (typos, single-value tweaks) don't need this.

## UI/Design principles

Build every screen like the best UI/UX designer in the world would: dense and compact, not airy. Minimize whitespace — padding, margins, gaps, empty card space. Utilize the full screen area; prefer showing more real information (more list items, more stats, tighter rows) over generous breathing room. This is a data-dense personal ops tool, not a marketing site — err toward density, not toward "clean minimal" spacing. Still keep text legible and touch targets usable; compact means tight spacing and small type sizes, not overlapping or unreadable elements.

**Mobile target: iPhone 16 Pro** (393×852 CSS px, the `BottomNav` breakpoint). Any UI change must be checked at that viewport, not just desktop — no horizontal overflow, no clipped/overlapping elements, touch targets stay usable at that width.

**Concrete patterns to apply/avoid** (distilled from `reference/UI.md`'s enterprise-density checklist — read that file for the full brief before a larger redesign pass):
- Don't let a CSS grid stretch a shorter card to match a taller sibling (`grid`'s default `align-items: stretch`) — add `items-start` to the grid wrapper so each card sizes to its own content instead of padding out with dead space.
- A page combining several distinct sub-areas (5+, e.g. Career's Applications/Profile/Resumes/Skills/Interview Q&A) belongs in tabs, not one long vertical scroll. Two or three shorter, related sections on a wide viewport belong side by side (`lg:grid-cols-2`+), not stacked full-width.
- Smarter cards over bare title+value: surface a secondary detail already in the data (a date, a running total, a percentage) rather than a lone number, but only from data already fetched — don't add a query or feature to fill space.
- Sort list/breakdown data by what matters most (e.g. spend descending) instead of static/alphabetical/insertion order, so the highest-signal row is first.

## Stack

- **Framework**: Next.js 15 App Router (TypeScript)
- **Auth + DB**: Supabase (PostgreSQL + RLS)
- **Styling**: Tailwind CSS v3 with custom `surface` / `accent` color system
- **Components**: shadcn/ui (Radix UI primitives)
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Deploy**: Vercel (auto-deploy from `master`)

## Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server at localhost:3000
npm run build        # production build (runs type-check + lint)
npm run lint         # ESLint
```

## Environment Variables

Required in `.env.local` (and Vercel project settings):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # used by the AI Gateway, cron jobs, Telegram webhook
SUPABASE_USER_ID=            # single-user app; fallback identity for the AI Gateway when no session exists
ANTHROPIC_API_KEY=
AI_DAILY_BUDGET_USD=         # optional, default 3 — AI Gateway daily spend ceiling
AI_MONTHLY_BUDGET_USD=       # optional, default 50 — AI Gateway monthly spend ceiling
```

This is a non-exhaustive list scoped to the AI Gateway — see `.env.local` for the full set (Telegram bot tokens, `GROQ_API_KEY`, `CRON_SECRET`, etc.), which this file doesn't fully document yet.

## Post-task checklist: keep README.md current

`README.md` is the canonical spec of this app — written so that pasting the whole file into a fresh AI chat gives that AI 100% understanding of what the app does and how it's built, with no other context needed (module-by-module behavior, exact fields, formulas, AI features, Telegram capabilities, cron jobs, full DB schema).

Before ending any task that changed architecture, database schema, a module's fields/behavior, an AI feature, a Telegram bot capability, a cron job, or navigation structure, update the corresponding section(s) of `README.md` to match. Treat this as a mandatory last step, same tier as running `npm run build` — not optional cleanup, and not something to batch up and do "later." A change that isn't reflected in README.md is not finished.

Pure UI polish (spacing, colors, copy tweaks) that doesn't change what a section *does* doesn't need a README update.

## Product Principles

This project is Vinay's personal execution system — not a CRUD app, not a dashboard, not a note-taking tool. Every feature should make him measurably better next week. Everything maps to one of four pillars: **Learn** (courses/research/architecture) → **Build** (coding/projects/OSS) → **Perform** (planner/habits/career) → **Recover** (health/sleep/nutrition).

**Long-term goals the product should serve:** career growth toward Staff Frontend Engineer (JS/TS/React/Next.js/testing/system design/AI-assisted dev), continuous learning, coding consistency, health (current focus: weight loss), high-signal productivity, and a searchable "second brain" of notes/decisions.

1. **Automation over manual work.** If something can be automated, automate it.
2. **Rule engine before AI.** Before calling AI, ask "can deterministic code solve this?" If yes, don't call AI. Never use AI for calculations, sorting, filtering, score math, dashboards, reminders, charts, or notifications — only for mentoring, coaching, reviewing, explaining, brainstorming, summarizing, and generating plans.
3. **AI is a premium feature, not a default.** Every AI request must go through the single gateway (`askAI()` — see AI Gateway below). No module calls Anthropic directly. An unnecessary AI call is a bug.
4. **Modules should connect, not stay isolated** — e.g. health data should eventually inform productivity signals, learning should feed career readiness. Not yet built — needs its own spec before implementing, don't wire this ad hoc.
5. **Reduce decisions, don't just surface data.** Prefer "these are the 3 highest-impact actions" over a wall of 25 tasks.
6. **Every page should answer:** what happened, why, and what to do next.
7. **Telegram exists to eliminate manual entry** — logging a workout/expense/habit/note should never require opening the app; voice input should work naturally.

**Before building any feature, answer all of these — if any answer is "no," don't build it:**
1. Is AI actually required?
2. Can deterministic code solve it?
3. Can existing modules be reused?
4. Does this increase productivity?
5. Does this reduce manual effort?
6. Does this improve one of the long-term goals above?
7. Is this worth maintaining for years?
8. Is there a simpler solution?

## Architecture

**Thin page + feature view pattern:**
- `src/app/[route]/page.tsx` — async server component, fetches data, passes to view
- `src/features/[module]/components/[Module]View.tsx` — `'use client'` component, owns all interactivity
- `src/features/[module]/actions.ts` — `'use server'` functions (CRUD via Supabase)
- `src/features/[module]/types.ts` — TypeScript types for the module

**Optimistic UI:** All mutations use `useOptimistic` + `useTransition` — UI updates instantly before the server confirms.

**Supabase clients:**
- `src/lib/supabase/server.ts` — server components and server actions (cookies-based)
- `src/lib/supabase/client.ts` — client components (browser)
- `src/lib/supabase/middleware.ts` — session refresh + redirect logic
- `middleware.ts` (root) — runs on every request

**AI Gateway** (`src/lib/ai-gateway.ts`): the single entry point for every AI call — `askAI(task, prompt, system?)`. Per Product Principle 3, no module calls Anthropic directly. It handles:
- **Model routing** — cheapest suitable model per task (Haiku for structured/mechanical tasks like Telegram intent parsing and doc summaries, Sonnet for reasoning tasks like coaching/advice)
- **Response caching** — `ai_cache` table, keyed on `sha256(model + system + prompt)`; a changed prompt (i.e. changed underlying data) naturally busts the cache
- **Budget enforcement** — `ai_usage_logs` table tracks cost per call; daily/monthly ceilings via `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD` env vars; on exhaustion, calls return a friendly fallback string instead of erroring — no page or cron job can break from this
- **Rule-engine-first**: `smart-sort.ts` (Planner task reordering) is deterministic, not AI — the one feature converted per Product Principle 2

**AI features** (`src/features/ai/`), all going through the gateway:
- `career-mentor.ts` — career Q&A + interview question generation
- `finance-advisor.ts` — financial Q&A grounded in real salary/EMI/investment data
- `health-report.ts` — weekly report + daily action plan
- `study-plan.ts` — daily study plan + resource quizzes
- `doc-qa.ts` — Q&A and summarisation for Documents
- `recommendations.ts` — per-module "AI Recommendations" widget

**Loading / error states:**
- `src/app/[route]/loading.tsx` — skeleton shown by Next.js while server fetches data
- `src/app/[route]/error.tsx` — error boundary with "Try again" reset button

**Shared components** (`src/components/`): `Sidebar`, `Header`, `Card`, `UserInfo`, `Skeleton`.

## Database Tables

All tables have `user_id uuid references auth.users` and 4 RLS policies (select/insert/update/delete scoped to `auth.uid()`), unless noted otherwise in a table's migration.

**Full current table list with key columns lives in README.md's Database section** — kept current per the checklist above. Don't maintain a second copy here; it drifts (this is exactly what happened before this note was added).
