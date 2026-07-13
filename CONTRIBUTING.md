# Contributing

Thanks for taking a look at this project. A few things worth knowing before you open an issue or PR:

## What this is (and isn't)

This is a personal AI Operating System built for one person's specific life, workflow, and data model — not a multi-tenant product. It won't accept every feature request, especially ones that only make sense for a different life than the author's. It's a good fit for:

- Bug fixes
- Cleaner implementations of existing features
- Better documentation
- Generalizable patterns (e.g. improvements to the AI Gateway, the Telegram bot pipeline, or the rule-engine-first approach) that others building similar personal systems could reuse

It's a poor fit for:
- New modules/features tailored to a workflow other than the author's
- Multi-user/multi-tenant support
- Swapping out core stack choices (Next.js, Supabase, Claude) for alternatives

If you're unsure whether something fits, open an issue to discuss before writing code.

## Local setup

```bash
git clone https://github.com/vinaysomawat/vinay-ai-os
cd vinay-ai-os
npm install
cp .env.example .env.local   # fill in your own Supabase project, Anthropic key, etc.
```

Run the SQL files in `supabase/migrations/` against your own Supabase project, in order, then:

```bash
npm run dev
```

## Before opening a PR

```bash
npm run build   # runs the type-check + lint that CI will also run
npm run lint
```

- Keep PRs focused — one fix or feature per PR.
- Match the existing thin page + feature view pattern (`src/app/[route]/page.tsx` fetches data, `src/features/[module]/components/[Module]View.tsx` owns interactivity, `src/features/[module]/actions.ts` holds server actions). See `CLAUDE.md` for the full architecture rundown.
- No AI calls outside the AI Gateway (`src/lib/ai-gateway.ts`) — see Product Principles in `CLAUDE.md` for why.
- If your change affects a module's fields/behavior, an AI feature, a Telegram capability, a cron job, or the DB schema, update the relevant section of `README.md` in the same PR — it's the single source of truth for what the app does.

## Reporting bugs / requesting features

Use the issue templates — they'll ask for the context needed to act on the report quickly.
