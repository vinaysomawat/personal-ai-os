// Shared recharts config every chart component reads from, instead of
// re-declaring the same string literals per component. Colors/fonts always
// come from the existing CSS-var token layer (globals.css), never hardcoded
// hex, so every chart repaints correctly in both themes — see
// audit/CHARTS-AUDIT.md for the design-fidelity pass this was built for.

export const CHART_GRID_STROKE = 'var(--border)'
export const CHART_AXIS_TICK = { fill: 'var(--text-tertiary)', fontSize: 10 }
export const CHART_TOOLTIP_CLASS = 'bg-surface-2 border border-surface-3 rounded-lg px-2.5 py-1.5 text-xs'

// General-purpose 5-color chart palette. These CSS vars already existed in
// globals.css (added for shadcn/chart-tooling infra) but had zero real
// consumers before this pass — the design's Spending History pie uses
// hex values byte-identical to this exact palette (see CHARTS-AUDIT.md §5),
// so this is now the one chart palette every chart in the app draws from.
const CHART_COLORS =['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const

// Finance's Spending History pie/legend — the design's exact 5-category
// color assignment (categoryColors in Dashboard.dc.html), each hex value
// mapped to its byte-identical --chart-N token. Any category not in this
// list falls back to a neutral tone, matching the design's own fallback.
export const FINANCE_CATEGORY_CHART_COLOR: Record<string, string> = {
  Housing: CHART_COLORS[0],
  Bills: CHART_COLORS[1],
  Transport: CHART_COLORS[2],
  Food: CHART_COLORS[3],
  Entertainment: CHART_COLORS[4],
}
export const FINANCE_CATEGORY_CHART_FALLBACK = 'var(--border-strong)'
