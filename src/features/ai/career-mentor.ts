'use server'

import { askAI } from '@/lib/ai-gateway'
import type { CareerProfile, Skill, Application } from '@/features/career/types'

interface CareerContext {
  profile: CareerProfile | null
  skills: Skill[]
  applications: Application[]
  codingStreak?: number
  studyStreak?: number
}

export async function askCareerMentor(question: string, ctx: CareerContext): Promise<string> {
  const skillsByCategory = ctx.skills.reduce<Record<string, string[]>>((acc, s) => {
    acc[s.category] = [...(acc[s.category] ?? []), `${s.name} (${s.level})`]
    return acc
  }, {})

  const activeApps = ctx.applications.filter(a => ['applied', 'screening', 'interview'].includes(a.status))
  const offers = ctx.applications.filter(a => a.status === 'offer')

  const context = `Vinay's career snapshot:
- Current role: ${ctx.profile?.current_role ?? 'not set'} at ${ctx.profile?.current_company ?? 'not set'}
- Current salary: ${ctx.profile?.current_salary ? `₹${ctx.profile.current_salary.toLocaleString('en-IN')}/year` : 'not set'}
- Target role: ${ctx.profile?.target_role ?? 'not set'}
- Years of experience: ${ctx.profile?.years_experience ?? 'not set'}

Skills:
${Object.entries(skillsByCategory).map(([cat, skills]) => `  ${cat}: ${skills.join(', ')}`).join('\n') || '  None added yet'}

Job search: ${activeApps.length} active applications${offers.length ? `, ${offers.length} offer(s)` : ''}
Recent applications: ${ctx.applications.slice(0, 5).map(a => `${a.company} (${a.role}, ${a.status})`).join(', ') || 'none'}
${ctx.codingStreak ? `Coding practice: ${ctx.codingStreak}-day streak — factor consistency into interview readiness` : ''}
${ctx.studyStreak ? `Study consistency: ${ctx.studyStreak}-day streak — factor into how prepared they are on fundamentals` : ''}

Question: ${question}`

  return askAI('career_mentor', context, `You are Vinay's personal career mentor — sharp, honest, and specific.
He is a frontend/testing engineer targeting senior+ roles.
Give concrete, actionable advice referencing his actual skills and experience.
If asked about readiness for a role, give a clear verdict with specific gaps to close.
For salary questions, give actual numbers. For learning paths, give a prioritised list.
Under 250 words. No generic platitudes.`)
}

export async function generateInterviewQuestions(targetRole: string, topic: string, difficulty: string): Promise<{ question: string; answer: string }[]> {
  const prompt = `Generate 5 ${difficulty} ${topic} interview questions for a ${targetRole} position.

Return ONLY a JSON array in this exact format:
[
  {"question": "...", "answer": "..."},
  ...
]

Make the questions realistic and specific. Answers should be concise model answers (2-4 sentences).`

  const raw = await askAI('interview_questions', prompt, 'You are a senior engineering interviewer. Return only valid JSON, no explanation.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
