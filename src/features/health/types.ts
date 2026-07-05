export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  created_at: string
}

export interface HabitLog {
  id: string
  user_id: string
  habit_id: string
  date: string
  created_at: string
}

export interface HabitWithLogs extends Habit {
  logs: HabitLog[]
}

export type MetricField = 'weight_kg' | 'calories' | 'protein_g' | 'sleep_hours' | 'steps' | 'water_ml'

export interface HealthMetric {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  calories: number | null
  protein_g: number | null
  sleep_hours: number | null
  steps: number | null
  water_ml: number | null
  notes: string | null
  created_at: string
}
