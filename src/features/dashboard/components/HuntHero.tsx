import Link from 'next/link'
import { paceLabel, paceStatus } from '@/features/prep/war'
import { runwayTone } from '@/features/finance/calculations'
import type { HuntHero as HuntHeroData } from '../hunt-hero'

const TONE = { good: 'text-good', warn: 'text-warn', risk: 'text-risk' } as const
const PACE = { ahead: 'text-good', on: 'text-fg-primary', behind: 'text-risk' } as const
// Daily score (% of today's plan done): 90+ green, 70+ accent, 40+ amber, else red.
const scoreTone = (n: number) => n >= 90 ? 'text-good' : n >= 70 ? 'text-accent' : n >= 40 ? 'text-warn' : 'text-risk'
const scoreBar = (n: number) => n >= 90 ? 'bg-good' : n >= 70 ? 'bg-accent' : n >= 40 ? 'bg-warn' : 'bg-risk'
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

// Interview War Mode hero (v4.0 §3) — replaces Life Score + Quick Stats (War
// Mode is always on). Six tiles, each linking to where you act on it.
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
      label: "Today's score", to: '/prep',
      value: hero.blocks.total ? String(hero.score.today) : '—', color: scoreTone(hero.score.today),
      sub: `of 100 · ${hero.score.level}`, extra: null, history: hero.score.recent,
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
      label: 'Pace today', to: '/prep',
      value: hero.blocks.total ? paceLabel(hero.pace) : '—', color: PACE[paceStatus(hero.pace)],
      sub: hero.blocks.total ? `${hero.pace.donePct}% done · ${hero.pace.dayPct}% of day gone` : 'no plan yet today',
      extra: null, bar: hero.blocks.total ? hero.pace : null,
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
          {'history' in t && t.history && (
            // The 6 days before today (whole blocks) + today, oldest first.
            <div className="flex items-end gap-[3px] h-[16px] mt-1.5" aria-label={`Last 7 days: ${[...t.history.map(h => h.score ?? 0), hero.score.today].join(', ')}`}>
              {[...t.history, { date: 'today', score: hero.score.today }].map(h => (
                <span key={h.date} title={`${h.date}: ${h.score ?? 'no plan'}`} className={`flex-1 rounded-[1.5px] ${h.score === null ? 'bg-border' : scoreBar(h.score)} ${h.date === 'today' ? '' : 'opacity-70'}`} style={{ height: `${Math.max(12, h.score ?? 0)}%` }} />
              ))}
            </div>
          )}
          {'bar' in t && t.bar && (
            // Done so far, with a tick where you should be by now.
            <div className="relative h-[4px] rounded-[2px] bg-border mt-1.5" aria-hidden>
              <div className={`h-full rounded-[2px] ${paceStatus(t.bar) === 'behind' ? 'bg-risk' : 'bg-good'}`} style={{ width: `${t.bar.donePct}%` }} />
              <span className="absolute -top-[2px] h-[8px] w-[2px] bg-fg-primary/70" style={{ left: `${t.bar.dayPct}%` }} />
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
