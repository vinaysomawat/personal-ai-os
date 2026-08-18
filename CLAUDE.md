# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal OS is a single-user AI Operating System — a Next.js 15 web app backed by Supabase and deployed to Vercel. It covers Dashboard (Life Score + Today's Focus), Planner, Career, Finance, Health, Learning, Coding, and Settings, all reachable from a per-module Telegram bot.

**For the full, current, module-by-module spec (exact fields, formulas, AI features, Telegram capabilities, cron jobs, complete DB schema) — read `README.md`, not this section.** This file covers workflow/conventions only; README.md is the single source of truth for what the app does, and per the checklist below it's kept current with every functional change.

## Workflow

Before touching code for any non-trivial feature or fix, give a spec first: what's changing, why, the approach, and any tradeoffs — then wait for explicit go-ahead before writing code. Small, obvious one-line fixes (typos, single-value tweaks) don't need this.

## UI/Design principles

Build every screen like the best UI/UX designer in the world would: dense and compact, not airy. Minimize whitespace — padding, margins, gaps, empty card space. Utilize the full screen area; prefer showing more real information (more list items, more stats, tighter rows) over generous breathing room. This is a data-dense personal ops tool, not a marketing site — err toward density, not toward "clean minimal" spacing. Still keep text legible and touch targets usable; compact means tight spacing and small type sizes, not overlapping or unreadable elements.

**Mobile target: iPhone 16 Pro** (393×852 CSS px, below `TopNav`'s `md:` breakpoint where it switches from the desktop nav pills to the fixed mobile bottom bar). Any UI change must be checked at that viewport, not just desktop — no horizontal overflow, no clipped/overlapping elements, touch targets stay usable at that width.

**Claude Design is the source of truth for UI.** The Claude Design project (`040b5aee-a63a-4215-afee-fa1e00b56f95`, primarily `Dashboard.dc.html` — despite the name, this one file's `sc-if` blocks cover every page's layout, not just Dashboard) is the canonical spec for what this app's screens should look like, ahead of whatever the app currently renders. It changes independently of this repo — the user edits it directly in the design tool between sessions — so a prior sync is not assumed still current:
- Before any non-trivial UI work on a page, fetch that page's current section from the design (`DesignSync` tool, `get_file` on `Dashboard.dc.html`) rather than relying on memory of an earlier read or on what's already implemented.
- Diff against what was last synced (if unsure what changed, diff the fetched content against the corresponding page's actual current implementation, not just against another stale copy) — implement genuinely new/changed sections; don't re-implement sections that already match, and don't treat every fetch as a full rebuild (sync incrementally, per the `DesignSync` tool's own guidance).
- The `.dc.html` format has known literal-value artifacts from how the design tool measured its own preview render (e.g. a card with a hardcoded `width: 1081px` or `height: 296px`) — match the design's structure/spacing/color intent, not necessarily its literal pixel dimensions when they clearly don't fit this app's actual responsive layout.
- Color fidelity (below) is the same principle applied specifically to color values — pull them from the design's own CSS variables, don't approximate.

**Color fidelity**: when implementing or reviewing anything against the Claude Design source (`Dashboard.dc.html`, project `040b5aee-a63a-4215-afee-fa1e00b56f95`), pull the exact color value from the design's own `[data-theme="dark"|"light"]` CSS-variable block or inline `style` attributes — never approximate with a nearby Tailwind literal (`text-green-400` is not the same color as `var(--good)`, even when they look similar at a glance) and never guess a hex from memory. Check both light and dark theme values independently; they're frequently different hex codes, not just the same token at different opacity. If a color has no existing CSS-variable token, still copy its literal hex/rgba exactly rather than rounding to the nearest named Tailwind shade.

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

`README.md` is the canonical spec of this app — written so that pasting the whole file into a fresh AI chat gives that AI 100% understanding of what the app does and how it's built, with no other context needed (module-by-module behavior, exact fields, formulas, AI features, Telegram capabilities, cron jobs, full DB schema, and the screen-by-screen UI Reference at the bottom).

Before ending **any** task that changes the app in a way a fresh reader would need to know — architecture, database schema, a module's fields/behavior, an AI feature (including which tasks exist, which model they route to, and their cache TTL), a Telegram bot capability, a cron job, navigation structure, **or a page's actual layout/component structure** — update the corresponding section(s) of `README.md` to match, every time, not just on the change that "feels big." Treat this as mandatory, same tier as running `npm run build`, never something to batch up and do "later" — a change that isn't reflected in README.md is not finished. This applies in both directions: adding something new AND removing/replacing something old (a removed feature's stale mentions — an old task name, an old file path, an old UI element — are just as wrong left behind as a new feature never being added).

