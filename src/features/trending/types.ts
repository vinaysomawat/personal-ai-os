export interface TrendingReading {
  id: string
  user_id: string
  assigned_date: string
  title: string
  url: string
  source: string
  points: number | null
  completed: boolean
  completed_at: string | null
  task_id: string | null
  created_at: string
}
