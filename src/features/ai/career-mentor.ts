'use server'

import { askAI, askAIWithMeta } from '@/lib/ai-gateway'
import { QUIZ_TOPICS } from '@/features/career/types'
import type { CareerProfile, JDAnalysis, CompanyInsights } from '@/features/career/types'


export async function analyzeJobDescription(
  jobDescription: string,
  company: string,
  role: string,
  profile: CareerProfile | null
): Promise<JDAnalysis | null> {
  const prompt = `Job description for a ${role} role at ${company}:
"""
${jobDescription}
"""

Candidate profile:
- Current role: ${profile?.current_role ?? 'not set'}
- Target role: ${profile?.target_role ?? 'not set'}
- Years of experience: ${profile?.years_experience ?? 'not set'}
- Bio/focus: ${profile?.bio ?? 'not set'}

Analyze the fit and return ONLY a JSON object in this exact format:
{
  "requiredSkills": ["...", ...],
  "missingSkills": ["...", ...],
  "matchPercentage": 0,
  "priorityTopics": ["...", ...],
  "companyFocus": "..."
}

requiredSkills: the concrete skills/technologies this JD asks for.
missingSkills: the subset of requiredSkills the candidate likely lacks or is weak on, based on their profile above.
matchPercentage: your honest 0-100 estimate of how well the candidate profile matches this JD.
priorityTopics: 1-5 topics worth prepping first for this specific role, ordered by priority. Each MUST be exactly one of this fixed list (no other values): ${QUIZ_TOPICS.join(', ')}.
companyFocus: one or two sentences on what this company likely emphasizes in interviews for this kind of role.`

  const raw = await askAI('jd_analysis', prompt, 'You are a sharp technical recruiter and hiring manager. Return only valid JSON, no explanation, no markdown fences.')
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch {
    return null
  }
}

// No web search available — this is Claude's trained knowledge only, which
// has a cutoff and will be thin for smaller/less-documented companies. The
// prompt asks the model to self-report whether it actually knows the
// company's process (`source: 'company-specific'`) versus falling back to
// general current frontend-interview trends (`source: 'general-fallback'`),
// so the UI can label which one it's showing rather than presenting a
// generic answer as if it were about the specific company.
export async function getCompanyInsights(company: string, role: string): Promise<CompanyInsights | null> {
  const prompt = `A candidate is interviewing for a ${role} role at ${company}.

Do you have specific, genuine knowledge of ${company}'s interview process (rounds, format, what they emphasize) from your training data? If yes, describe it. If you don't have reliable company-specific knowledge, say so honestly and instead give general current frontend-interview trends and commonly asked concepts for a company of similar size/domain — clearly as general guidance, not invented specifics about ${company}.

Return ONLY a JSON object in this exact format:
{
  "interviewTrends": "...",
  "hiringPatterns": "...",
  "source": "company-specific" or "general-fallback"
}

interviewTrends: 2-4 sentences on interview format/rounds/what's emphasized.
hiringPatterns: 1-2 sentences on hiring bar, team growth, or role focus if known — otherwise general guidance for this type of role.
source: "company-specific" only if you have genuine knowledge of this exact company; "general-fallback" otherwise. Be honest — do not fabricate company-specific details.`

  const { text: raw, generatedAt } = await askAIWithMeta('company_insights', prompt, 'You are a well-informed technical recruiter. Return only valid JSON, no explanation, no markdown fences. Never invent specific facts about a company you do not have genuine knowledge of.')
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? { ...JSON.parse(match[0]), generatedAt } : null
  } catch {
    return null
  }
}
