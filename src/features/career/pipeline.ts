import type { Application, InterviewRound } from './types'

// Outreach → interview funnel (v4.0 §4.5). Deterministic, Monday-start IST
// weeks; each stage is attributed to the week its row started in.

export type OutreachChannel = 'referral' | 'linkedin' | 'recruiter' | 'application' | 'other'
export type OutreachStatus = 'sent' | 'replied' | 'referred' | 'screen' | 'no_response' | 'closed'
export const OUTREACH_CHANNELS: OutreachChannel[] = ['referral', 'linkedin', 'recruiter', 'application', 'other']
export const OUTREACH_STATUSES: OutreachStatus[] = ['sent', 'replied', 'referred', 'screen', 'no_response', 'closed']

export interface Outreach {
  id: string
  company: string
  person: string | null
  channel: OutreachChannel
  count: number
  status: OutreachStatus
  sent_at: string
  follow_up_on: string | null
  notes: string | null
  application_id: string | null
  created_at: string
}

export const addDays = (date: string, n: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const weekStart = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))

const REPLIED: OutreachStatus[] = ['replied', 'referred', 'screen']
const PAST_SCREEN = new Set(['technical', 'coding', 'system_design', 'behavioral', 'hiring_manager', 'onsite'])

export interface FunnelWeek {
  week: string
  sent: number
  replies: number
  screens: number
  onsites: number
  offers: number
}

export function funnel(outreach: Outreach[], apps: Application[], rounds: InterviewRound[], today: string, weeks = 5): FunnelWeek[] {
  const start = weekStart(today)
  const reachedInterview = (a: Application) => a.status === 'interview' || a.status === 'offer' || rounds.some(r => r.application_id === a.id && PAST_SCREEN.has(r.kind))
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDays(start, -7 * i)
    const end = addDays(week, 7)
    const inWeek = (d: string) => d >= week && d < end
    const o = outreach.filter(x => inWeek(x.sent_at))
    const a = apps.filter(x => inWeek(x.created_at.slice(0, 10)))
    return {
      week,
      sent: o.reduce((s, x) => s + x.count, 0),
      replies: o.filter(x => REPLIED.includes(x.status)).reduce((s, x) => s + x.count, 0),
      screens: a.length,
      onsites: a.filter(reachedInterview).length,
      offers: a.filter(x => x.status === 'offer').length,
    }
  })
}

export const pct = (num: number, den: number) => den > 0 ? `${Math.round((num / den) * 100)}%` : '—'
