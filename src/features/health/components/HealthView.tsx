'use client'

import { useState, useEffect, useOptimistic, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { Sparkles, Settings2, Dumbbell } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { upsertTodayMetric, logWorkout, deleteWorkout } from '../actions'
import { getHealthReport } from '@/features/ai/health-report'
import { computeHealthPlan } from '../calculations'
import { daysAgoIST } from '@/lib/date'
import HealthProfileForm from './HealthProfileForm'
import HealthScoreHero from './HealthScoreHero'
import DailyWorkoutCard from './DailyWorkoutCard'
import { logAdvisorUsage } from '@/lib/advisor-usage'
import type { HealthMetric, MetricField, HealthProfile, Workout } from '../types'
import type { DailyWorkout, WorkoutStats } from '../workout-core'

// recharts is a ~100KB client-only dependency used nowhere else on this
// page — code-split it out of the initial bundle rather than block paint.
const HealthTrend = dynamic(() => import('./HealthTrend'), {
  ssr: false,
  loading: () => <div className="h-[16.5rem] bg-surface-1 border border-surface-3 rounded-xl animate-pulse" />,
})

const METRICS: { field: MetricField; label: string; unit: string; decimals?: number }[] = [
  { field: 'weight_kg',      label: 'Weight',   unit: 'kg',   decimals: 1 },
  { field: 'calories',       label: 'Calories', unit: 'kcal' },
  { field: 'protein_g',      label: 'Protein',  unit: 'g' },
  { field: 'steps',          label: 'Steps',    unit: 'steps' },
]

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
      <p className="text-[11px] text-fg-tertiary uppercase">{label}</p>
      <p className="text-xl font-bold text-fg-primary mt-1">{value}</p>
    </div>
  )
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => daysAgoIST(6 - i))
}

