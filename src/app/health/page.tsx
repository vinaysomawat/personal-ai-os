import HealthView from '@/features/health/components/HealthView'
import { getHealthMetrics, getHealthProfile, getTodaysWorkouts, getTodaysHealthTip, getHealthCalendarData } from '@/features/health/actions'
import { getActiveOrGenerateWorkout, getWorkoutStats } from '@/features/health/daily-workout'

export default async function HealthPage() {
  const [metrics, profile, workouts, dailyWorkout, workoutStats, tip, calendar] = await Promise.all([
    getHealthMetrics(30),
    getHealthProfile(),
    getTodaysWorkouts(),
    getActiveOrGenerateWorkout(),
    getWorkoutStats(),
    getTodaysHealthTip(),
    getHealthCalendarData(),
  ])
  return (
    <HealthView
      initialMetrics={metrics}
      initialProfile={profile}
      initialWorkouts={workouts}
      initialDailyWorkout={dailyWorkout}
      workoutStats={workoutStats}
      tip={tip}
      calendar={calendar}
    />
  )
}
