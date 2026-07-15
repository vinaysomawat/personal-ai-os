'use client'

import { useState, useEffect, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, Sparkles, Settings2 } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { upsertTodayMetric, logWorkout, deleteWorkout } from '../actions'
import { getHealthReport } from '@/features/ai/health-report'
import { computeHealthPlan } from '../calculations'
import { daysAgoIST } from '@/lib/date'
import HealthProfileForm from './HealthProfileForm'
import HealthScoreHero from './HealthScoreHero'
import TodaysPlanCard from './TodaysPlanCard'
import DailyWorkoutCard from './DailyWorkoutCard'
import type { HealthMetric, MetricField, HealthProfile, Workout } from '../types'
import type { DailyWorkout, WorkoutStats } from '../workout-core'

const METRICS: { field: MetricField; label: string; emoji: string; unit: string; decimals?: number }[] = [
  { field: 'weight_kg',      label: 'Weight',   emoji: '⚖️',  unit: 'kg',   decimals: 1 },
  { field: 'calories',       label: 'Calories', emoji: '🔥',  unit: 'kcal' },
  { field: 'protein_g',      label: 'Protein',  emoji: '🥩',  unit: 'g' },
  { field: 'steps',          label: 'Steps',    emoji: '👟',  unit: 'steps' },
]

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => daysAgoIST(6 - i))
}

