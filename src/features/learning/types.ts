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
  estimated_minutes: number | null
}

// AI-recommended resource. `url` is web-search-verified (see study-plan.ts's
// recommendResources — the model must confirm a real page exists before
// including it, never guess) rather than model-invented; still nullable
// since search can genuinely turn up nothing. The UI opens the existing Add
// Resource form pre-filled with this data (including the url, if found)
// instead of inserting it directly, so it's always reviewable before saving.
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
