export type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'

export interface JDAnalysis {
  requiredSkills: string[]
  missingSkills: string[]
  matchPercentage: number
  priorityTopics: string[]
  companyFocus: string
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

export interface InterviewQA {
  id: string
  user_id: string
  question: string
  answer: string | null
  topic: string
  difficulty: Difficulty
  created_at: string
  last_reviewed_at: string | null
}

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: 'bg-green-500/15 text-green-400' },
  medium: { label: 'Medium', color: 'bg-amber-500/15 text-amber-400' },
  hard:   { label: 'Hard',   color: 'bg-red-500/15 text-red-400' },
}

export const QA_TOPICS = ['JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js', 'Playwright', 'Testing', 'System Design', 'Behavioral', 'General'] as const
