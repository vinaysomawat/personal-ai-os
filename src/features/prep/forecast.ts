import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { todayIST } from '@/lib/date'
import { loadPrepData } from './core'
import { focusSeconds, type Forecast } from './war'

const SYSTEM = `You are a hiring manager for Senior Frontend Engineer / Frontend Tech Lead roles at top product companies that expect AI-native engineers. From the candidate's prep data below, predict how an interview loop tomorrow would go.
Use only the data given; never invent scores or events. Be blunt and specific.
Respond with ONLY a JSON object:
{"strengths":["up to 4 areas likely to go well"],"failures":[{"area":"area name","why":"one sentence: what would go wrong in the room"}],"riskQuestion":"the single interview question most likely to sink them, phrased as an interviewer would ask it","fixFirst":["3 concrete things to do this week, most important first"]}
List up to 4 failures, worst first.`

const parseList = (v: unknown) => Array.isArray(v) ? v.map(String).filter(Boolean) : []

// Weekly "if you interviewed tomorrow" forecast — one Sonnet call over
// already-computed readiness, weakness, mock and focus data; stored in
// prep_forecasts (one per day). Confidence = War readiness, not the AI's.
export async function generateForecast(db: SupabaseClient, userId: string): Promise<{ forecast: Forecast | null; error: string | null }> {
  const data = await loadPrepData(db, userId)
  const reviewed = data.mockRounds.filter(r => r.review).slice(0, 5)
  const focusMin = Math.round(data.focusSessions.reduce((s, f) => s + focusSeconds(f), 0) / 60)
  const { data: apps } = await db.from('applications').select('company, role, status, jd_analysis').eq('user_id', userId).in('status', ['screening', 'interview'])
  const prompt = [
    `Target: interview-ready by ${data.settings.target_date ?? 'not set'} (${data.daysLeft ?? '?'} days left), ${data.settings.hours_per_day}h/day.`,
    `Readiness (deterministic, 0-100, gate in brackets): ${data.readiness.map(c => `${c.label} ${c.score ?? 'no data'}`).join('; ')}.`,
    `Overall War readiness ${data.war.overall}% (bottleneck-penalized). Blockers below gate: ${data.war.blockers.map(b => `${b.label} ${b.score ?? 'no data'}/${b.gate}`).join(', ') || 'none'}.`,
    `Weakest topics: ${data.weakness.map(w => `${w.topic} (weakness ${w.score}, avg rating ${w.avgRating ?? 'unrated'}, ${w.struggles} struggles, last practiced ${w.daysSince ?? 'never'} days ago)`).join('; ')}.`,
    `Mock rounds (last ${reviewed.length} reviewed): ${reviewed.map(r => `${r.format} ${r.review!.score ?? '?'}/10 ${r.review!.verdict} — fixes: ${r.review!.fixes.join(' / ')}`).join(' | ') || 'none reviewed'}.`,
    `Focused time last 7 days: ${focusMin} min. Revision queue: ${data.revision.map(r => `${r.topic} ${r.avgRating}/10 ${r.status}`).join(', ') || 'empty'}.`,
    `STAR stories: ${data.stories.length}.`,
    `Live interview processes: ${(apps ?? []).map(a => `${a.company} (${a.role}, ${a.status}${(a.jd_analysis as { priorityTopics?: string[] } | null)?.priorityTopics?.length ? `; JD stresses ${(a.jd_analysis as { priorityTopics: string[] }).priorityTopics.join(', ')}` : ''})`).join('; ') || 'none'}.`,
  ].join('\n')

  const raw = await askAI('prep_forecast', prompt, SYSTEM, { userId })
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) } catch { return { forecast: null, error: raw.startsWith('{') ? 'The forecast came back malformed — try again.' : raw } }
  const forecast: Forecast = {
    strengths: parseList(parsed.strengths).slice(0, 4),
    failures: (Array.isArray(parsed.failures) ? parsed.failures : []).slice(0, 4).map(f => ({ area: String((f as { area?: unknown }).area ?? ''), why: String((f as { why?: unknown }).why ?? '') })),
    riskQuestion: String(parsed.riskQuestion ?? ''),
    fixFirst: parseList(parsed.fixFirst).slice(0, 3),
    confidence: data.war.overall,
  }
  const { error } = await db.from('prep_forecasts').upsert({ user_id: userId, date: todayIST(), forecast }, { onConflict: 'user_id,date' })
  if (error) return { forecast, error: error.message }
  return { forecast, error: null }
}
