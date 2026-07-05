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
}

export interface StudyLog {
  id: string
  user_id: string
  date: string
  resource_id: string | null
  duration_minutes: number
  notes: string | null
  created_at: string
}
