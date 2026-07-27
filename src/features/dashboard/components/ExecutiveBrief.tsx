import Card from '@/components/Card'

// Executive Dashboard's Morning Brief (Phase 4 PRD). Decision Queue and Goal
// Progress used to live here too, but the Daily Operating System redesign
// (Phase 5 PRD) consolidated Decision Queue into Needs Attention
// (NeedsAttention.tsx) and Goal Progress into the Quick Stats widget
// (QuickStats.tsx) rather than showing the same information across
// multiple cards — see DashboardView.tsx for the current layout.
export default function ExecutiveBrief({ brief }: { brief: string | null }) {
  return (
    <Card title="Morning Brief" padding="p-3.5" action={brief && <span className="text-[10.5px] text-fg-tertiary">Generated ~8:30am</span>}>
      {brief ? (
        <p className="text-sm text-fg-secondary leading-relaxed">{brief}</p>
      ) : (
        <p className="text-sm text-fg-tertiary">Not generated yet — check back after this morning&apos;s briefing (~8:30am IST).</p>
      )}
    </Card>
  )
}
