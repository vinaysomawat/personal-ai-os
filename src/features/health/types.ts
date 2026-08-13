export type MetricField = 'weight_kg' | 'calories' | 'protein_g' | 'steps' | 'recovery_score'

export interface HealthMetric {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  calories: number | null
  protein_g: number | null
  steps: number | null
  recovery_score: number | null
  notes: string | null
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  date: string
  type: string
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Gender = 'male' | 'female' | 'other'

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary',   label: 'Sedentary (little to no exercise)' },
  { value: 'light',       label: 'Light (1-3 days/week)' },
  { value: 'moderate',    label: 'Moderate (3-5 days/week)' },
  { value: 'active',      label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very active (physical job or 2x/day training)' },
]

export interface HealthProfile {
  id: string
  user_id: string
  age: number | null
  gender: Gender | null
  height_cm: number | null
  target_weight_kg: number | null
  activity_level: ActivityLevel | null
  workout_days_per_week: number | null
  food_preference: string | null
  goal_deadline: string | null
  updated_at: string
}
