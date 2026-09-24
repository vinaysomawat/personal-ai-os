export type FlashcardSource = 'career_quiz' | 'learning_quiz' | 'manual'

export interface Flashcard {
  id: string
  user_id: string
  front: string
  back: string
  topic: string | null
  source: FlashcardSource
  source_ref: string | null
  ease: number
  interval_days: number
  reps: number
  lapses: number
  due_date: string
  last_reviewed_at: string | null
  created_at: string
}

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

export interface Story {
  id: string
  user_id: string
  title: string
  competencies: string[]
  situation: string | null
  task: string | null
  action: string | null
  result: string | null
  metrics: string | null
  strength: number | null
  last_rehearsed_at: string | null
  created_at: string
  updated_at: string
}

export interface StoryRehearsal {
  id: string
  story_id: string | null
  competency: string
  prompt: string
  answer: string
  critique: string | null
  created_at: string
}

export interface PrepBlock {
  key: 'warmup' | 'main' | 'concept' | 'lead'
  label: string
  detail: string
  minutes: number
  href: string
  done: boolean
}

export interface PrepSession {
  id: string
  date: string
  focus: string
  blocks: PrepBlock[]
  completed_at: string | null
}

// Behavioral + leadership competencies senior/lead UI loops probe. Split
// into two readiness-matrix areas: Behavioral (how you work with people and
// pressure) and Leadership (how you lead/decide/raise the bar).
export const COMPETENCIES = [
  { key: 'ownership', label: 'Ownership', group: 'leadership' },
  { key: 'mentoring', label: 'Mentoring & growing others', group: 'leadership' },
  { key: 'influence', label: 'Influencing without authority', group: 'leadership' },
  { key: 'technical_decision', label: 'Technical decision / trade-off', group: 'leadership' },
  { key: 'raising_bar', label: 'Raising the bar (quality, process)', group: 'leadership' },
  { key: 'conflict', label: 'Conflict & disagreement', group: 'behavioral' },
  { key: 'ambiguity', label: 'Dealing with ambiguity', group: 'behavioral' },
  { key: 'failure', label: 'Failure & learning', group: 'behavioral' },
  { key: 'delivery', label: 'Delivering under pressure', group: 'behavioral' },
  { key: 'collaboration', label: 'Cross-team collaboration', group: 'behavioral' },
] as const

export type CompetencyKey = typeof COMPETENCIES[number]['key']

// Static "Tell me about a time…" prompts per competency — deterministic
// source for Rehearse mode (only the critique of the answer uses AI).
export const REHEARSAL_PROMPTS: Record<CompetencyKey, string[]> = {
  ownership: [
    'Tell me about a time you took ownership of a problem that wasn\'t strictly yours.',
    'Describe a project you drove end to end. What would have failed without you?',
  ],
  mentoring: [
    'Tell me about someone you helped grow. What did you do, and what changed for them?',
    'How have you raised the skill level of a team, not just one person?',
  ],
  influence: [
    'Tell me about a time you convinced another team or senior stakeholder to change direction.',
    'Describe a technical change you pushed through without having formal authority.',
  ],
  technical_decision: [
    'Walk me through a significant frontend architecture decision you made. What were the trade-offs?',
    'Tell me about a time you chose not to adopt a popular technology. Why?',
  ],
  raising_bar: [
    'Tell me about a time you improved code quality, testing, or performance across a codebase.',
    'Describe a process you introduced that made your team measurably better.',
  ],
  conflict: [
    'Tell me about a disagreement with a colleague on a technical approach. How did it resolve?',
    'Describe a time you had to give difficult feedback.',
  ],
  ambiguity: [
    'Tell me about a project that started with unclear requirements. How did you create clarity?',
    'Describe a time you had to make a decision with incomplete information.',
  ],
  failure: [
    'Tell me about a time something you built failed in production. What did you learn?',
    'Describe a mistake you made and how you handled it.',
  ],
  delivery: [
    'Tell me about delivering something important under a tight deadline. What did you cut, and why?',
    'Describe a time a project was slipping. What did you do?',
  ],
  collaboration: [
    'Tell me about working closely with design, product, or backend to ship something hard.',
    'Describe a cross-team dependency that blocked you and how you unblocked it.',
  ],
}

// The senior/lead frontend interview surface, as the readiness matrix's
// rows. Each area is fed by quiz topics (career QUIZ_TOPICS), coding
// question topics/categories, and/or story coverage.
export const READINESS_AREAS = [
  { key: 'js', label: 'JavaScript depth', quizTopics: ['JavaScript'], codingTopics: ['JavaScript Fundamentals', 'Async & Promises', 'Array & Object Methods'], href: '/career' },
  { key: 'ts', label: 'TypeScript', quizTopics: ['TypeScript'], codingTopics: ['TypeScript'], href: '/career' },
  { key: 'react', label: 'React / Next.js', quizTopics: ['React', 'Next.js', 'State Management'], codingTopics: ['React & State Management'], href: '/career' },
  { key: 'css', label: 'CSS & layout', quizTopics: ['HTML/CSS', 'CSS Architecture'], codingTopics: ['CSS & Layout'], href: '/career' },
  { key: 'a11y', label: 'Accessibility', quizTopics: ['Accessibility'], codingTopics: [], href: '/career' },
  { key: 'perf', label: 'Performance', quizTopics: ['Performance'], codingTopics: ['Performance'], href: '/career' },
  { key: 'testing', label: 'Testing', quizTopics: ['Testing'], codingTopics: ['Testing'], href: '/career' },
  { key: 'browser', label: 'Browser, network & security', quizTopics: ['Browser Internals', 'Web Security', 'APIs'], codingTopics: ['DOM & Browser APIs', 'Networking & APIs'], href: '/career' },
  { key: 'sysdesign', label: 'Frontend system design', quizTopics: ['System Design', 'Micro-frontends', 'Design Systems'], codingTopics: ['System Design'], href: '/career' },
  { key: 'uicoding', label: 'UI coding', quizTopics: [], codingTopics: ['UI Components'], href: '/coding' },
  { key: 'behavioral', label: 'Behavioral', quizTopics: [], codingTopics: [], href: '/prep?tab=stories' },
  { key: 'leadership', label: 'Leadership', quizTopics: [], codingTopics: [], href: '/prep?tab=stories' },
] as const

export type ReadinessAreaKey = typeof READINESS_AREAS[number]['key']

export interface ReadinessCell {
  key: ReadinessAreaKey
  label: string
  score: number | null
  basis: string
  href: string
}