// Design's healthMetrics tile is a stat-tile card (uppercase label, big
// value+unit, "7d avg X" caption) — this used to be a small boxy card with
// an emoji label inside a "Today's Metrics" wrapper Card; promoted to a
// top-level stat tile row matching the design and every other module's tile
// style, while keeping the always-editable input (nicer UX than a
// click-to-reveal edit affordance, kept as a real improvement over the mock).
function MetricCard({ label, unit, decimals = 0, todayValue, weekAvg, onSave, saving, leftText }: {
  label: string; unit: string; decimals?: number
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
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-fg-tertiary uppercase">{label}</p>
        {saved && <span className="text-xs text-green-400 shrink-0">✓</span>}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          onBlur={handleSave}
          placeholder="—"
          disabled={saving}
          className="text-xl font-bold text-fg-primary bg-transparent outline-none w-full placeholder-fg-quaternary"
        />
        <span className="text-xs text-fg-quaternary shrink-0">{unit}</span>
      </div>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <span className="text-[11px] text-fg-tertiary shrink-0">7d avg {weekAvg !== null ? weekAvg.toFixed(decimals) : '—'}</span>
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
        <button onClick={() => { setTab('recommendations'); logAdvisorUsage('Health Coach', 'recommendations') }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'recommendations' ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>Recommendations</button>
        <button onClick={() => { setTab('report'); logAdvisorUsage('Health Coach', 'report') }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'report' ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>Weekly Report</button>
      </div>
      {tab === 'recommendations' ? (
        <ModuleRecommendations moduleLabel="Health" context={context} isOpen={isOpen && tab === 'recommendations'} />
      ) : reportLoading ? (
        <div className="space-y-2">
          {[90, 70, 80, 60, 85].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : report ? (
        <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">{report}</p>
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

  const healthScoreTier = healthScore
    ? (healthScore.overall >= 85 ? 'Excellent' : healthScore.overall >= 65 ? 'Good' : healthScore.overall >= 40 ? 'Needs Work' : 'Getting Started')
    : null
  const healthScoreBadgeColor = healthScore
    ? (healthScore.overall >= 85 ? 'text-good' : healthScore.overall >= 65 ? 'text-accent' : healthScore.overall >= 40 ? 'text-amber-400' : 'text-red-400')
    : ''
  const workoutStatusLabel = { pending: '🏋️ Workout pending', in_progress: '🏋️ Workout in progress', completed: '🏋️ Workout done', skipped: '🏋️ Workout skipped' }[initialDailyWorkout?.status ?? 'pending']

  return (
    <div className="space-y-3">
      {advisorPortal}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Health</h1>
        {healthScore && (
          <span className={`text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 ${healthScoreBadgeColor}`}>{healthScore.overall}/100 · {healthScoreTier}</span>
        )}
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">{workoutStatusLabel}</span>
      </div>

      {/* Health profile setup — only shown before a profile exists; once it does, the edit link lives on the Health Score card */}
      {!profile && (
        <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-fg-primary">Set up your Health Profile</p>
            <p className="text-xs text-fg-tertiary mt-1">One-time setup unlocks your calorie targets, macros, and a real Health Score.</p>
          </div>
          <button onClick={() => setShowProfileForm(true)} className="shrink-0 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
            Set up
          </button>
        </div>
      )}

      {/* Editable daily metrics — top-level stat tiles, matching design's
          healthMetrics row (promoted out of a "Today's Metrics" card wrapper). */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
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

      {showProfileForm && (
        <HealthProfileForm
          profile={profile}
          onClose={() => setShowProfileForm(false)}
          onSaved={p => { setProfile(p); setShowProfileForm(false) }}
        />
      )}

      {/* Daily Workout Planner + Health Score — side by side, matching design's
          two-column grouping instead of stacking full-width. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DailyWorkoutCard initialWorkout={initialDailyWorkout} stats={workoutStats} />
        {profile && dailyTargets && healthScore ? (
          <HealthScoreHero score={healthScore} onEditProfile={() => setShowProfileForm(true)} />
        ) : profile ? (
          <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)] flex items-center justify-between gap-3">
            <p className="text-xs text-fg-quaternary">Log today&apos;s weight to unlock your calorie targets and Health Score.</p>
            <button onClick={() => setShowProfileForm(true)} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-border-strong text-[11.5px] text-fg-secondary hover:bg-surface-2 transition-colors">
              <Settings2 size={11} /> Edit profile
            </button>
          </div>
        ) : null}
      </div>

      <HealthTrend metrics={metrics} />

      {/* Computed targets — a second stat-tile row, matching design's
          separate BMI/Calorie/Protein/Workouts-per-week group. */}
      {dailyTargets && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatTile value={dailyTargets.bmi} label={`BMI (normal ≤24.9, ~${dailyTargets.normalBmiWeightKg}kg)`} />
          <StatTile value={`${dailyTargets.dailyCalorieTarget} kcal`} label="Calorie Target" />
          <StatTile value={`${dailyTargets.proteinTargetG}g`} label="Protein Target" />
          <StatTile value={`${dailyTargets.carbsG}g / ${dailyTargets.fatG}g`} label="Carbs / Fat Target" />
        </div>
      )}

      {/* Workouts log */}
      <Card title="Workouts" action={<span className="text-xs text-fg-tertiary">{workouts.length} today</span>}>
        <div className="flex gap-2 mb-3">
          <select
            value={workoutType}
            onChange={e => setWorkoutType(e.target.value)}
            className="bg-surface-2 border border-surface-3 rounded-[8px] px-2 py-2 text-xs text-fg-secondary outline-none focus:border-accent transition-colors"
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
            className="flex-1 bg-surface-2 border border-surface-3 rounded-[8px] px-[11px] py-2 text-[12.5px] text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleLogWorkout}
            className="px-3.5 py-2 rounded-[8px] bg-accent text-white text-[12.5px] font-semibold hover:bg-accent/80 transition-colors whitespace-nowrap"
          >
            + Log
          </button>
        </div>
        {workouts.length === 0 ? (
          <EmptyState icon={Dumbbell} message="No workouts logged today" compact />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {workouts.map(w => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-1 group">
                <span className="text-[12.5px] text-fg-secondary">{w.type}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12.5px] text-fg-secondary">{w.duration_minutes ? `${w.duration_minutes} min · ` : ''}{w.date}</span>
                  <button onClick={() => handleDeleteWorkout(w.id)} aria-label="Delete workout" className="shrink-0 opacity-0 group-hover:opacity-100 text-fg-quaternary hover:text-red-400 text-[11px] p-0.5 transition-all">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
