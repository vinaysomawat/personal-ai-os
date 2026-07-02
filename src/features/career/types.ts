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
