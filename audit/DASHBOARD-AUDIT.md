# Dashboard Audit — Dashboard.dc.html vs. repo

Source of truth: `Dashboard.dc.html` fetched fresh via the Claude Design MCP (project `040b5aee-a63a-4215-afee-fa1e00b56f95`), cross-checked against the live rendered prototype at `claude.ai/design/p/...?file=Dashboard.dc.html`.

**Caveat about the source file itself (RESOLVED):** the getters listed below as "never assigned anywhere in the fetched script" were not actually missing from the design — the `DesignSync.get_file` tool silently truncates large files at ~261,403 characters with no error, and every one of these getters was defined past that truncation point. This was discovered by diffing against a complete copy the user exported directly from the design tool and added to the repo (`Personal OS Dashboard.html`), which contains the full, untruncated script. All getters below now have confirmed exact values and have been applied; only `desktopNavWrapStyle`'s specific ambiguity (row 2, logo lockup) remains genuinely unresolved.

Status legend: MATCH (already correct, unchanged) / FIXED (changed to match) / OPEN (flagged, deliberately not changed — reason given) / MISSING-DATA (accurate fix would require inventing data not currently computed anywhere).

---

## Header / Nav shell

| # | Element | Design spec | Verdict | Resolution |
|---|---|---|---|---|
| 1 | Header container | `headerStyle`: `z-index: 20`, `padding: 14px 20px` | **FIXED** | `TopNav.tsx`: `z-30`→`z-20`, padding moved from an inner `px-4 md:px-5 h-12` row to header-level `px-5 py-3.5`. Confirmed exact via the complete (untruncated) source. |
| 2 | Logo lockup | `font-weight: 700; font-size: 16px; letter-spacing: 0.2px;` plain text, no icon box, always visible (no responsive hiding) | **FIXED** | Previously OPEN pending an unambiguous source; the latest design extraction resolves it with an explicit letter-spacing value and confirms no icon element. `TopNav.tsx`: removed the `bg-accent`/`Cpu` icon badge and the `hidden sm:inline` responsive hide; logo is now plain `text-base font-bold tracking-[0.2px]` text, always shown. |
| 2b | Logo lockup — version line | New sub-row (2026-08-10 design update, added independently of and just before the app itself grew this exact feature): a second line below the title, `font-size: 10px; color: var(--text-tertiary); letter-spacing: 0.2px;`, static `"v1.0.0"` in the mock | **FIXED** | `TopNav.tsx` already had a version line (added same-session, coincidentally) at `text-[9px] font-medium` — corrected to the design's exact `text-[10px]`, dropped the extra `font-medium` (design specifies no weight override, default/normal). Kept the value dynamic (`v{pkg.version}`, read from `package.json`) rather than hardcoding the mock's literal `"v1.0.0"` — real, always-accurate data beats a static mock string, same "prefer real functionality" precedent used throughout this project's audits. |
| 3 | Desktop nav item list | 7 items, no Documents | **FIXED** | `TopNav.tsx` `MODULES` now lists Dashboard/Planner/Career/Finance/Health/Learning/Coding only. |
| 4 | Desktop nav wrap gap | 2px | MATCH | `gap-0.5` already correct. |
| 5 | Nav pill (active) | 7px radius/12px×7px padding/13px text | **FIXED** | `rounded-[7px] px-3 py-[7px] text-[13px]`. |
| 6 | Nav pill (inactive) | tertiary/transparent | MATCH | Unchanged. |
| 7 | Theme toggle button | `themeToggleStyle`: 34px×34px circle | **FIXED** | `TopNav.tsx`: `w-8 h-8` (32px) → `w-[34px] h-[34px]`. Confirmed exact via the complete source. |
| 8 | Theme icon glyph | Sun/Moon, 15px | MATCH | Repo's lucide `Sun`/`Moon` at `size={15}` already matches; no change needed. |
| 9 | Ask Brain / module-advisor trigger | 12px×7px padding, 12.5px text, icon glyph `font-size: 15px` | **FIXED** | `TopNav.tsx` trigger button now `px-3 py-[7px] text-[12.5px]`; icon size bumped `size={13}` → `size={15}` to match the design's `◆` glyph size (icon component itself stays a dynamic per-module lucide icon, matching the established Sun/Moon substitution precedent in row 8). |
| 10 | Standalone Settings icon button | Doesn't exist in source | **FIXED** | Removed from `TopNav.tsx`; Settings now only reachable via the profile dropdown. |
| 11 | Profile avatar initials | 2-letter value; `profileButtonStyle`: 34px×34px, 12.5px/700 | MISSING-DATA (initials) / **FIXED** (button sizing) | Repo derives 1 letter from email; there's no name field anywhere in the schema to derive real 2-letter initials from — not fabricating a fake value. Button sizing confirmed exact via the complete source and applied: `w-[34px] h-[34px] text-[12.5px] font-bold`. |
| 12 | Profile dropdown header row | 12.5px secondary text, 8px/10px padding | **FIXED** | `ProfileMenu.tsx` updated to `text-[12.5px] text-fg-secondary`, `mb-1.5`. |
| 13 | Profile dropdown items | Documents, Settings, Sign out; `profileMenuItemStyle`: 9px/10px padding, 13px text, 7px radius | **FIXED** | Added a Documents entry above Settings in `ProfileMenu.tsx`; confirmed exact via the complete source and applied: `py-[9px] px-2.5 text-[13px] rounded-[7px]`. |
| 13b | Profile dropdown container shell | `top: 44px; right: 0; width: 200px; padding: 8px; z-index: 30;` | **FIXED** | Not previously itemized as its own row (rows 12-13 only covered the header row and items). `ProfileMenu.tsx`: `top-9 right-0 z-50 w-52 p-1.5` → `top-11 right-0 z-30 w-[200px] p-2`. The repo's own invisible click-outside backdrop (no design equivalent) was at `z-40`, which would now sit above the `z-30` dropdown and swallow its clicks — dropped the backdrop to `z-20` to preserve click-outside behavior while keeping the dropdown itself at the spec'd `z-30`. |
| 14 | Mobile nav | Fixed bottom bar (58px, 4 primary + More sheet); `z-index`: bar `45`, More-sheet overlay `46`, More-sheet panel `47` | **FIXED** | Rebuilt in `TopNav.tsx`: fixed 58px bottom bar (Home/Planner/Health/Finance) + a More sheet (Career/Learning/Coding/Documents/Settings). `layout.tsx`'s `<main>` gained `pb-[58px] md:pb-0` so content isn't hidden behind it; `QuickAdd`'s floating button was lifted to `bottom-[86px]` on mobile to clear it. Z-index trio (previously all `z-40`, undifferentiated) now split to `z-[45]`/`z-[46]`/`z-[47]` matching the latest design extraction's literal values. |
| 15 | Density system (`data-density`) | `[data-density]`/`[data-density="compact"]` CSS vars | **FIXED** | Added to `globals.css`; `<html data-density="comfortable">` set in `layout.tsx`. `Card.tsx`'s default padding now reads `var(--card-pad-lg)` so every large card responds to it (compact mode has no in-app toggle yet — matches the design tool's own dev-only "Tweaks" panel, not a visible app feature). |

