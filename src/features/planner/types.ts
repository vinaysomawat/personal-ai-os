export type Priority = 'high' | 'medium' | 'low'
export type Recurrence = 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  user_id: string
  text: string
  done: boolean
  priority: Priority
  area: string
  due_date: string | null
  recurrence: Recurrence | null
  created_at: string
}

export interface FocusSession {
  id: string
  user_id: string
  duration_minutes: number
  label: string | null
  notes: string | null
  date: string
  created_at: string
}
