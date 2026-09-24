export type ResourceType = 'course' | 'book' | 'video' | 'article' | 'podcast'
export type ResourceStatus = 'not-started' | 'in-progress' | 'completed'

export interface Resource {
  id: string
  user_id: string
  title: string
  type: ResourceType
  url: string | null
  category: string
  status: ResourceStatus
  progress: number
  notes: string | null
  created_at: string
  // Linked Planner task ("Read: {title}") — null for resources added before
  // this sync existed; not backfilled.
  task_id: string | null
  // Set on entering 'completed', null otherwise (2026-09-24 migration).
  completed_at?: string | null
  estimated_minutes: number | null
}

// AI-recommended resource. `url` is the model's own self-reported best guess
// (see study-plan.ts's recommendResources), not web-search-verified — that
// was removed 2026-09-23 after a single search call on the same-shaped
// recommendDailyRead pulled back 80k+ tokens of page content, enough alone
// to exhaust a day's AI budget; still nullable when the model isn't
// confident a URL exists. The UI opens the existing Add Resource form
// pre-filled with this data (including the url, if given) instead of
// inserting it directly, so it's always reviewable before saving.
export interface RecommendedResource {
  title: string
  type: ResourceType
  category: string
  reason: string
  url: string | null
}

// Graded multiple-choice quiz — same shape as Career's QuizQuestion, mirrored
// here rather than imported cross-module (Learning and Career are independent
// features; sharing a type import would create a coupling neither needs).
export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  subtopic: string
}

export interface ResourceQuizAttempt {
  id: string
  user_id: string
  resource_id: string | null
  resource_title: string
  category: string
  questions: QuizQuestion[]
  user_answers: number[]
  score: number
  total: number
  weak_areas: string[]
  created_at: string
}
