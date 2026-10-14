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
// Mode is always on). The score card + four tiles, each linking to where you act on it.
export default function HuntHero({ hero }: { hero: HuntHeroData }) {
  const tiles = [
    {
      label: 'Readiness', to: '/prep',
      value: `${hero.overall}%`, color: TONE[hero.tier.tone],
      sub: hero.tier.label,
      extra: hero.topBlocker ? `Close: ${hero.topBlocker.label} ${hero.topBlocker.score ?? '—'}/${hero.topBlocker.gate}` : null,
    },
    {
      label: 'Next interview', to: '/interviews',
      value: hero.nextInterview?.company ?? 'None booked', color: hero.nextInterview ? 'text-accent' : 'text-fg-tertiary',
      sub: hero.nextInterview ? `${hero.nextInterview.kind.replace(/_/g, ' ')} · ${when(hero.nextInterview.scheduled_at)}` : 'no round booked',
      extra: null,
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
    <div className="flex flex-col gap-[var(--grid-gap-sm)]">
    <ScoreCard hero={hero} />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
      {tiles.map(t => (
        <Link key={t.label} href={t.to} className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-[var(--card-pad-sm)] min-w-0 hover:-translate-y-0.5 transition-all">
          <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px] truncate">{t.label}</p>
          <p className={`text-[20px] font-bold mt-1 tabular-nums truncate ${t.color}`}>{t.value}</p>
          <p className="text-[10.5px] text-fg-tertiary mt-0.5 truncate">{t.sub}</p>
          {t.extra && <p className="text-[10.5px] font-semibold text-warn mt-0.5 truncate">{t.extra}</p>}
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
    </div>
  )
}

const IST = 'Asia/Kolkata'
const dayOf = (date: string) => new Date(`${date}T12:00:00+05:30`)
const SCORE_TARGET = 90

// Today's score, full width: the number + context on the left, a 14-day bar
// chart (13 past days by whole blocks + today with partial credit) filling
// the rest, with a dashed line at the 90 target.
function ScoreCard({ hero }: { hero: HuntHeroData }) {
  const hasPlan = hero.blocks.total > 0
  const days = [...hero.score.recent, { date: 'today', score: hasPlan ? hero.score.today : null }]
  const scored = (ds: typeof days) => ds.map(d => d.score).filter((s): s is number => s !== null)
  const week = scored(days.slice(-7))
  const avg = week.length ? Math.round(week.reduce((s, v) => s + v, 0) / week.length) : null
  const best = Math.max(...scored(days), -1)
  return (
    <Link href="/prep" className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-[var(--card-pad-sm)] min-w-0 flex flex-col sm:flex-row gap-3 sm:gap-5 hover:-translate-y-0.5 transition-all">
      <div className="sm:w-[190px] shrink-0">
        <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px]">Today&apos;s score</p>
        <p className="mt-0.5 tabular-nums leading-none"><span className={`text-[40px] font-bold ${hasPlan ? scoreTone(hero.score.today) : 'text-fg-tertiary'}`}>{hasPlan ? hero.score.today : '—'}</span><span className="text-[13px] text-fg-tertiary font-semibold"> / 100</span></p>
        <p className="text-[11.5px] text-fg-secondary mt-1.5">{hero.score.level} · {hero.blocks.done}/{hero.blocks.total} blocks done</p>
        <p className="text-[11px] text-fg-tertiary mt-0.5 tabular-nums">7-day avg {avg ?? '—'} · best (14d) {best >= 0 ? best : '—'}</p>
      </div>
      <div className="flex-1 min-w-0" role="img" aria-label={`Daily score, last 14 days: ${days.map(d => d.score ?? 'no plan').join(', ')}`}>
        <div className="relative h-[96px] mt-[14px]">
          <div className="absolute inset-x-0 border-t border-dashed border-good/60" style={{ bottom: `${SCORE_TARGET}%` }}>
            <span className="absolute left-0 -top-[13px] text-[9.5px] text-good font-semibold">{SCORE_TARGET}</span>
          </div>
          <div className="absolute inset-0 flex gap-[3px] sm:gap-[5px]">
            {days.map(d => (
              <div key={d.date} className="relative flex-1 h-full" title={`${d.date === 'today' ? 'Today' : d.date}: ${d.score ?? 'no plan'}`}>
                <div className={`absolute inset-x-0 bottom-0 rounded-t-[3px] ${d.score === null ? 'bg-border' : scoreBar(d.score)} ${d.date === 'today' ? '' : 'opacity-75'}`} style={{ height: `${Math.max(3, d.score ?? 0)}%` }} />
                {d.score !== null && <span className={`absolute inset-x-0 text-center text-[10px] tabular-nums ${d.date === 'today' ? 'font-bold text-fg-primary' : 'text-fg-tertiary'}`} style={{ bottom: `calc(${d.score}% + 1px)` }}>{d.score}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-[3px] sm:gap-[5px] mt-1 border-t border-border pt-1">
          {days.map((d, i) => {
            const date = dayOf(d.date === 'today' ? new Date().toLocaleDateString('en-CA', { timeZone: IST }) : d.date)
            return (
              <span key={d.date} className={`flex-1 min-w-0 text-center text-[9.5px] tabular-nums truncate ${d.date === 'today' ? 'font-bold text-accent' : 'text-fg-tertiary'} ${(days.length - 1 - i) % 2 ? 'invisible sm:visible' : ''}`}>
                {d.date === 'today' ? <><span className="sm:hidden">{date.toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST })}</span><span className="hidden sm:inline">Today</span></> : <><span className="sm:hidden">{date.toLocaleDateString('en-IN', { day: 'numeric', timeZone: IST })}</span><span className="hidden sm:inline">{date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: IST })}</span></>}
              </span>
            )
          })}
        </div>
      </div>
    </Link>
  )
}
