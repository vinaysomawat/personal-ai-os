import Link from 'next/link'
import { hm } from '@/features/prep/war'
import { runwayTone } from '@/features/finance/calculations'
import type { HuntHero as HuntHeroData } from '../hunt-hero'

const TONE = { good: 'text-good', warn: 'text-warn', risk: 'text-risk' } as const
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

// Job Hunt Mode hero (v4.0 §3) — replaces Life Score + Quick Stats while a
// Prep target date is set. Six tiles, each linking to where you act on it.
export default function HuntHero({ hero }: { hero: HuntHeroData }) {
  const { pipeline: p } = hero
  const tiles = [
    {
      label: 'Readiness', to: '/prep',
      value: `${hero.overall}%`, color: TONE[hero.tier.tone],
      sub: hero.tier.label,
      extra: hero.topBlocker ? `Close: ${hero.topBlocker.label} ${hero.topBlocker.score ?? '—'}/${hero.topBlocker.gate}` : null,
    },
    {
      label: 'Target', to: '/prep',
      value: hero.daysLeft === null ? '—' : `D-${hero.daysLeft}`, color: hero.daysLeft !== null && hero.daysLeft <= 3 ? 'text-risk' : 'text-fg-primary',
      sub: 'days to target date', extra: null,
    },
    {
      label: 'Next interview', to: '/interviews',
      value: hero.nextInterview?.company ?? 'None booked', color: hero.nextInterview ? 'text-accent' : 'text-fg-tertiary',
      sub: hero.nextInterview ? `${hero.nextInterview.kind.replace(/_/g, ' ')} · ${when(hero.nextInterview.scheduled_at)}` : 'outreach is the lever',
      extra: null,
    },
    {
      label: 'Outreach this week', to: '/interviews',
      value: `${p.week.sent}/${p.target}`, color: p.week.sent >= p.target ? 'text-good' : 'text-warn',
      sub: `${p.week.replies} replies · ${p.week.screens} screens · ${p.week.onsites} onsites`,
      extra: p.followUps.length ? `${p.followUps.length} follow-up${p.followUps.length === 1 ? '' : 's'} due` : null,
    },
    {
      label: 'Focused today', to: '/prep',
      value: hm(hero.focusedMinutes), color: 'text-fg-primary',
      sub: hero.blocks.total ? `${hero.blocks.done}/${hero.blocks.total} blocks done` : 'no plan yet today',
      extra: null,
    },
    {
      label: 'Runway', to: '/finance',
      value: hero.runway === null ? '—' : `${hero.runway} mo`, color: runwayTone(hero.runway),
      sub: hero.runway === null ? 'set liquid savings' : 'at 90-day avg spend', extra: null,
    },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[var(--grid-gap-sm)]">
      {tiles.map(t => (
        <Link key={t.label} href={t.to} className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-[var(--card-pad-sm)] min-w-0 hover:-translate-y-0.5 transition-all">
          <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px] truncate">{t.label}</p>
          <p className={`text-[20px] font-bold mt-1 tabular-nums truncate ${t.color}`}>{t.value}</p>
          <p className="text-[10.5px] text-fg-tertiary mt-0.5 truncate">{t.sub}</p>
          {t.extra && <p className="text-[10.5px] font-semibold text-warn mt-0.5 truncate">{t.extra}</p>}
        </Link>
      ))}
    </div>
  )
}
