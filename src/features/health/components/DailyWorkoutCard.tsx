'use client'

import { useState, useTransition } from 'react'
import { Flame, Trophy, CheckCircle2, SkipForward, Clock, Zap, Dumbbell } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { completeWorkout, skipWorkout, getActiveOrGenerateWorkout } from '../daily-workout'
import type { DailyWorkout, WorkoutStats } from '../workout-core'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-amber-400' },
  in_progress: { label: 'In Progress', color: 'text-accent' },
  completed: { label: 'Completed', color: 'text-green-400' },
  skipped: { label: 'Skipped', color: 'text-fg-tertiary' },
}

interface Props {
  initialWorkout: DailyWorkout | null
  stats: WorkoutStats
}

export default function DailyWorkoutCard({ initialWorkout, stats }: Props) {
  const [workout, setWorkout] = useState(initialWorkout)
  const [showDetail, setShowDetail] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!workout) {
    return (
      <div className="h-full bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
        <h2 className="text-[13px] font-bold text-fg-primary mb-3">Daily Workout Planner</h2>
        <EmptyState icon={Dumbbell} message="No workout library found yet — run the pending migration to get started." />
      </div>
    )
  }

  const w = workout.workout
  const status = STATUS_CONFIG[workout.status]

  const handleComplete = () => {
    setWorkout(prev => prev ? { ...prev, status: 'completed' } : prev)
    startTransition(async () => {
      await completeWorkout(workout.id)
      setWorkout(await getActiveOrGenerateWorkout())
    })
  }
  const handleSkip = () => {
    setWorkout(prev => prev ? { ...prev, status: 'skipped' } : prev)
    startTransition(async () => {
      await skipWorkout(workout.id)
      setWorkout(await getActiveOrGenerateWorkout())
    })
  }

  const isDone = workout.status === 'completed' || workout.status === 'skipped'

  return (
    <div className="h-full bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
      <div className="flex items-center justify-between mb-2.5 gap-2.5">
        <h2 className="text-[13px] font-bold text-fg-primary whitespace-nowrap">Daily Workout Planner</h2>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="flex items-center gap-1 text-amber-400"><Flame size={12} /> {stats.currentStreakDays}d streak</span>
          <span className="flex items-center gap-1 text-fg-tertiary"><Trophy size={12} /> {stats.totalCompleted} completed</span>
          <span className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[6px] bg-border whitespace-nowrap ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/15 text-accent">{w.category}</span>
      </div>
      <p className={`text-[14px] font-semibold ${isDone ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{w.name}</p>
      <div className="flex items-center gap-3 mt-0.5 text-[12.5px] text-fg-tertiary flex-wrap">
        <span className="flex items-center gap-1"><Clock size={11} /> {w.duration_minutes} min</span>
        <span className="flex items-center gap-1"><Zap size={11} /> ~{w.estimated_calories} kcal</span>
        <span>{w.primary_muscles.join(', ')}</span>
      </div>

      <div className="flex items-center gap-2 mt-3.5 flex-wrap">
        {!isDone && (
          <>
            <button onClick={handleComplete} disabled={isPending} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] bg-good text-on-good text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
              <CheckCircle2 size={12} /> Complete
            </button>
            <button onClick={handleSkip} disabled={isPending} className="flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] border border-border-strong text-fg-secondary text-[12.5px] hover:bg-surface-2 disabled:opacity-50 transition-colors">
              <SkipForward size={12} /> Skip
            </button>
          </>
        )}
        <button onClick={() => setShowDetail(v => !v)} className="text-accent text-xs hover:text-accent-strong transition-colors py-2 ml-auto">
          {showDetail ? 'Hide full workout' : 'Show full workout'}
        </button>
      </div>

      {showDetail && (
        <div className="mt-3.5 pt-3.5 border-t border-surface-3 space-y-4 text-sm">
          <div>
            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Warmup</p>
            <ul className="space-y-1">
              {w.warmup.map((item, i) => <li key={i} className="text-fg-secondary text-xs">• {item}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Exercises</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-fg-quaternary text-left">
                    <th className="py-1 pr-2 font-medium">Exercise</th>
                    <th className="py-1 px-2 font-medium">Sets</th>
                    <th className="py-1 px-2 font-medium">Reps</th>
                    <th className="py-1 px-2 font-medium">Rest</th>
                    <th className="py-1 px-2 font-medium">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {w.exercises.map((ex, i) => (
                    <tr key={i} className="border-t border-surface-3">
                      <td className="py-1.5 pr-2 text-fg-secondary">{ex.name}<p className="text-fg-quaternary">{ex.notes}</p></td>
                      <td className="py-1.5 px-2 text-fg-secondary">{ex.sets}</td>
                      <td className="py-1.5 px-2 text-fg-secondary">{ex.reps}</td>
                      <td className="py-1.5 px-2 text-fg-secondary">{ex.rest}</td>
                      <td className="py-1.5 px-2 text-fg-secondary">{ex.rpe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {w.cardio && (
            <div>
              <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Cardio Finisher</p>
              <p className="text-xs text-fg-secondary">{w.cardio.type} — {w.cardio.duration}, {w.cardio.intensity} ({w.cardio.targetHeartRateZone})</p>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Cooldown</p>
            <ul className="space-y-1">
              {w.cooldown.map((item, i) => <li key={i} className="text-fg-secondary text-xs">• {item}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Coach Tips</p>
            <ul className="space-y-1">
              {w.coach_tips.map((tip, i) => <li key={i} className="text-xs text-accent/90">💡 {tip}</li>)}
            </ul>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {w.tags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-fg-tertiary">{tag}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
