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
  // 'main' | 'mock' | 'concept' | 'lead' in a normal session; Job Hunt
  // Mode uses 'mock', 'bank:<category>', 'lead' and 'applications'.
  key: string
  label: string
  detail: string
  minutes: number
  href: string
  done: boolean
}

export interface PrepSettings {
  target_date: string | null
  hours_per_day: number
}

// A coding_questions row plus when it was last practiced (in the Question
// Bank / a Mock Round, or completed as a Coding pick).
export interface BankQuestion {
  id: string
  title: string
  difficulty: string
  url: string | null
  category: string
  topics: string[]
  last_seen_at: string | null
  last_answer: string | null
  // Explicit practice order (AI-native section); null = difficulty order.
  sort_order: number | null
  // Expected areas an answer should cover (AI-native scenarios).
  answer_hints: string | null
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
    'Tell me about a time you noticed a problem nobody had asked you to fix. What did you do?',
    'Describe something you shipped that you kept improving after launch. Why?',
    'Tell me about a time you had to own an outcome that depended on other teams.',
  ],
  mentoring: [
    'Tell me about someone you helped grow. What did you do, and what changed for them?',
    'How have you raised the skill level of a team, not just one person?',
    'Tell me about a time you onboarded someone and got them productive quickly.',
    'Describe how you gave a struggling teammate feedback that actually changed their work.',
    'How have you grown a future lead or senior engineer?',
  ],
  influence: [
    'Tell me about a time you convinced another team or senior stakeholder to change direction.',
    'Describe a technical change you pushed through without having formal authority.',
    'Tell me about a time you changed a product decision using data or a prototype.',
    'Describe how you got buy-in for paying down technical debt.',
    'Tell me about a time you aligned several teams on a shared frontend standard.',
  ],
  technical_decision: [
    'Walk me through a significant frontend architecture decision you made. What were the trade-offs?',
    'Tell me about a time you chose not to adopt a popular technology. Why?',
    'Tell me about a decision you made that you later reversed. How did you know?',
    'Describe a build-vs-buy decision on the frontend.',
    'Tell me about a performance or architecture trade-off you made under a deadline.',
  ],
  raising_bar: [
    'Tell me about a time you improved code quality, testing, or performance across a codebase.',
    'Describe a process you introduced that made your team measurably better.',
    'Tell me about a time you introduced testing or CI practices to a team.',
    'Describe how you improved accessibility across a product.',
    'Tell me about a time you set a code-review standard and got the team to follow it.',
  ],
  conflict: [
    'Tell me about a disagreement with a colleague on a technical approach. How did it resolve?',
    'Describe a time you had to give difficult feedback.',
    'Tell me about a time you disagreed with your manager. What happened?',
    'Describe a conflict between design and engineering you helped resolve.',
    'Tell me about working with someone whose style was very different from yours.',
  ],
  ambiguity: [
    'Tell me about a project that started with unclear requirements. How did you create clarity?',
    'Describe a time you had to make a decision with incomplete information.',
    'Tell me about a project where the goal changed midway. How did you adapt?',
    'Describe how you scoped a vague request into something shippable.',
    'Tell me about a time you had to choose between two good options with no clear data.',
  ],
  failure: [
    'Tell me about a time something you built failed in production. What did you learn?',
    'Describe a mistake you made and how you handled it.',
    'Tell me about a deadline you missed. What did you do and learn?',
    'Describe a technical bet that didn\'t pay off.',
    'Tell me about feedback that was hard to hear and what you changed.',
  ],
  delivery: [
    'Tell me about delivering something important under a tight deadline. What did you cut, and why?',
    'Describe a time a project was slipping. What did you do?',
    'Tell me about shipping a large migration without stopping feature work.',
    'Describe how you handled scope creep near a launch.',
    'Tell me about the hardest launch you\'ve been part of.',
  ],
  collaboration: [
    'Tell me about working closely with design, product, or backend to ship something hard.',
    'Describe a cross-team dependency that blocked you and how you unblocked it.',
    'Tell me about working with a backend team on an API that didn\'t fit the UI\'s needs.',
    'Describe how you worked with product to cut scope without losing the goal.',
    'Tell me about collaborating across time zones or with a remote team.',
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
  { key: 'ainative', label: 'AI-native engineering', quizTopics: [], codingTopics: [], href: '/prep?tab=questions&cat=ai-native' },
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