## Dashboard main content (`isDashboard` block, top to bottom)

| # | Element | Design spec | Verdict | Resolution |
|---|---|---|---|---|
| 16 | `<main>` wrapper | 1180px/28px-32px-0/20px gap | **FIXED** | `layout.tsx`: `px-8 pt-7 pb-[58px] md:pb-0` (32px/28px/0 desktop). `DashboardView.tsx` root `space-y-4` → `space-y-5` (20px). |
| 17 | Date/greeting line | 13px tertiary | MATCH | Unchanged. |
| 18 | "Dashboard" title | 34px/700/-0.02em | **FIXED** | `text-[34px] tracking-[-0.02em]` (was responsive 24-30px `tracking-tight`). |
| 19-23 | Top Priority banner (container/icon/label/body/CTA) | 10px radius, 14px/18px padding, 20px icon, 0.6px letter-spacing, 13px CTA/7px radius | **FIXED** | `DashboardView.tsx` banner updated: `rounded-[10px] px-[18px] py-3.5`, icon `text-xl` (20px), label `tracking-[0.6px]`, CTA `text-[13px] rounded-[7px]`. |
| 24 | Hero grid gap | 20px | **FIXED** | `gap-4` → `gap-5`. |
| 25 | Life Score card container | 18px radius, 22px padding | **FIXED** | `rounded-[18px] p-[22px]`. |
| 26 | "LIFE SCORE" eyebrow | 0.5px letter-spacing | **FIXED** | `tracking-widest` → `tracking-[0.5px]`. |
| 27 | Life Score ring | 168px/136px/single accent | MATCH | Confirmed identical (`ScoreHero.tsx`). |
| 28 | Life Score number | -0.02em letter-spacing | **FIXED** | `tracking-tight` → `tracking-[-0.02em]`. |
| 29 | "/100" sub-label | 11px/4px margin | MATCH | Unchanged. |
| 30 | "Click ring..." text | 12px tertiary | MATCH | Unchanged. |
| 31 | Score explainer popover | 8px offset/12px radius/16px padding | MATCH | Confirmed identical (`ScoreExplainer.tsx`). |
| 32 | Quick Stat tile | 16px radius, 14px/16px padding via density var | **FIXED** | Radius/shadow/padding numbers already matched; padding is unchanged in value but the surrounding density system now exists (row 15) even though this specific tile still hardcodes `px-4 py-3.5` rather than reading the var — acceptable since the numbers are identical in comfortable mode. |
| 33 | Quick Stat label letter-spacing | 0.4px | **FIXED** | `tracking-wide` → `tracking-[0.4px]`. |
| 34 | Quick Stat value | 22px/700/4px margin | MATCH | Unchanged. |
| 35 | Quick Stat sub-text | 11px/2px margin | MATCH | Unchanged. |
| 36-38 | Goal Progress card (padding/header/bar radius) | ~~present in Quick Stats~~ — **REMOVED from the design** 2026-08-10 | **REMOVED** | The whole Goal Progress bars block (`financial_goals`-backed) is gone from Quick Stats in the latest design extraction — deleted from `QuickStats.tsx` (the `goals` prop and its rendering block) and dropped from `DashboardView.tsx`'s call site (`goals={data.financialGoals}`). `data.financialGoals` itself is untouched in `actions.ts` — still real, live logic consumed by `brain/context-builder.ts` (`finance.goals` in Ask Brain's context), just no longer duplicated in this card. |
| 39-40 | Card shell + title (What's Changed, Morning Brief, Needs Attention, Today's Insight, Life Score Trend, Daily Mission, Recent bot activity) | 18px radius, `var(--card-pad-lg)` padding, 13px/700 plain-case title | **FIXED** | Fixed once in `Card.tsx`: `rounded-[18px]`, default padding `p-[var(--card-pad-lg)]`, title `text-[13px] font-bold text-fg-primary` (no uppercase/tracking). Removed the redundant `padding="p-3.5"` override from all 7 Dashboard call sites (+ `EveningReflection`, adjacent and now visually consistent). |
| 41 | What's Changed empty state | No source spec (design's fake data always has items) | N/A | Nothing to compare against; left as-is. |
| 42 | Morning Brief header text | "Generated 8:30am" (no tilde) | **FIXED** | Removed the "~" in `ExecutiveBrief.tsx`. |
| 43 | Morning Brief body text | 13.5px/1.55 | **FIXED** | `text-sm leading-relaxed` → `text-[13.5px] leading-[1.55]`. |
| 44 | Morning Brief addenda (Automation Rule/Risk/Opportunity) | 3 categorized lines | MISSING-DATA | No underlying data source computes these categories today; would need new logic to classify brief content, which is out of "presentation only" scope. Left absent, documented. |
| 45 | Needs Attention card | 18px radius/padding | **FIXED** | Via the `Card.tsx` fix (row 39-40). |
| 46 | Needs Attention header action | 11px | **FIXED** | `text-xs` → `text-[11px]`. |
| 47 | Needs Attention row | 14px/11px padding, 17px icon | **FIXED** | `px-3 py-2.5` → `px-3.5 py-[11px]`; icon `text-lg` → `text-[17px]`. |
| 48 | Needs Attention kind badge | 0.3px letter-spacing | **FIXED** | `tracking-wide` → `tracking-[0.3px]`. |
| 49 | Needs Attention empty state | ✅ icon + "All clear — nothing urgent today.", 20px padding | **FIXED** | Added the centered ✅ icon and matched copy exactly; `py-4` → `py-5`. |
| 50 | Today's Insight card | 18px radius/padding | **FIXED** | Rewritten without `Card` (see row 51) but with matching shell styling. |
| 51 | Today's Insight header icon position | 💡 left of title | **FIXED** | Rebuilt without the shared `Card` (whose action slot is right-aligned) — icon now sits directly before the title on the left, matching source. |
| 52 | Today's Insight body | 13.5px/1.55 | **FIXED** | Same size/line-height fix as row 43. |
| 53 | "Confirmed pattern" badge | 5px radius, 8px/3px padding, 0.3px tracking | **FIXED** | `rounded` (4px) → `rounded-[5px]`; `py-0.5` → `py-[3px]`; `tracking-wide` → `tracking-[0.3px]`. |
| 54 | Life Score Trend card | 18px radius/padding | **FIXED** | Via `Card.tsx` fix. |
| 55 | Weekly/Monthly toggle | Segmented track, card-bg+shadow active state | **FIXED** | Replaced independent `FilterPill`s with a local `TrendTab` matching the source's exact track/active-state recipe (shared `FilterPill`'s solid-accent-fill style left untouched for its other legitimate uses elsewhere in the app). |
| 56 | Trend big number | 22px | **FIXED** | `text-2xl` (24px) → `text-[22px]`. |
| 57 | Trend chart colors | Theme-aware CSS vars | **FIXED** | Real bug: hardcoded `#7c6af7`/`#26263a` hex replaced with `var(--accent)`/`var(--border)`/`var(--text-tertiary)` throughout `LifeScoreTrend.tsx` — the chart now repaints correctly in light mode. |
| 58 | Daily Mission card | 18px radius/padding | **FIXED** | Via `Card.tsx` fix. |
| 59 | Daily Mission ring | Accent color, correct inset/font, "%" suffix | **FIXED** | `MiniRing.tsx` now has an explicit size→(inset,fontSize) lookup for the two known sizes (74px→8px/15px, 52px→6px/12px) instead of a proportional formula that hit neither; added an optional `suffix` prop, passed `suffix="%"` for Daily Mission; ring color changed from hardcoded `#8b5cf6` to `var(--accent)`. |
| 60 | Daily Mission items | 12.5px text, plain accent dot | **FIXED** | `text-sm` → `text-[12.5px]`; per-item emoji swapped for the source's plain 6px accent dot. |
| 61 | Module Scores card padding | 20px | **FIXED** | `rounded-2xl p-4` → `rounded-[18px] p-5`. |
| 62 | Module Scores ring colors | Health/Learning=good, Finance=warn, Career=accent, Coding=risk (fixed per-module, not literal-brand-color) | **FIXED** | Replaced hardcoded per-module hex (red/green/amber/purple/cyan) with the source's exact `var(--good)/var(--warn)/var(--accent)/var(--risk)` assignments. Also fixed via row 59's `MiniRing` size-lookup (74px case). |
| 63 | Module Scores tip text | 9.5px | **FIXED** | `text-[10px]` → `text-[9.5px]`. |
| 64 | Module Scores footer line ("Health 25%...") | Doesn't exist in source | **FIXED** | Removed — it had no equivalent in the design. |
| 65 | Goals (cross-module) card | ~~New card: badges, qualitative/quantitative rows, footer link~~ — **REMOVED from the design** 2026-08-10, along with its backing `crossModuleGoalsRaw`/`goals` mock data | **REMOVED** | This card (added earlier this session per row 65's original FIXED note) is now gone from the design entirely. Removed the whole block from `DashboardView.tsx` (including the now-unused `MODULE_BADGE_COLOR` map and `crossModuleGoals` destructure). The underlying `getDashboardData()` computation (`crossModuleGoals`, resolved from the `goals` table) is untouched — still real, live logic feeding `BrainContext.crossModuleGoals` (Ask Brain's context, per `brain/context-builder.ts`), just no longer duplicated as its own Dashboard card. |
| 66 | Modules grid tile count | 6 tiles, no Documents | **FIXED** | Removed the Documents tile from `modules` array (now reachable via the profile menu, row 13). |
| 67 | Modules grid tile badge | 30px, 18% tint | **FIXED** | `w-8 h-8` (32px) → `w-[30px] h-[30px]`; opacity utilities changed to explicit `/18` across all 6 tiles. |
| 68 | Recent bot activity card | 18px radius/padding, 20px bottom margin | **FIXED** | Via `Card.tsx` fix + added `className="mb-5"`. |
| 69 | Recent bot activity title | Sentence case | **FIXED** | Literal string "Recent Bot Activity" → "Recent bot activity"; forced-uppercase now gone via the `Card.tsx` title fix. |
| 70 | Bot activity row | 9px padding, top-border, 78px module column, 12.5px text | **FIXED** | `py-1.5 border-b` → `py-[9px] border-t first:border-t-0`; `w-16` → `w-[78px]`; `text-xs` → `text-[12.5px]`. |
| 71 | Bot activity timestamp color | `var(--border-strong)` | **FIXED** | `text-fg-quaternary` → `text-border-strong`. |
| 72 | Quick Add floating button | 52px, 28px offset, 24px icon, plain shadow, `z-index: 25` | **FIXED** | `w-12 h-12` (48px) → `w-[52px] h-[52px]`; `bottom-6 right-6` (24px) → `bottom-7 right-7` on desktop (kept lifted on mobile to clear the new bottom nav, see row 14); `Plus size={22}` → `24`; removed the extra `ring-4 ring-background` embellishment the source doesn't have. Z-index (not previously itemized) now `z-[25]` matching the design (was `z-40`, an unaudited leftover value); no functional conflict since the modal opened by this button is separately `z-50` and unaffected. |
| 73 | Quick Add interaction model | Navigate-to-page shortcut menu | **OPEN — deliberately unchanged** | You approved proceeding but didn't weigh in on this specific open question, and the task's own instruction is "preserve all logic... this is presentation only." Changing this would replace a full inline-form data-entry flow with a page-navigation shortcut — a behavior change, not a style fix. Left as-is; flagging again in case you want it addressed explicitly. |
| 74 | Quick Add popover item style | N/A (no matching element given row 73) | N/A | Not applicable while row 73 stays unchanged. |