function MetricCard({ field, label, emoji, unit, decimals = 0, todayValue, weekAvg, onSave, saving, leftText }: {
  field: MetricField; label: string; emoji: string; unit: string; decimals?: number
  todayValue: number | null; weekAvg: number | null; onSave: (v: number) => void; saving: boolean
  leftText?: string | null
}) {
  const [input, setInput] = useState(todayValue !== null ? String(todayValue) : '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const v = parseFloat(input)
    if (isNaN(v) || v <= 0) return
    if (v === todayValue) return
    onSave(v)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-lg p-2.5 hover:border-surface-3/80 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1 truncate">
          <span className="text-sm shrink-0">{emoji}</span>{label}
        </span>
        {saved && <span className="text-xs text-green-400 shrink-0">✓</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          onBlur={handleSave}
          placeholder="—"
          disabled={saving}
          className="text-lg font-bold text-white bg-transparent outline-none w-full placeholder-slate-700"
        />
        <span className="text-xs text-slate-600 shrink-0">{unit}</span>
      </div>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <span className="text-xs text-slate-700 shrink-0">avg {weekAvg !== null ? weekAvg.toFixed(decimals) : '—'}</span>
        {leftText && <span className="text-xs text-accent font-medium truncate">{leftText}</span>}
      </div>
    </div>
  )
}

// Merges the generic recommendations widget + the weekly report into one
// tabbed panel registered as the "Health Coach" advisor (see AIAdvisorProvider).
function HealthCoachContent({ isOpen, context, metrics }: { isOpen: boolean; context: string; metrics: HealthMetric[] }) {
  const [tab, setTab] = useState<'recommendations' | 'report'>('recommendations')
  const [report, setReport] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    if (isOpen && tab === 'report' && !report && !reportLoading) {
      setReportLoading(true)
      getHealthReport(metrics).then(setReport).finally(() => setReportLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab])

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-surface-2 rounded-lg p-0.5">
        <button onClick={() => setTab('recommendations')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'recommendations' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-300'}`}>Recommendations</button>
        <button onClick={() => setTab('report')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'report' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-300'}`}>Weekly Report</button>
      </div>
      {tab === 'recommendations' ? (
        <ModuleRecommendations moduleLabel="Health" context={context} isOpen={isOpen && tab === 'recommendations'} />
      ) : reportLoading ? (
        <div className="space-y-2">
          {[90, 70, 80, 60, 85].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : report ? (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report}</p>
      ) : null}
    </div>
  )
}

interface Props {
  initialMetrics: HealthMetric[]
  initialProfile: HealthProfile | null
  initialWorkouts: Workout[]
  initialDailyWorkout: DailyWorkout | null
  workoutStats: WorkoutStats
}

const WORKOUT_TYPES = ['Strength', 'Cardio', 'Run', 'Yoga', 'Sports', 'Other']

export default function HealthView({ initialMetrics, initialProfile, initialWorkouts, initialDailyWorkout, workoutStats }: Props) {
  const [workoutType, setWorkoutType] = useState('Strength')
  const [workoutDuration, setWorkoutDuration] = useState('')

  const [workouts, updateWorkouts] = useOptimistic(
    initialWorkouts,
    (state: Workout[], action: { type: 'add' | 'delete'; payload: Workout | { id: string } }) => {
      if (action.type === 'add') return [action.payload as Workout, ...state]
      if (action.type === 'delete') return state.filter(w => w.id !== (action.payload as { id: string }).id)
      return state
    }
  )
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState<MetricField | null>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>(initialMetrics)
  const [profile, setProfile] = useState<HealthProfile | null>(initialProfile)
  const [showProfileForm, setShowProfileForm] = useState(false)

  const days = getLast7Days()
  const today = days[6]

  const todayMetric = metrics.find(m => m.date === today) ?? null
  const week = metrics.filter(m => days.includes(m.date))

  const weekAvg = (field: MetricField): number | null => {
    const vals = week.map(m => m[field]).filter((v): v is number => v !== null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }

  const handleMetricSave = (field: MetricField, value: number) => {
    setSaving(field)
    setMetrics(prev => {
      const existing = prev.find(m => m.date === today)
      if (existing) return prev.map(m => m.date === today ? { ...m, [field]: value } : m)
      return [{ id: `temp`, user_id: '', date: today, weight_kg: null, calories: null, protein_g: null, sleep_hours: null, steps: null, water_ml: null, recovery_score: null, notes: null, created_at: new Date().toISOString(), [field]: value }, ...prev]
    })
    upsertTodayMetric(field, value).finally(() => setSaving(null))
  }

  const handleLogWorkout = () => {
    const duration = workoutDuration ? parseInt(workoutDuration, 10) : null
    const type = workoutType
    const optimistic: Workout = {
      id: `temp-${Date.now()}`, user_id: '', date: today, type, duration_minutes: duration, notes: null, created_at: new Date().toISOString(),
    }
    setWorkoutDuration('')
    startTransition(async () => { updateWorkouts({ type: 'add', payload: optimistic }); await logWorkout(type, duration, null) })
  }

  const handleDeleteWorkout = (id: string) => {
    startTransition(async () => { updateWorkouts({ type: 'delete', payload: { id } }); await deleteWorkout(id) })
  }

  const healthPlan = computeHealthPlan(profile, metrics, workouts, today)
  const dailyTargets = healthPlan?.dailyTargets ?? null
  const healthScore = healthPlan?.healthScore ?? null

  const leftText = (field: MetricField): string | null => {
    if (!dailyTargets) return null
    const value = todayMetric?.[field]
    if (field === 'calories') return `${Math.max(0, dailyTargets.dailyCalorieTarget - (value ?? 0))} kcal left of ${dailyTargets.dailyCalorieTarget}`
    if (field === 'protein_g') return `${Math.max(0, dailyTargets.proteinTargetG - (value ?? 0))}g left of ${dailyTargets.proteinTargetG}g`
    if (field === 'steps') return `${Math.max(0, 10000 - (value ?? 0))} steps left of 10,000`
    return null
  }

  const healthContext = `Health Score: ${healthScore?.overall ?? 'not calculated (set up profile)'}/100. Today: weight=${todayMetric?.weight_kg ?? 'not logged'}kg, calories=${todayMetric?.calories ?? 'not logged'}, protein=${todayMetric?.protein_g ?? 'not logged'}g, steps=${todayMetric?.steps ?? 'not logged'}. Workouts today: ${workouts.length ? workouts.map(w => w.type).join(', ') : 'none'}. Goal: get fit — gradual deficit toward a normal BMI.${dailyTargets ? ` Current BMI ${dailyTargets.bmi} (normal ≤24.9, ~${dailyTargets.normalBmiWeightKg}kg at his height), pace ~${dailyTargets.weeklyLossKg}kg/week.` : ''}`

  const advisorOpen = useAIAdvisorOpen()
  const advisorPortal = useAIAdvisor('Health Coach', Sparkles, (
    <HealthCoachContent isOpen={advisorOpen} context={healthContext} metrics={metrics} />
  ))

  return (
    <div className="space-y-4">
      {advisorPortal}
      {profile && dailyTargets && healthScore && (
        <TodaysPlanCard profile={profile} plan={dailyTargets} todayMetric={todayMetric} score={healthScore} today={today} />
      )}

      <DailyWorkoutCard initialWorkout={initialDailyWorkout} stats={workoutStats} />

      {/* Health profile setup — only shown before a profile exists; once it does, the edit link lives on the Health Score card */}
      {!profile && (
        <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">Set up your Health Profile</p>
            <p className="text-xs text-slate-500 mt-1">One-time setup unlocks your calorie targets, macros, and a real Health Score.</p>
          </div>
          <button onClick={() => setShowProfileForm(true)} className="shrink-0 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
            Set up
          </button>
        </div>
      )}
      {profile && !(dailyTargets && healthScore) && (
        <div className="flex justify-end">
          <button onClick={() => setShowProfileForm(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <Settings2 size={12} /> Edit health profile
          </button>
        </div>
      )}

      {showProfileForm && (
        <HealthProfileForm
          profile={profile}
          onClose={() => setShowProfileForm(false)}
          onSaved={p => { setProfile(p); setShowProfileForm(false) }}
        />
      )}

      {/* Health Score */}
      {profile && dailyTargets && healthScore && (
        <HealthScoreHero score={healthScore} onEditProfile={() => setShowProfileForm(true)} />
      )}

      {/* Stats — current weight/workouts always shown, targets/BMI added once a plan can be computed */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <StatTile value={todayMetric?.weight_kg ?? '—'} label="Weight (kg)" />
        <StatTile value={workouts.length} label="Workouts today" />
        {dailyTargets && <StatTile value={dailyTargets.bmi} label={`BMI (normal ≤24.9, ~${dailyTargets.normalBmiWeightKg}kg)`} />}
        {dailyTargets && <StatTile value={dailyTargets.dailyCalorieTarget} label="kcal target" />}
        {dailyTargets && <StatTile value={`${dailyTargets.proteinTargetG}g`} label="protein target" />}
        {dailyTargets && <StatTile value={`${dailyTargets.carbsG}g`} label="carbs target" />}
        {dailyTargets && <StatTile value={`${dailyTargets.fatG}g`} label="fat target" />}
      </div>

      {profile && !dailyTargets && (
        <p className="text-xs text-slate-600 -mt-2">Log today&apos;s weight below to unlock your calorie targets and Health Score.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* Today's metrics */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300">Today&apos;s Metrics</h3>
          <span className="text-xs text-slate-600">Press Enter to save</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
          {METRICS.map(m => (
            <MetricCard
              key={m.field}
              {...m}
              todayValue={todayMetric?.[m.field] ?? null}
              weekAvg={weekAvg(m.field)}
              onSave={v => handleMetricSave(m.field, v)}
              saving={saving === m.field}
              leftText={leftText(m.field)}
            />
          ))}
        </div>
      </div>

      {/* Workouts */}
      <Card title="Workouts" padding="p-3.5" action={<span className="text-xs text-slate-500">{workouts.length} today</span>}>
        <div className="flex gap-2 mb-3">
          <select
            value={workoutType}
            onChange={e => setWorkoutType(e.target.value)}
            className="bg-surface-2 border border-surface-3 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors"
          >
            {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="number"
            min={1}
            value={workoutDuration}
            onChange={e => setWorkoutDuration(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogWorkout()}
            placeholder="Minutes (optional)"
            className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleLogWorkout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={14} />
            Log
          </button>
        </div>
        {workouts.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-3">No workouts logged today</p>
        ) : (
          <ul className="space-y-1">
            {workouts.map(w => (
              <li key={w.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
                <span className="flex-1 text-sm text-slate-200">{w.type}{w.duration_minutes ? ` — ${w.duration_minutes} min` : ''}</span>
                <button onClick={() => handleDeleteWorkout(w.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </div>
  )
}
