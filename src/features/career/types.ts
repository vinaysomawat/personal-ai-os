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
  generatedAt: string
}

export interface JobAlert {
  id: string
  user_id: string
  source: 'greenhouse' | 'lever' | 'ashby'
  company: string
  external_id: string
  title: string
  url: string
  created_at: string
  salary_min: number | null
  salary_max: number | null
  matched_skills: string[]
  score: number
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

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

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
  easy:   { label: 'Easy',   color: 'bg-good-soft text-green-400' },
  medium: { label: 'Medium', color: 'bg-warn-soft text-amber-400' },
  hard:   { label: 'Hard',   color: 'bg-risk-soft text-red-400' },
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

// Raw CSS-var color values (not Tailwind classes) — design's Interview Prep
// tiles use the same color for both a plain colored-text readiness label and
// a small corner dot, neither of which is a Tailwind bg+text pill.
export const READINESS_CONFIG: Record<ReadinessTier, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', color: 'var(--border-strong)', bg: 'var(--surface-2)' },
  needs_work:  { label: 'Needs Work',  color: 'var(--risk)',          bg: 'var(--risk-soft)' },
  developing:  { label: 'Developing',  color: 'var(--warn)',          bg: 'var(--warn-soft)' },
  ready:       { label: 'Ready',       color: 'var(--accent)',        bg: 'var(--accent-soft)' },
  strong:      { label: 'Strong',      color: 'var(--good)',          bg: 'var(--good-soft)' },
}
