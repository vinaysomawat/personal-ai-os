# Architecture

## Stack

- **Framework**: Next.js 15 App Router (TypeScript)
- **Auth + DB**: Supabase (PostgreSQL + Row Level Security)
- **Styling**: Tailwind CSS v3 with a custom `surface` / `accent` token system
- **Components**: hand-rolled (`src/components/`); the one primitive (`ui/tooltip.tsx`) wraps Base UI (`@base-ui/react`)
- **AI**: Anthropic `claude-sonnet-4-6` and `claude-haiku-4-5` via `@anthropic-ai/sdk`, through the AI Gateway
- **Voice**: Groq `whisper-large-v3-turbo`
- **Bots**: Telegram Bot API webhooks
- **Deploy**: Vercel (auto-deploy from `master`) + Vercel Cron

## Architecture

- **Thin page + feature view**: `src/app/[route]/page.tsx` (async server component, fetches) → `src/features/[module]/components/[Module]View.tsx` (`'use client'`, interactivity) → `src/features/[module]/actions.ts` (`'use server'`) + `types.ts`. Data logic shared with crons and bots lives in plain server modules (`prep/core.ts`, `prep/drill.ts`, `career/bank-sync.ts`, `career/pipeline-status.ts`, `dashboard/hunt-hero.ts`) — `'use server'` exports are publicly callable, so they only wrap auth + these.
- **Optimistic UI**: mutations use `useOptimistic` / local state + `useTransition`.
- **Failed actions don't crash the page**: every transition callback that calls a server action is wrapped in `guard()` (`src/lib/guard.ts`). A rejection (most often `TypeError: Failed to fetch` when the network drops) is logged, the rest of the callback is skipped (optimistic state rolls back), and an `action-error` window event shows `ActionErrorToast`, instead of the route's `error.tsx` replacing the page. Next's redirect / notFound signals are rethrown (`unstable_rethrow`). Nothing is retried automatically (a lost response could otherwise save twice), except Prep's auto-finish of a question block, which tries again on the next minute tick.
- **Supabase clients**: `lib/supabase/server.ts` (cookies, RLS), `client.ts` (browser), `service.ts` (service role — crons, bots, writes to global pools), `middleware.ts` (session refresh; `/login` redirect; `/api` excluded).
- **Loading / error**: per-route `loading.tsx` (`PageSkeleton` matching the page) and `error.tsx` (Try again).
- **Shared components** (`src/components/`): `MicButton` (voice mode), `TopNav`, `ProfileMenu`, `PageHeader` + `HeaderChip`, `Card`, `StatCard`, `PageTabs`, `Modal`, `ConfirmDialog`, `EmptyState`, `Skeleton`, `FieldError`, `ModuleRecommendations`, `ThemeProvider`, `AIAdvisorProvider`, `ActionErrorToast`.
- **Header advisors**: a View calls `useAIAdvisor(label, icon, content)`; `AIAdvisorProvider` portals the content into the TopNav panel (Ask Brain on Dashboard, Money Advisor, Health Coach). Opens and tab switches are logged to `advisor_usage_log`.
- **Cross-module signals**: each module's `signals.ts` → `rankSignals()` (`src/lib/signals.ts`) → Needs Attention.
- **Navigation** (`TopNav.tsx`): a 44px translucent bar — "Personal OS" wordmark, desktop pills Dashboard · Prep · Finance · Health (the active page filled with the accent), then Ask Brain (when the page has an advisor), the theme toggle, the version (links to `/changelog`, renders `CHANGELOG.md`) and the profile avatar; Astrology and Settings in the profile menu. **Badges**: red iOS-style counts on a pill / tab — Prep = today's plan blocks not done (`getNavBadges()` in `src/lib/nav-badges.ts`, one read, fetched by TopNav after render and on each page change). Mobile (<`md`): a floating pill tab bar (10px from the bottom, translucent, icons + labels + badges) Home · Prep · Health · Finance + More (a sheet with Astrology, Settings). Redirects: `/coding` → `/prep?tab=questions`.

## Design System

From `tailwind.config.js`, `globals.css` and `src/components/` — what actually renders.

- **Theme**: `[data-theme="dark"|"light"]` on `<html>`; defaults by time of day (light 6am–6pm) via a blocking init script, manual toggle in `TopNav` persisted to localStorage (`ThemeProvider.tsx`).
- **Tokens**: surfaces `surface` / `surface-1` (cards) / `surface-2` (inputs, insets) / `surface-3` (borders); `accent` (+ `accent-soft`); text `fg-primary` → `fg-secondary` → `fg-tertiary` (any informational text) → `fg-quaternary` (only decorative/hover affordances — below AA for text); semantic `good` / `warn` / `risk` with `-soft` / `-border` / `-strong` variants; `--chart-1..5`; spacing vars `--grid-gap`, `--grid-gap-sm`, `--card-pad-sm|md|lg`. Values are the iOS system palette (`globals.css`): light — grouped background `#f2f2f7`, white cards, borders `#e5e5ea`, accent system blue `#007aff`; dark — black background, `#1c1c1e` cards, `#2c2c2e` insets, accent `#0a84ff`; status colours are Apple's (green / orange / red), with darker text-safe variants in light mode. Use the tokens, never Tailwind palette colours.
- **Typography**: the Apple system font (`-apple-system`, SF Pro; Inter as the fallback elsewhere); Tailwind's scale plus explicit small sizes (`text-[10.5px]`–`text-[13px]` for dense UI, 19px bold `tabular-nums` for stat values, 19px/700 page titles). Card titles are section labels: 11px uppercase grey.
- **Layout shell** (`layout.tsx`): `ThemeProvider` > `TooltipProvider` > `AIAdvisorProvider` > `TopNav` + `<main className="max-w-[1180px] mx-auto …">` + `QuickAdd` + `ActionErrorToast` (top-center, `role="alert"`: "Couldn't reach the server — nothing was saved. Try again." with a dismiss ×, risk-bordered, gone after 5s; at the top so it never covers the mobile tab bar or the FAB); bottom padding on mobile clears the tab bar and FAB.
- **Primitives**: `Card` (`bg-surface-1 border-surface-3 rounded-[10px]`, optional title as an 11px uppercase grey section label + action, sizes to content); `StatCard` (10.5px uppercase label, 19px value, one sub-line, 10px radius); modals and sheets use a 14px radius; action-list rows use a 3px coloured left border; `PageHeader` (title, chips, right action); `PageTabs` (underline tabs, scrollable); `Modal` / `ConfirmDialog`; `EmptyState`; skeletons (`animate-pulse`, no spinners); `InlineEdit` (Finance).
- **Charts**: recharts, always `next/dynamic({ ssr: false })` behind a placeholder; shared styling in `src/lib/chart-theme.ts`. Rings (Life Score, Health Score, `MiniRing`) are hand-drawn SVG.
- **Icons**: `lucide-react`; Astrology uses 🔮.
- **Numbers**: ₹ via `en-IN` grouping, no decimals; AI $ to 4 decimals under a cent; `tabular-nums` on live numbers.
- **Density rules**: compact over airy; `items-start` on grids so cards don't stretch; 5+ sub-areas → tabs; check every change at iPhone 16 Pro (393×852).
