export type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'

export interface JDAnalysis {
  requiredSkills: string[]
  missingSkills: string[]
  matchPercentage: number
  priorityTopics: string[]
  companyFocus: string
}

export interface CompanyInsights {
  interviewTrends: string
  hiringPatterns: string
  source: 'company-specific' | 'general-fallback'
}

export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  status: AppStatus
  salary_range: string | null
  location: string | null
  url: string | null
  notes: string | null
  applied_at: string
  created_at: string
  resume_version_id: string | null
  job_description: string | null
  jd_analysis: JDAnalysis | null
}

export interface CareerProfile {
  id: string
  user_id: string
  current_role: string | null
  current_company: string | null
  current_salary: number | null
  target_role: string | null
  years_experience: number | null
  bio: string | null
  updated_at: string
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface Skill {
  id: string
  user_id: string
  name: string
  category: string
  level: SkillLevel
  created_at: string
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: 'bg-green-500/15 text-green-400' },
  medium: { label: 'Medium', color: 'bg-amber-500/15 text-amber-400' },
  hard:   { label: 'Hard',   color: 'bg-red-500/15 text-red-400' },
}

export const QUIZ_TOPICS = ['JavaScript', 'React', 'TypeScript', 'Next.js', 'HTML/CSS', 'Browser Internals', 'Performance', 'System Design', 'Node.js', 'APIs'] as const

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  subtopic: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  topic: string
  difficulty: Difficulty
  questions: QuizQuestion[]
  user_answers: number[]
  score: number
  total: number
  weak_areas: string[]
  created_at: string
}

export type ReadinessTier = 'not_started' | 'needs_work' | 'developing' | 'ready' | 'strong'

export const READINESS_CONFIG: Record<ReadinessTier, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-surface-3 text-slate-500' },
  needs_work:  { label: 'Needs Work',  color: 'bg-red-500/15 text-red-400' },
  developing:  { label: 'Developing',  color: 'bg-amber-500/15 text-amber-400' },
  ready:       { label: 'Ready',       color: 'bg-blue-500/15 text-blue-400' },
  strong:      { label: 'Strong',      color: 'bg-green-500/15 text-green-400' },
}
