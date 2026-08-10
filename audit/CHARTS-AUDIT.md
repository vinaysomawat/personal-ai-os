# Charts Audit — design's chart markup vs. repo (recharts)

## 0. Library & design source

- **Chart library**: `recharts` `^3.9.1` (`package.json`), already the sole charting dependency app-wide (no D3, no Chart.js, no Canvas-based charting).
- **Design source read in full**: `Dashboard.dc.html` (single `.dc.html`, all modules inline) + `support.js`. `support.js` is confirmed to be pure `dc-runtime` infrastructure (template parsing, React glue, editor canvas-background helpers) — grepped for `chart|svg|d3|canvas` and found **zero chart-rendering logic**; it contributes nothing to chart specs.
- **The design itself is not built with a chart library.** There is exactly **one `<svg>` element in the entire template** (Dashboard's Life Score Trend — hand-written `<path>`/`<line>`/`<circle>` elements driven by literal coordinate math in the component's JS). Every other "chart" in the design — Finance's Spending History bar chart and category pie — is plain CSS: `<div>` bars sized by inline `height: N%`, and a pie rendered as a single `<div>` with a CSS `conic-gradient(...)` background. There is no canvas, no third-party chart embed anywhere.
- **Chart instances found in the design**: exactly 2 screens contain chart-like elements — Dashboard (Life Score Trend, 1 SVG line+area chart) and Finance (Spending History, 1 CSS bar chart + 1 CSS conic-gradient pie + a text legend). **Health has no chart element anywhere in its `isHealth` block** — grepped the full section, zero `<svg>`, zero `Trend`, zero `chart` — despite the repo having a `HealthTrend.tsx` (recharts line chart). This is a real, working feature with no design counterpart at all (see §4 below), not a fidelity gap to fix against a spec that doesn't exist.
- **3 chart *instances* to audit** (per the task's "one section per instance" instruction): Dashboard Life Score Trend, Finance Spending History Bar, Finance Spending History Pie+Legend. Health Trend gets its own section documenting the "no design counterpart" finding and the one real bug found in it (hardcoded hex colors breaking light theme).

Status legend: **MATCH** (verified equal) / **MISMATCH** (design specifies a different value) / **MISSING** (design specifies something absent from the repo) / **UNSPECIFIED** (design's mock has no opinion — real functionality kept, not invented) / **N/A** (design has no such feature to compare, e.g. no legend on a single-series chart).

---

## 1. Dashboard — Life Score Trend (`src/features/dashboard/components/LifeScoreTrend.tsx`)

Design source: `Dashboard.dc.html` lines 239–268 (template) + `renderVals()` lines 2525–2558 (JS, `this` = the design's root component).

| Property | Design value | Current impl | Verdict | Fix |
|---|---|---|---|---|
| Container: card padding | `var(--card-pad-lg)` (Card wrapper) | `var(--card-pad-lg)` via `<Card>` | MATCH | — |
| Container: chart width | `width: 100%` | `<ResponsiveContainer width="100%">` | MATCH | — |
| Container: chart height | `110px` (`<svg style="height:110px">`) | `h-40` = 160px | **MISMATCH** | Set container to `110px`. |
| Container: aspect/responsive | `preserveAspectRatio="none"` on a `viewBox="0 0 300 100"` — the chart **stretches/distorts** to fill the container width, coordinate space is a fixed 300×100 unit box, not aspect-locked | recharts `ResponsiveContainer` naturally stretches width, height is fixed by the wrapper `div` — behaviorally equivalent once height is corrected | MATCH (once height fixed) | — |
| Container: margins (chart area) | none specified beyond the svg itself; `pad = 6` is an *internal* coordinate inset (see plot area) | `margin={{ top: 8, right: 8, bottom: 0, left: 0 }}` | **MISMATCH** | Design has no outer chart margin — the 6px inset is baked into the y-coordinate math, not a recharts margin. Set `margin={{ top: 0, right: 0, bottom: 0, left: 0 }}` and replicate the 6-unit vertical inset via the Y domain padding (see below). |
| Plot area: inner padding | `pad = 6` (out of 100 units, i.e. 6% top/bottom) applied only to the **y** axis — x spans the full 0–300 width edge-to-edge | No y-domain padding; `YAxis domain={[0,100]}` fixed, no percentage inset | **MISMATCH** | Use a domain padding of 6% of the data's own range on each side (see Y-axis row). |
| X-axis: shown/hidden | Hidden — no axis line, no ticks; just plain `<div>` text labels below the SVG (`trendLabels`, flex `justify-between`, `margin-top: 8px`) | `<XAxis>` rendered **with** `axisLine={{stroke:'var(--border)'}}` and real tick rendering | **MISMATCH** | Remove the visible axis line; render labels as plain flex row below the chart (or keep `<XAxis axisLine={false} tickLine={false}>` styled to look identical — either is visually equivalent, chose axisLine={false} to stay within one chart component). |
| X-axis: tick values (weekly) | `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']`, one label per of the 7 data points | Formats each point's real `date` via `toLocaleDateString` (day/month) | **MISMATCH** | Weekly labels must be literal weekday abbreviations, not calendar dates — derive weekday name from each point's actual date instead of a static array (keeps it correct for whatever 7 real days are shown, rather than hardcoding Sun–Sat which assumes the week always starts Sunday). |
| X-axis: tick values (monthly) | 7 fixed captions `['1','6','11','16','21','26','30']` — **day-of-month numbers, not evenly matched 1:1 to the 30 data points** (design shows 30 data points but only 7 caption labels, evenly spaced under the chart) | `interval={4}` on a real `XAxis` — recharts computes which of the 30 real dates to show at that interval, formatted as "Mon Day" | **MISMATCH** | Monthly view shows 7 evenly-spaced plain captions (not tied 1:1 to data ticks) — same "labels are decorative, not real axis ticks" pattern as the bar chart's month labels. Render as a separate flex row of 7 evenly-spaced strings under the chart rather than relying on recharts' XAxis interval sampling. |
| X-axis: font/color | `10px`, `var(--text-tertiary)` | XAxis tick `fontSize: 11`, `fill: var(--text-tertiary)` | **MISMATCH** | `10px`. |
| X-axis: axis title | none | none | MATCH | — |
| Y-axis: shown/hidden | **Fully hidden** — no `<line>`, no tick marks, no numeric labels anywhere in the SVG or template | `<YAxis>` rendered with visible tick labels `[0, 50, 100]` | **MISMATCH** | Remove the Y-axis entirely (no numbers beside the chart). |
| Y-axis: domain min/max | **Dynamic per-series**: `trendMin = Math.min(...trendScores)`, `trendMax = Math.max(...trendScores)`, `trendRange = Math.max(1, trendMax-trendMin)` — i.e. the visible series always stretches to fill the full vertical space between its own min and max (not a fixed 0–100 scale) | `domain={[0, 100]}` fixed | **MISMATCH — significant.** A score swinging 68–88 currently renders as a nearly-flat line near the upper-middle of a 0–100 box; the design makes the same data fill the whole chart height, visually amplifying real trend detail. | Compute `[min, max]` from the currently-displayed series each render and pass as the domain, with the 6-unit-of-100 (≈6%) padding on each side that `pad=6` represents. |
| Y-axis: zero included | No — domain is data-driven, not zero-anchored | Yes — domain forced to `[0,100]` | **MISMATCH** | Covered by the domain fix above. |
| Grid: horizontal | Exactly 3 lines at `y=0`, `y=50`, `y=100` (i.e. top/middle/bottom of the fixed 100-unit coordinate box — **positional**, not tied to any data value or axis tick), `stroke: var(--border)`, `stroke-width: 1` | `<CartesianGrid vertical={false}>` — ties its 3 lines to the `YAxis`'s `ticks={[0,50,100]}`, which (once the domain fix above lands) will no longer be 0/50/100 | **MISMATCH** | The 3 gridlines must stay at the fixed top/mid/bottom of the chart box regardless of data domain — draw them as 3 literal `<line>`/`<ReferenceLine>` elements at fixed pixel/percent positions, not as CartesianGrid ticks (which will move once the Y domain becomes dynamic). |
| Grid: vertical | None | None (`vertical={false}`) | MATCH | — |
| Grid: dash pattern / opacity | Solid, full opacity (no `stroke-dasharray`, no opacity property) | Solid (recharts default) | MATCH | — |
| Series: line color | `stroke: var(--accent)` | `stroke="var(--accent)"` | MATCH | — |
| Series: line width | `stroke-width: 2` | `strokeWidth={2}` | MATCH | — |
| Series: line curve type | **Linear** — path is built from literal `M`/`L` commands only (`trendCoords.map(...'M'/'L'...)`), i.e. straight segments between points, no bezier/spline smoothing | `type="monotone"` (smoothed curve) | **MISMATCH** | `type="linear"`. |
| Series: stroke-linecap | Unspecified (SVG default `butt`) | `strokeLinecap="round"` | **MISMATCH** | Remove the explicit `round` linecap (or set `"butt"`) to match the unstyled default the design's raw `<path>` gets. |
| Series: area fill | **Present** — `trendAreaPath` (`{{ trendAreaPath }}`) closes the line path down to the chart's bottom-left/bottom-right corners, filled `var(--accent-soft)`, no stroke | **Missing entirely** — `LifeScoreTrend.tsx` renders a bare `<LineChart>`, no `<Area>`/fill layer at all | **MISSING — significant.** | Switch to recharts `<AreaChart>` (or add an `<Area>` alongside `<Line>`) with `fill="var(--accent-soft)" stroke="none"`. |
| Series: point markers — shown when | **Weekly only** (`sc-if value="{{ isTrendWeekly }}"`) — monthly view has **zero** point markers, only the line+area | `dot={false}` always; only an `activeDot` appears on hover, in *both* weekly and monthly views | **MISMATCH** | Dots must be persistently visible in weekly view (not hover-gated) and never rendered in monthly view. |
| Series: point marker style | `r=3`, `fill: var(--accent)`, `stroke: var(--card)`, `stroke-width: 1.5` | `activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2 }}` (hover-only, and the persistent-dot case doesn't exist) | **MISMATCH** | `r=3`, `strokeWidth=1.5`, always-on in weekly (via `dot={{r:3, fill:'var(--accent)', stroke:'var(--card)', strokeWidth:1.5}}` conditionally per range). |
| Legend | None (single series) | None | N/A | — |
| Tooltip | **None specified anywhere** — the static mock has no hover-state markup at all for this chart | Custom `<Tooltip>` with a styled box, shown on hover | UNSPECIFIED — real interactivity a static mock can't represent | **Kept** — same "real functionality beyond the mock" precedent used throughout this project's audits (e.g. `DECIDE-TAB-AUDIT.md`). Not removed. |
| Labels (data labels on points) | None | None | MATCH | — |
| Formatting: score value | Whole number, no decimals, no unit (`{{ lifeScore }}` / raw `score` ints) | Whole numbers already (Life Score is always an int) | MATCH | — |
| Formatting: delta label | `"{+/-}{N} vs. last Sunday"` (weekly) / `"{+/-}{N} vs. 30 days ago"` (monthly) | `"{+/-}{N} vs. last week"` (weekly) / `"{+/-}{N} vs. 30 days ago"` (monthly) | **MISMATCH (weekly only)** | Weekly copy must say **"vs. last Sunday"**, not "vs. last week". |
| Formatting: delta color | `var(--good)` if >0, `var(--risk)` if <0, `var(--text-tertiary)` if 0 | `text-green-400` / `text-red-400` / `text-fg-tertiary` (Tailwind utility classes, not the `--good`/`--risk` tokens) | **MISMATCH (token identity)** | Switch to `var(--good)`/`var(--risk)` (or their Tailwind `text-good`/`text-risk` aliases) instead of the hardcoded `green-400`/`red-400` utility classes, for exact token parity. |
| Segmented toggle: track | `gap: 4px`, `background: var(--surface-2)`, `border-radius: 8px`, `padding: 3px` | `gap-1` (4px), `bg-surface-2`, `rounded-lg` (8px), `p-[3px]` | MATCH | — |
| Segmented toggle: button (active) | `background: var(--card)`, `color: var(--text-primary)`, `box-shadow: 0 1px 2px var(--shadow-sm)`, `border-radius: 6px`, `padding: 5px 11px`, `font-size: 11.5px`, `font-weight: 600` | `bg-surface-1 text-fg-primary shadow-[0_1px_2px_var(--shadow-sm)]`, `rounded-md` (6px), `px-[11px] py-[5px]`, `text-[11.5px] font-semibold` | MATCH (`bg-surface-1` ≡ `var(--card)` in this app's token aliasing) | — |
| Segmented toggle: button (inactive) | `background: transparent`, `color: var(--text-tertiary)` | `bg-transparent text-fg-tertiary` | MATCH | — |
| Motion: entry animation | None specified | recharts default mount animation (implicit, not explicitly configured) | **MISMATCH (implicit default)** | Set `isAnimationActive={false}` on `Area`/`Line` — an unspecified default is not an acceptable stand-in per the ground rule, and this project already disables Pie's entry animation for the same "no spec = no animation" reasoning (`SpendingHistory.tsx`). |
| Motion: hover transition | Unspecified (no hover state in the mock at all) | recharts default active-dot transition | UNSPECIFIED | Left as-is — real interactivity, no spec to contradict. |
| States: empty/loading/error | Not depicted (single static mock state) | `points.length < 2` → a text fallback message | UNSPECIFIED | Kept — real handling for a real edge case the mock doesn't show. |
| States: single data point | `trendScores.length === 1 ? 0 : ...` — pins x to 0, degenerates to a single point at the left edge (no line/area to render) | Not directly reachable (`points.length < 2` fallback covers 0–1 points) | N/A | Already handled equivalently via the empty-state fallback. |

---

## 2. Finance — Spending History Bar Chart (`src/features/finance/components/SpendingHistory.tsx`)

Design source: `Dashboard.dc.html` lines 758–771 (template) + `renderVals()` lines 2989–2996 (JS).

| Property | Design value | Current impl | Verdict | Fix |
|---|---|---|---|---|
| Container: height | `height: 100px` (flex row) | `h-36` = 144px | **MISMATCH** | `100px`. |
| Container: layout | `display:flex; align-items:flex-end; gap:6px` — 12 equal-width (`flex:1`) bars, growing bottom-up | recharts `<BarChart>` auto-lays-out bars; gap not explicitly set | **MISMATCH** | Set `barCategoryGap` explicitly (see Series row) rather than relying on recharts' unspecified default spacing. |
| Container: margins | None specified | `margin={{ top: 8, right: 0, bottom: 0, left: 0 }}` | **MISMATCH** | `margin={{ top: 0, right: 0, bottom: 0, left: 0 }}` — design has zero chart-area margin (labels live in a fully separate flex row below, not inside the chart's own margin box). |
| Axes: X shown/hidden | Hidden — **no `<XAxis>`-equivalent at all**; the 12 month labels are a fully separate `<div>` flex row below the bars (`display:flex; gap:6px; margin-top:4px`, each label `flex:1; text-align:center`), not an axis | `<XAxis>` rendered **with a visible axis line** (`axisLine={{stroke:'var(--border)'}}`) | **MISMATCH** | `axisLine={false}`. |
| Axes: X tick font/color | `9.5px`, `var(--text-tertiary)`, `text-align: center` | `fontSize: 10`, `fill: 'var(--text-tertiary)'` | **MISMATCH** | `9.5px`. |
| Axes: X tick values | All 12 months shown (`monthLabels`, one per bar) | `interval={1}` — skips every other label, showing only 6 of 12 | **MISMATCH** | `interval={0}` — design shows a label under every single bar, not every other one. |
| Axes: Y | None — no axis, no ticks, no numeric labels anywhere near the bar chart | No `<YAxis>` rendered (implicit, domain unset) | **MISMATCH (implicit domain)** | Add an explicit hidden `<YAxis hide domain={[0, 'dataMax']} />` — design scales bars to the *exact* max of the 12 values (`Math.round((v/maxMonthlySpend)*100)`) with **zero headroom**; recharts' unset/implicit domain applies its own "nice round number" padding above the max by default, which is a silent mismatch the ground rule explicitly disallows relying on. |
| Axes: domain — zero included | Yes (bars grow from a `0%` baseline) | Implicit `[0, auto]` in practice (bars already start at 0 visually) | MATCH once the explicit domain above is set | — |
| Grid: horizontal/vertical | **None at all** — no gridlines anywhere in the bar chart's markup | `<CartesianGrid vertical={false}>` renders horizontal gridlines | **MISMATCH** | Remove `<CartesianGrid>` entirely for this chart. |
| Series: bar width / gap | 12 equal-`flex:1` bars, `gap: 6px` between them, full container height as growth ceiling | Not explicitly set (recharts default `barCategoryGap="10%"`) | **MISMATCH (implicit default)** | Set `barCategoryGap` explicitly — recharts can't express a literal `6px` flex gap identically across arbitrary container widths, so this is approximated as a percentage-based gap tuned to look equivalent at typical card widths; noted as a library-expressiveness gap per the ground rule's escape-hatch instruction. |
| Series: bar corner radius | `border-radius: 3px 3px 0 0` (top corners only) | `radius={[3, 3, 0, 0]}` | MATCH | — |
| Series: bar fill (selected month) | `var(--accent)` | `fill="var(--accent)"` via `<Cell>` | MATCH | — |
| Series: bar fill (other months) | `var(--border-strong)` | `fill="var(--border)"` (wrong token — one shade too light) | **MISMATCH** | `var(--border-strong)`. |
| Series: transition | `transition: background 0.15s` on color change (click-to-select) | No explicit transition set on `<Cell>` fill | **MISMATCH (minor)** | Not straightforwardly expressible per-cell in recharts without a custom shape; noted as a library-expressiveness gap, left unfixed (cosmetic, sub-perceptible for a color swap this fast). |
| Legend | None | None | N/A | — |
| Tooltip | **None specified** — no hover markup anywhere for this chart in the static mock | Custom `<Tooltip>` box on hover, plus a `cursor` highlight fill | UNSPECIFIED — real interactivity beyond the mock | **Kept.** |
| Formatting: currency | `₹{value.toLocaleString('en-IN')}` (used in the tooltip/labels elsewhere in this card, e.g. `historyMonthTotal`) | `fmt()` uses `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})` — equivalent formatted output | MATCH | — |
| Motion: entry animation | Unspecified | recharts default bar-grow-in animation (implicit) | **MISMATCH (implicit default)** | `isAnimationActive={false}` — same "no spec = disable, don't guess" reasoning as the Life Score Trend chart. |
| States: empty | Not depicted | Not explicitly handled (12 months always render, zero-value bars just render at 0% height) | N/A | No fix needed — same graceful zero-height behavior the design's own `%`-based math already produces for a 0 value. |

---

## 3. Finance — Spending History Pie + Legend (same component)

Design source: `Dashboard.dc.html` lines 776–787 (template) + lines 2967–3011 (JS, `budgetCategoriesRaw`/`categoryColors`/`pieSegments`/`pieLegend`).

| Property | Design value | Current impl | Verdict | Fix |
|---|---|---|---|---|
| Container: size | `width: 128px; height: 128px` | `w-32 h-32` = 128px × 128px | MATCH | — |
| Shape: donut vs. solid pie | **Solid pie — no hole.** It's a literal `conic-gradient` circle; there is no `border-radius`-punched center, no inner-radius concept anywhere in the CSS | `<Pie innerRadius={30} outerRadius={54}>` — a **donut** with a real hole | **MISMATCH — significant.** | `innerRadius={0}` (or omit it) — design specifies a filled pie, not a donut. |
| Series: segment gap (padding angle) | **None** — `pieSegments` are strictly contiguous cumulative percentages (`pieCursor` to `pieCursor + pct`, no gap inserted between stops) | `paddingAngle={2}` | **MISMATCH** | `paddingAngle={0}`. |
| Series: stroke | None (`conic-gradient` has no border concept) | `strokeWidth={0}` | MATCH | — |
| Series: fill per segment | Fixed 5-category lookup: `{ Food: '#f59e0b', Housing: '#7c6af7', Transport: '#60a5fa', Bills: '#34d399', Entertainment: '#f87171' }`, **fallback `var(--border-strong)`** for any other category | `CATEGORY_CHART_COLOR` — 11 categories, mostly *different* hardcoded hex (`Food:'#f97316'`, `Housing:'#a855f7'`, `Transport:'#3b82f6'`, `Bills:'#6366f1'`, etc. — none of these match the design's 5 values) and fallback `'#94a3b8'` (hardcoded hex, not a token) | **MISMATCH — every one of the 5 named colors is wrong**, plus the fallback isn't a token | See §5 (tokens) — the design's 5 hex values are byte-identical to this repo's existing `--chart-1..5` tokens, just under a different name→token assignment. Rebuild the map as `{ Food: 'var(--chart-4)', Housing: 'var(--chart-1)', Transport: 'var(--chart-3)', Bills: 'var(--chart-2)', Entertainment: 'var(--chart-5)' }`, fallback `var(--border-strong)`. |
| Legend: shown/hidden | Shown | Shown | MATCH | — |
| Legend: position | Beside the pie, `gap: 24px`, wraps on narrow viewports (`flex-wrap: wrap`) | `gap-6` (24px), `flex-wrap` on the parent row | MATCH | — |
| Legend: marker shape | **Rounded square** — `width: 9px; height: 9px; border-radius: 3px` | `w-2 h-2 rounded-full` — a circle, 8px | **MISMATCH (shape and size)** | `w-[9px] h-[9px] rounded-[3px]`. |
| Legend: marker fill | Same 5-category/fallback map as the pie segments | Same `CATEGORY_CHART_COLOR ?? FALLBACK_COLOR` (same wrong values as above) | **MISMATCH** | Fixed alongside the pie's color map (single shared object). |
| Legend: row layout | `name` (flex:1) → `amount` → `pct` (`width:32px; text-align:right`), `gap:8px`, font `12.5px`, color `var(--text-secondary)` for name/amount, `var(--text-tertiary)` for pct | `flex-1 truncate` name, amount, `w-8 text-right` pct (32px), `gap-2` (8px), `text-[12.5px]`, `text-fg-secondary` name/amount, `text-fg-tertiary` pct | MATCH | — |
| Legend: value format | `₹{spent.toLocaleString('en-IN')}` | `fmt(c.value)` → `Intl.NumberFormat('en-IN', currency)` | MATCH | — |
| Legend: pct format | `Math.round((spent/total)*100)` — whole-number percent | `pct.toFixed(0)` — whole-number percent | MATCH | — |
| Legend: item cap | Not evidenced either way — the mock's own data only ever has 5 categories, so there's no signal on where a longer list would truncate | `.slice(0, 6)` | UNSPECIFIED | Kept — real months can have more than 5 active categories; a reasonable cap, not contradicted by the mock. |
| Tooltip | None specified for the pie | Custom `<Tooltip>` on hover | UNSPECIFIED | **Kept** — same precedent as the other two charts. |
| Motion | Unspecified | `isAnimationActive={false}` already set, with an inline comment explaining *why* (recharts 3's Pie entry animation never resolves under `ssr:false` lazy-mount — a real bug workaround, not a design-fidelity choice) | MATCH (coincidentally already correct, for an unrelated reason) | — |
| States: empty | `sc-if`-gated in the design only implicitly (design always has 5 categories in its mock data) | `categoryBreakdown.length === 0` → text fallback | UNSPECIFIED | Kept. |

---

## 4. Health — Health Trend (`src/features/health/components/HealthTrend.tsx`) — no design counterpart

The design's `isHealth` block (full section grepped) contains **zero** chart elements — no `<svg>`, no `Trend`, no per-metric weekly/monthly toggle, nothing. `HealthTrend.tsx` is real, working functionality (weight/calories/protein/steps trend, Weekly/Monthly toggle) that the static mock simply never depicts. Per this project's established precedent (`DECIDE-TAB-AUDIT.md` et al.), **this is not audited against a spec that doesn't exist** — nothing here is MISMATCH or MISSING relative to the design, because there is no design row to compare against.

**One real bug found and fixed anyway**, independent of the design question, because it falls squarely under the token-layer requirement (§3 of the task) and this pass is already building the shared chart theme module every chart should read from:

| Issue | Current | Fix |
|---|---|---|
| Grid/axis colors hardcoded as literal hex, not CSS vars | `const GRID = '#26263a'`, `AXIS_TEXT = '#64748b'`, `SURFACE = '#16161d'` — these are the **dark-theme** values for `--border`/`--text-tertiary`/`--card`, hardcoded, so the chart silently stops repainting correctly in light mode (unlike `LifeScoreTrend.tsx`, which already correctly uses `'var(--border)'` etc. as literal CSS var strings) | Replace with the same CSS-var-string pattern already used everywhere else in this codebase's charts, sourced from the new shared chart theme module. |
| Per-metric series colors hardcoded as literal hex | `weight_kg:'#7c6af7'`, `calories:'#f97316'`, `protein_g:'#22c55e'`, `steps:'#06b6d4'` — arbitrary one-off hex values, not tied to any token | Remap to the existing `--chart-1..5` token set (already used for Finance's pie, now formalized as this app's general-purpose chart palette) so all 4 series repaint correctly across themes and stay visually consistent with the rest of the app's charts. |

---

## 5. Token layer

The design's 5 pie-chart category colors (`categoryColors` in `renderVals()`) are:

| Category | Design hex | Existing token | Value match |
|---|---|---|---|
| Housing | `#7c6af7` | `--chart-1` (dark) | ✓ exact |
| Bills | `#34d399` | `--chart-2` (dark) | ✓ exact |
| Transport | `#60a5fa` | `--chart-3` (dark) | ✓ exact |
| Food | `#f59e0b` | `--chart-4` (dark) | ✓ exact |
| Entertainment | `#f87171` | `--chart-5` (dark) | ✓ exact |

**No new tokens needed** — `globals.css` already carries `--chart-1` through `--chart-5` (added for shadcn/chart-tooling infrastructure per `audit/TOKENS.md`, previously unused by any actual chart in the app) with byte-identical dark-theme values to every one of the design's 5 named category colors. The design just never got formally *wired* to them — this pass is the first real consumer. The light-theme `--chart-1..5` values are a separately-curated, already-coherent light-mode palette (the design's mock has no light-mode equivalent to compare against, since its category-color object is theme-agnostic literal hex); reusing them as-is is the correct call rather than inventing a second light palette.

`HealthTrend.tsx`'s 4 series colors are remapped onto `--chart-1..5` too (see §4) — not a design requirement (no design chart exists to specify it), but keeps every chart in the app drawing from the same one token set per the task's overall intent, rather than leaving a second, disconnected hardcoded palette in place right next to the newly-fixed one.

---

## 6. Shared chart theme module

New file: `src/lib/chart-theme.ts` — exports the small set of values every chart component reads instead of repeating string literals: grid stroke, axis tick font-size/fill, tooltip box styling, the 5-slot chart color palette (mapped to `--chart-1..5`), and the Finance category→color lookup. Fixes are applied by importing from this module rather than re-declaring `'var(--border)'` etc. per component.
