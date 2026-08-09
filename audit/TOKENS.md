# Design Tokens — verbatim extraction vs. repo

Source of truth: `Dashboard-standalone.html`'s `<helmet><style>` block, project `040b5aee-a63a-4215-afee-fa1e00b56f95` (`DesignSync.list_files` confirms this project has exactly one `.dc.html` file — `Dashboard.dc.html` — plus `support.js`, the generic `dc-runtime` templating engine that parses/executes it; `Dashboard-standalone.html`, a self-contained export of the same design; and `Personal OS Dashboard.html`, the complete bundler export used earlier this session to work around `DesignSync.get_file`'s ~261KB silent-truncation bug). **Every module/screen in this app (Dashboard, Planner, Career, Finance, Health, Learning, Coding, Documents, Settings, every modal, every advisor panel) is defined inside this one file** via `sc-if` blocks (`isDashboard`, `isPlanner`, `isCareer`, ...) — there is no per-module design file to separately import.

`support.js` is infrastructure (React/DOM parsing helpers for the `<x-dc>` template format), not design content — nothing to extract from it.

## Repo stack (detected, not assumed)

- Framework: Next.js 15, App Router (`src/app/**/page.tsx`)
- Styling: Tailwind CSS v3, custom color tokens in `tailwind.config.js` backed by CSS custom properties
- Global styles / token definitions: `src/app/globals.css`
- Component library: shadcn/ui (Radix/base-ui primitives) for a handful of primitives; almost everything else is hand-built with Tailwind utility classes directly on JSX, matched value-by-value against the design source (no central "type scale" or "radius scale" component props system)

## Color + density tokens — verbatim comparison

The design source defines exactly one centralized token layer: CSS custom properties for color (dark/light) and density-driven padding. **Every single value already matches `globals.css` byte-for-byte** — confirmed by direct comparison, not assumed from prior sessions' work:

| Token group | Design (`[data-theme="dark"]`) | `globals.css` | Match |
|---|---|---|---|
| `--bg` / `--bg-translucent` / `--card` / `--surface-2` | `#0f0f13` / `rgba(15,15,19,.85)` / `#16161d` / `#1e1e2a` | identical | ✓ |
| `--border` / `--border-strong` | `#26263a` / `#33334a` | identical | ✓ |
| `--text-primary/secondary/tertiary/quaternary` | `#e2e8f0` / `#94a3b8` / `#64748b` / `#475569` | identical | ✓ |
| `--shadow-sm/md/lg` / `--overlay` | `rgba(0,0,0,.3/.35/.5)` / `rgba(0,0,0,.6)` | identical | ✓ |
| `--accent/-soft/-border/-strong` | `#7c6af7` / `rgba(124,106,247,.18)` / `rgba(124,106,247,.4)` / `#a996ff` | identical | ✓ |
| `--good/-soft` / `--on-good` | `#34d399` / `rgba(52,211,153,.16)` / `#052e1d` | identical | ✓ |
| `--warn` / `--risk/-soft/-border/-strong` | `#fbbf24` / `#f87171` / `rgba(248,113,113,.12/.35)` / `#fca5a5` | identical | ✓ |

Same result for every `[data-theme="light"]` value (`--bg:#f5f5f8`, `--accent:#6d5ce0`, `--good:#16a34a`, `--warn:#d97706`, `--risk:#dc2626`, etc.) — all identical.

Density tokens also match exactly:

| | `[data-density]` (comfortable) | `[data-density="compact"]` |
|---|---|---|
| `--card-pad-lg` | `18px 20px` (both) | `12px 14px` (both) |
| `--card-pad-md` | `16px` (both) | `11px` (both) |
| `--card-pad-sm` | `14px 16px` (both) | `9px 11px` (both) |
| `--modal-pad` | `24px` (both) | `16px` (both) |
| `--panel-pad` | `18px 20px` (both) | `12px 14px` (both) |

**Two repo-only additions, not in the design source — kept, not removed:**
- `--warn-soft` (dark `rgba(251,191,36,.15)`, light `rgba(217,119,6,.1)`) — the design defines `--warn` but no soft/tint variant in either theme; the repo added one so `bg-warn-soft` (used throughout for warning-tinted backgrounds, e.g. Settings' AI Budget bar, Finance alerts) has a value. Removing it would break every existing call site for no design-fidelity gain — the design just doesn't need a warn-soft anywhere in its own markup.
- `--chart-1` through `--chart-5`, and the full block of shadcn compatibility aliases (`--background`, `--foreground`, `--primary`, `--muted`, etc.) — infrastructure for shadcn/ui primitives and chart tooling, which the design source (a static HTML/JS prototype, not a shadcn app) has no equivalent of. Necessary glue, not a fidelity gap.

## Type scale / radii / shadows-beyond-3-tier / transitions / z-layers

**The design source has no centralized system for any of these.** Grepped the full decoded template for a second `<style>` block, `:root`, `--font-*`, `--radius-*`, `--z-*`, `--transition-*`, `--duration-*` — none exist. Every font-size, border-radius, transition, and z-index in the design is a literal inline value on that specific element's style getter (e.g. Settings' AI Budget card is `border-radius: 18px` while its Save button is `border-radius: 7px` — no shared radius token connects them, they're just both hand-set to those numbers by whoever built the mock).

This means "land the token set" for these categories is a category error — there is nothing to centralize because the source itself doesn't centralize it. The correct match to that convention (which is what every module audit so far has actually been doing) is: **per-element literal Tailwind arbitrary values** (`text-[13px]`, `rounded-[10px]`, `z-[60]`, etc.), verified one getter at a time against the source, not a shared scale. Building a fake central "type scale" or "radius scale" the design doesn't have would itself be a fidelity gap, not a fix.

Z-index layers *are* consistent in practice even without a named token — confirmed and applied so far: header `z-20`, mobile bottom bar/sheet `z-40`, dropdowns/modals `z-50`, full-height drawer panels (Executive Summary dropdown, Ask Brain) `z-[60]` matching the design's `Ask Brain`/`Executive Summary`/generic-modal panels which are all literally `z-index: 40` (backdrop) / `50` (panel) in source — already matched in the Modal system and Executive Summary work.

## Status

Token layer: **complete, verified, no changes needed.** Per-element values: tracked per-module in `audit/<module>-AUDIT.md`, following the same rigor as the pre-existing root-level audit files (`DASHBOARD-AUDIT.md`, `SETTINGS-AUDIT.md`, `MODAL-AUDIT.md`, `DOCUMENTS-AUDIT.md`, `DECIDE-TAB-AUDIT.md`, `CAREER-AUDIT.md`) — those six are real, already-fixed, already-live-verified work from earlier in this session, not being redone from scratch. See each module's `audit/` file for current status and any newly-found gaps from re-verification.
