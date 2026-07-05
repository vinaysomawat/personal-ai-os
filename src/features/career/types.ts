export type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected'

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
}

export const SKILL_CATEGORIES = ['Frontend', 'Backend', 'Testing', 'DevOps', 'Architecture', 'Soft Skills', 'Other'] as const

export const SKILL_LEVEL_CONFIG: Record<SkillLevel, { label: string; color: string }> = {
  beginner:     { label: 'Beginner',     color: 'bg-slate-500/15 text-slate-400' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-500/15 text-blue-400' },
  advanced:     { label: 'Advanced',     color: 'bg-purple-500/15 text-purple-400' },
  expert:       { label: 'Expert',       color: 'bg-accent/15 text-accent' },
}

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: 'bg-green-500/15 text-green-400' },
  medium: { label: 'Medium', color: 'bg-amber-500/15 text-amber-400' },
  hard:   { label: 'Hard',   color: 'bg-red-500/15 text-red-400' },
}

export const QA_TOPICS = ['JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js', 'Playwright', 'Testing', 'System Design', 'Behavioral', 'General'] as const