The **"## UI Reference (screen-by-screen)"** section at the bottom is exactly as easy to leave stale as the feature-behavior sections above it, and just as wrong when it drifts — check it specifically, not just the module's prose section, whenever a page's structure changes: a card that moved to a different grid/row, a dropdown that became a drawer (or vice versa), a section that got reordered, merged, or split, a card that's no longer paired with what the doc says it's paired with. Don't assume the prose section being current means the UI Reference entry for the same page is also current — verify both.

Pure copy/spacing/color tweaks that don't change a section's actual structure or behavior don't need a README update. But reordering cards, changing which cards share a grid row, swapping one UI pattern for another, or adding/removing a UI element **does** count as a real change requiring an update — even when no new data, table, or business logic was involved.

## Product Principles

This project is Vinay's personal execution system — not a CRUD app, not a dashboard, not a note-taking tool. Every feature should make him measurably better next week. Everything maps to one of four pillars: **Learn** (courses/research/architecture) → **Build** (coding/projects/OSS) → **Perform** (planner/habits/career) → **Recover** (health/sleep/nutrition).

**Long-term goals the product should serve:** career growth toward Staff Frontend Engineer (JS/TS/React/Next.js/testing/system design/AI-assisted dev), continuous learning, coding consistency, health (current focus: weight loss), high-signal productivity, and a searchable "second brain" of notes/decisions.

1. **Automation over manual work.** If something can be automated, automate it.
2. **Rule engine before AI.** Before calling AI, ask "can deterministic code solve this?" If yes, don't call AI. Never use AI for calculations, sorting, filtering, score math, dashboards, reminders, charts, or notifications — only for mentoring, coaching, reviewing, explaining, brainstorming, summarizing, and generating plans.
3. **AI is a premium feature, not a default.** Every AI request must go through the single gateway (`askAI()` — see AI Gateway below). No module calls Anthropic directly. An unnecessary AI call is a bug.
4. **Modules should connect, not stay isolated** — e.g. health data should eventually inform productivity signals, learning should feed career readiness. This is already built via the shared signals layer (`src/lib/signals.ts`'s `rankSignals()`, fed by each module's own `signals.ts`) and the Personal Brain's cross-module context (`src/features/brain/`) — see README.md §1 (Needs Attention / Today's Focus) and §12 (Personal Brain) for what's already wired. Extend the existing pattern for new cross-module connections; don't build a parallel mechanism.
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
- `src/lib/supabase/service.ts` — service-role client, bypasses RLS; used by cron jobs and the Telegram webhook, which run without a browser session
- `src/lib/supabase/middleware.ts` — session refresh + redirect logic
- `middleware.ts` (root) — runs on every request

**AI Gateway** (`src/lib/ai-gateway.ts`): the single entry point for every AI call — `askAI(task, prompt, system?)`. Per Product Principle 3, no module calls Anthropic directly. It handles:
- **Model routing** — cheapest suitable model per task (Haiku for structured/mechanical tasks like Telegram intent parsing and doc summaries, Sonnet for reasoning tasks like coaching/advice)
- **Response caching** — `ai_cache` table, keyed on `sha256(model + system + prompt)`; a changed prompt (i.e. changed underlying data) naturally busts the cache
- **Budget enforcement** — `ai_usage_logs` table tracks cost per call; daily/monthly ceilings via `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD` env vars; on exhaustion, calls return a friendly fallback string instead of erroring — no page or cron job can break from this
- **Minimize Anthropic API usage.** Treat every call to `askAI()` as a real cost, not a free action. Before adding a new task, check whether an existing cached/computed result already answers it. For any task whose output only needs to reflect data that changes on a daily/weekly/monthly cadence (a cron-generated narrative, digest, or briefing — the kind of thing a user might also trigger on-demand the same day via Telegram), give it a non-null `cacheTTLSeconds` (`SIX_HOURS` is the default choice already used throughout this file) rather than leaving it uncached by default. Reserve `cacheTTLSeconds: null` for genuinely interactive tasks where each call's prompt is expected to differ (free-form Q&A, decision help, scenario simulation) — caching those wouldn't help anyway since the prompt text itself changes per call, and it's not worth the code complexity of trying.

**AI features** (`src/features/ai/` and `src/features/brain/`) — see README.md §12 (AI Gateway) for the current file list and what each one does; don't maintain a second copy here, it drifts (same lesson as the Database Tables note below).

**Loading / error states:**
- `src/app/[route]/loading.tsx` — skeleton shown by Next.js while server fetches data
- `src/app/[route]/error.tsx` — error boundary with "Try again" reset button

**Shared components** (`src/components/`) — see README.md's Architecture section for the current list; don't maintain a second copy here, it drifts (same lesson as the Database Tables note below).

## Database Tables

All tables have `user_id uuid references auth.users` and 4 RLS policies (select/insert/update/delete scoped to `auth.uid()`), unless noted otherwise in a table's migration.

**Full current table list with key columns lives in README.md's Database section** — kept current per the checklist above. Don't maintain a second copy here; it drifts (this is exactly what happened before this note was added).