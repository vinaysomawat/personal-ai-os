// v3.4 (Interviews): a company is added once a phone screen happens, so
// 'applied' is no longer offered (old rows can still hold it).
export type AppStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
export const ACTIVE_STATUSES: AppStatus[] = ['screening', 'interview']

export const STAGE_CONFIG: Record<AppStatus, { label: string; color: string }> = {
  applied:   { label: 'Applied',     color: 'text-fg-tertiary' },
  screening: { label: 'Phone screen', color: 'text-warn' },
  interview: { label: 'Interviewing', color: 'text-accent' },
  offer:     { label: 'Offer',        color: 'text-good' },
  rejected:  { label: 'Rejected',     color: 'text-risk' },
  withdrawn: { label: 'Withdrawn',    color: 'text-fg-tertiary' },
}
// Offered in the stage picker ('applied' isn't — see above).
export const STAGES: AppStatus[] = ['screening', 'interview', 'offer', 'rejected', 'withdrawn']

export type RoundKind = 'recruiter' | 'phone_screen' | 'technical' | 'coding' | 'system_design' | 'behavioral' | 'hiring_manager' | 'onsite' | 'other'
export const ROUND_KINDS: { key: RoundKind; label: string }[] = [
  { key: 'recruiter', label: 'Recruiter call' }, { key: 'phone_screen', label: 'Phone screen' },
  { key: 'technical', label: 'Technical' }, { key: 'coding', label: 'Coding' },
  { key: 'system_design', label: 'System design' }, { key: 'behavioral', label: 'Behavioral' },
  { key: 'hiring_manager', label: 'Hiring manager' }, { key: 'onsite', label: 'Onsite / final' },
  { key: 'other', label: 'Other' },
]
export const roundLabel = (k: string) => ROUND_KINDS.find(r => r.key === k)?.label ?? k

export interface InterviewRound {
  id: string
  application_id: string
  kind: RoundKind
  scheduled_at: string | null
  status: 'scheduled' | 'done' | 'cancelled'
  outcome: 'pending' | 'passed' | 'failed'
  interviewer: string | null
  notes: string | null
  created_at: string
}

export type QuestionCategory = 'technical' | 'coding' | 'system_design' | 'behavioral' | 'ai_native' | 'other'
export const QUESTION_CATEGORIES: { key: QuestionCategory; label: string }[] = [
  { key: 'technical', label: 'Technical / theory' }, { key: 'coding', label: 'Coding' },
  { key: 'system_design', label: 'System design' }, { key: 'behavioral', label: 'Behavioral' },
  { key: 'ai_native', label: 'AI-native' }, { key: 'other', label: 'Other' },
]
export const categoryLabel = (k: string) => QUESTION_CATEGORIES.find(c => c.key === k)?.label ?? k

// Every question an interviewer asked — the interview experience, kept.
export interface InterviewQuestion {
  id: string
  application_id: string
  round_id: string | null
  question: string
  category: QuestionCategory
  my_answer: string | null
  went: 'well' | 'ok' | 'badly' | null
  notes: string | null
  created_at: string
}

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

// The frontend interview topic vocabulary — the JD analysis picks its
// priorityTopics from this list, and Prep's READINESS_AREAS map them to
// readiness areas. (Was the Topic Quiz's topic list; the quiz itself was
// removed 2026-10-08.)
export const QUIZ_TOPICS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'HTML/CSS', 'CSS Architecture',
  'Browser Internals', 'Performance', 'Accessibility', 'Testing', 'Web Security',
  'State Management', 'Design Systems', 'System Design', 'Micro-frontends',
  'Build Tooling', 'Node.js', 'APIs',
] as const

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
