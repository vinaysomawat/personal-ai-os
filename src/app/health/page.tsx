import HealthView from '@/features/health/components/HealthView'
import { getHealthMetrics, getHealthProfile, getTodaysWorkouts, getHealthCalendarData, getTodaysFoodLog } from '@/features/health/actions'
import { getActiveOrGenerateWorkout, getWorkoutStats } from '@/features/health/daily-workout'

export default async function HealthPage() {
  const [metrics, profile, workouts, dailyWorkout, workoutStats, calendar, foodLog] = await Promise.all([
    getHealthMetrics(30),
    getHealthProfile(),
    getTodaysWorkouts(),
    getActiveOrGenerateWorkout(),
    getWorkoutStats(),
    getHealthCalendarData(),
    getTodaysFoodLog(),
  ])
  return (
    <HealthView
      initialMetrics={metrics}
      initialProfile={profile}
      initialWorkouts={workouts}
      initialDailyWorkout={dailyWorkout}
      workoutStats={workoutStats}
      calendar={calendar}
      initialFoodLog={foodLog}
    />
  )
}
