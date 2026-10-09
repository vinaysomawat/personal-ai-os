import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST, todayIST } from '@/lib/date'
import { funnel, weekStart, type FunnelWeek, type Outreach } from './pipeline'
import type { Application, InterviewRound } from './types'

// This week's pipeline for the Dashboard Hunt Hero and the 7:30am Prep Coach
// message (v4.0 §3): funnel row, outreach vs target, follow-ups due, and
// debriefs prompted but not yet answered.
export interface PipelineStatus {
  week: FunnelWeek
  target: number
  followUps: { company: string; person: string | null }[]
  debriefsOwed: { company: string; kind: string }[]
}

export async function loadPipelineStatus(db: SupabaseClient, userId: string, target: number): Promise<PipelineStatus> {
  const today = todayIST()
  const [outreachRes, appsRes, roundsRes, debriefRes] = await Promise.all([
    db.from('outreach').select('*').eq('user_id', userId).gte('sent_at', daysAgoIST(60)),
    db.from('applications').select('id, status, created_at').eq('user_id', userId).gte('created_at', `${weekStart(today)}T00:00:00+05:30`),
    db.from('interview_rounds').select('application_id, kind').eq('user_id', userId),
    db.from('interview_rounds').select('id, kind, application:applications(company)').eq('user_id', userId)
      .not('debrief_sent_at', 'is', null).gte('debrief_sent_at', new Date(Date.now() - 7 * 86400_000).toISOString()),
  ])
  const outreach = (outreachRes.data ?? []) as Outreach[]
  const [week] = funnel(outreach, (appsRes.data ?? []) as Application[], (roundsRes.data ?? []) as InterviewRound[], today, 1)

  const prompted = (debriefRes.data ?? []) as unknown as { id: string; kind: string; application: { company: string } | null }[]
  let answered = new Set<string>()
  if (prompted.length) {
    const { data } = await db.from('interview_questions').select('round_id').in('round_id', prompted.map(r => r.id))
    answered = new Set((data ?? []).map(q => q.round_id as string))
  }
  return {
    week,
    target,
    followUps: outreach.filter(o => o.status === 'sent' && o.follow_up_on && o.follow_up_on <= today).map(o => ({ company: o.company, person: o.person })),
    debriefsOwed: prompted.filter(r => !answered.has(r.id)).map(r => ({ company: r.application?.company ?? 'Interview', kind: r.kind })),
  }
}