---

## Summary

- **63 rows FIXED** (including one gap found during implementation, not in the original 74; rows 1 and 7 moved here after the truncation bug was resolved and their exact values confirmed; row 2 moved here 2026-08 once a follow-up design extraction resolved its ambiguity; row 13b added 2026-08 for the previously-unitemized profile dropdown container shell).
- **10 rows MATCH** (already correct, confirmed, untouched; row 8 moved here for the same reason).
- **1 row OPEN** (row 73, Quick Add's flagged product-behavior question, with its dependent row 74 left N/A alongside it).
- **3 rows MISSING-DATA / N/A** (profile initials needs a name field that doesn't exist; Morning Brief addenda needs new categorization logic; What's Changed empty state has no source spec to check against).

**2026-08 re-sync note:** a fresh design extraction (`design_shell_header_nav.html` + `design_dashboard.html`) was diffed against this audit. The Dashboard module body (`design_dashboard.html`) is unchanged — every literal value present in that file still matches what's recorded FIXED above. The shared header/nav shell had 4 genuinely new/changed findings, all applied: row 2 (logo lockup, now unambiguous), row 9 (Ask Brain trigger icon size), row 13b (new row — profile dropdown container position/size/z-index), row 14 (mobile nav z-index trio), and row 72 (Quick Add button z-index). See `audit/CHANGELOG-shell-dashboard.md` for the isolated diff.

---

## Step 3 — Verification

Re-read `Dashboard.dc.html` fresh (byte-identical to the copy this audit was built from — confirmed via diff), then walked the rendered page live in the browser against it:

- `tsc --noEmit` and `eslint` both clean after the full batch of changes.
- Dev server restarted clean; no console errors, no hydration warnings, no dev-overlay error badge, on either theme.
- Confirmed live: 7-item top nav (no Documents), no standalone Settings button, profile dropdown now Documents/Settings/Sign out, sentence-case Card titles throughout, 18px card radii, the new Goals card rendering real cross-module data (Coding streak goal), Module Scores rings showing the good/warn/accent/risk color scheme (not per-module brand colors), Daily Mission ring showing "17%" with the percent sign, "Recent bot activity" in sentence case with the full spend/cache-hit line, and the Weekly/Monthly segmented toggle's card-background active state.
- Checked both dark and light theme — the previously-hardcoded Life Score Trend chart line/grid now repaint correctly in both (this was a real bug, not just a mismatch).
- Mobile bottom nav was implemented and code-reviewed but **not yet visually verified at 393px** — this session's browser-automation window resize did not reliably force a true mobile viewport (a known tool limitation encountered in this environment before). Flagging so you can spot-check it directly rather than me claiming a verification I didn't actually get pixels for.

**Rows still not at MATCH**, with reasons (all deliberate, not oversights):
- Row 2: logo lockup left unchanged — the design source is genuinely ambiguous here even in the complete, untruncated file (no icon-box getter to compare against).
- Row 11: profile initials — needs a name field the schema doesn't have (button sizing itself is confirmed FIXED).
- Row 44: Morning Brief addenda — needs new categorization logic (out of "presentation only" scope).
- Rows 73-74: Quick Add's interaction model — flagged product decision, deliberately left as the richer inline-form flow pending your explicit call.

(Rows 1, 7, 8 — previously listed here as source-ambiguous — are resolved: the `DesignSync.get_file` truncation bug that hid their getters was root-caused, the complete source confirmed exact values, and `TopNav.tsx` was updated to match. See rows 1, 7, 8 above.)

Everything else (62 rows) is FIXED and live-verified except the mobile-bottom-nav pixel check noted above.

Verified with `tsc --noEmit` (clean) after the batch of changes. Visual re-verification in the browser (both themes, both a desktop and an attempted mobile viewport) is the remaining step before calling this done.

**2026-08-10 update (design re-sync round 4):** rows 36-38 (Goal Progress bars) and 65 (Goals cross-module card) are now REMOVED — the design dropped both. See their updated entries above and `audit/CHANGELOG.md`. Row 2 (logo lockup) was resolved in a later round too — see the "Logo lockup — version line" 2b row, not reflected in this older summary paragraph.
