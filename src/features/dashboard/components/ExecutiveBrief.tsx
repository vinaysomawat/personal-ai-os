import Card from '@/components/Card'
import FormattedText from '@/components/FormattedText'
import type { Risk, Opportunity } from '@/features/brain/risk-opportunity-engine'

interface ExecutiveBriefProps {
  brief: string | null
  automationRules: string[]
  risks: Risk[]
  opportunities: Opportunity[]
}

// Executive Dashboard's Morning Brief (Phase 4 PRD). Decision Queue and Goal
// Progress used to live here too, but the Daily Operating System redesign
// (Phase 5 PRD) consolidated Decision Queue into Needs Attention
// (NeedsAttention.tsx) and Goal Progress into the Quick Stats widget
// (QuickStats.tsx) rather than showing the same information across
// multiple cards — see DashboardView.tsx for the current layout.
//
// The addenda strip (added 2026-08-18, per the Claude Design source) surfaces
// the single top Automation Rule / Risk / Opportunity as a compact highlights
// line below the AI paragraph — reusing the same already-fetched, already-
// deterministic data Needs Attention renders in full below, not a new query
// or AI call (Product Principle 2/3). Automation rule text already carries
// its own leading emoji from computeAutomationRules; stripped here since the
// design's generic ⚙️ icon takes its place in this compact row.
export default function ExecutiveBrief({ brief, automationRules, risks, opportunities }: ExecutiveBriefProps) {
  const addenda = [
    automationRules[0] && { icon: '⚙️', label: 'Automation Rule', text: automationRules[0].replace(/^\S+\s*/, '') },
    risks[0] && { icon: '⚠️', label: 'Risk', text: risks[0].text },
    opportunities[0] && { icon: '🚀', label: 'Opportunity', text: opportunities[0].text },
  ].filter((x): x is { icon: string; label: string; text: string } => !!x)

  return (
    <Card title="Morning Brief" action={brief && <span className="text-[10.5px] text-fg-tertiary">Generated 8:30am</span>}>
      {brief ? (
        <>
          <p className="text-[13.5px] leading-[1.55] text-fg-secondary"><FormattedText text={brief} /></p>
          {addenda.length > 0 && (
            <div className="flex flex-col gap-[7px] mt-3 pt-3 border-t border-border">
              {addenda.map(a => (
                <div key={a.label} className="flex gap-2 text-xs text-fg-secondary leading-[1.4]">
                  <span className="shrink-0">{a.icon}</span>
                  <span><span className="font-semibold text-fg-primary">{a.label}:</span> {a.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-fg-tertiary">Not generated yet — check back after this morning&apos;s briefing (~8:30am IST).</p>
      )}
    </Card>
  )
}
