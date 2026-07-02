'use server'

import { aiText } from '@/lib/anthropic'
import type { Application } from '@/features/career/types'

export async function getCareerAdvice(applications: Application[]): Promise<string> {
  if (applications.length === 0) {
    return "You don't have any applications yet. Start by adding 3-5 companies you're genuinely excited about."
  }

  const byStatus: Record<string, Application[]> = {}
  for (const app of applications) {
    byStatus[app.status] = [...(byStatus[app.status] ?? []), app]
  }

  const prompt = `You are a career coach reviewing a job seeker's application pipeline.

Pipeline:
${Object.entries(byStatus).map(([status, apps]) =>
    `${status.toUpperCase()} (${apps.length}): ${apps.map(a => `${a.company} / ${a.role}`).join(', ')}`
  ).join('\n')}

${applications.map(a => `${a.company} (${a.role}) — ${a.status}${a.notes ? ` — Notes: ${a.notes}` : ''}`).join('\n')}

Give 4-5 specific, actionable next steps. Include:
- Which companies to follow up with and when
- Interview prep for active stages
- Any pattern you notice (weak funnel? too many ghosted? strong pipeline?)
- One bold move to make this week

Be direct. Skip generic advice. Refer to specific companies by name.`

  return aiText(prompt, "You are an expert career coach who gives blunt, tactical advice. No fluff. Reference specific companies from the pipeline.")
}
