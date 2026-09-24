'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Settings2 } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { upsertTodayMetric, upsertHealthProfile, deleteFoodEntry } from '../actions'
import { getHealthReport } from '@/features/ai/health-report'
import { computeHealthPlan, suggestActivityLevel, computeWeightTrend } from '../calculations'
import { daysAgoIST } from '@/lib/date'
import HealthProfileForm from './HealthProfileForm'
import HealthScoreHero from './HealthScoreHero'
import DailyWorkoutCard from './DailyWorkoutCard'
import WorkoutCalendar from './WorkoutCalendar'
import WeightTrendCard from './WeightTrendCard'
import TodaysFoodCard from './TodaysFoodCard'
import { logAdvisorUsage } from '@/lib/advisor-usage'
import { ACTIVITY_LEVELS } from '../types'
import type { HealthMetric, MetricField, HealthProfile, Workout } from '../types'
import type { FoodLogEntry } from '../food-log'
import type { DailyWorkout, WorkoutStats } from '../workout-core'
import type { WorkoutCalendarDay } from '../actions'
import PageHeader, { HeaderChip } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'

const METRICS: { field: MetricField; label: string; unit: string; decimals?: number }[] = [
  { field: 'weight_kg',      label: 'Weight',   unit: 'kg',   decimals: 1 },
  { field: 'calories',       label: 'Calories', unit: 'kcal' },
  { field: 'protein_g',      label: 'Protein',  unit: 'g' },
  { field: 'steps',          label: 'Steps',    unit: 'steps' },
]

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
        <span className="text-xs text-fg-tertiary shrink-0">{unit}</span>
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
  tip: string | null
  calendar: WorkoutCalendarDay[]
  initialFoodLog: FoodLogEntry[]
}

// Window for the activity check and Workouts / Week tile.
const ACTIVITY_WINDOW_DAYS = 28

export default function HealthView({ initialMetrics, initialProfile, initialWorkouts, initialDailyWorkout, workoutStats, tip, calendar, initialFoodLog }: Props) {
  const workouts = initialWorkouts
  const [saving, setSaving] = useState<MetricField | null>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>(initialMetrics)
  const [profile, setProfile] = useState<HealthProfile | null>(initialProfile)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>(initialFoodLog)

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
      return [{ id: `temp`, user_id: '', date: today, weight_kg: null, calories: null, protein_g: null, steps: null, recovery_score: null, notes: null, created_at: new Date().toISOString(), [field]: value }, ...prev]
    })
    upsertTodayMetric(field, value).finally(() => setSaving(null))
  }

  const healthPlan = computeHealthPlan(profile, metrics, workouts, today)
  const dailyTargets = healthPlan?.dailyTargets ?? null
  const healthScore = healthPlan?.healthScore ?? null

  // Real activity over the last 4 weeks — workout days from the calendar
  // (the `workouts` table), avg steps from logged days only. No new query.
  const windowStart = daysAgoIST(ACTIVITY_WINDOW_DAYS - 1)
  const workoutDays = calendar.filter(d => d.date >= windowStart && d.status === 'done').length
  const workoutsPerWeek = Math.round((workoutDays / ACTIVITY_WINDOW_DAYS) * 7 * 10) / 10
  const stepVals = metrics.filter(m => m.date >= windowStart && m.steps !== null).map(m => Number(m.steps))
  const avgSteps = stepVals.length >= 7 ? Math.round(stepVals.reduce((s, v) => s + v, 0) / stepVals.length) : null
  const suggestedLevel = suggestActivityLevel(workoutsPerWeek, avgSteps)
  // Only nudge when the profile's level disagrees with the data and there's
  // enough step data to trust it.
  const activityMismatch = profile?.activity_level && avgSteps !== null && suggestedLevel !== profile.activity_level
    ? { level: suggestedLevel, target: computeHealthPlan({ ...profile, activity_level: suggestedLevel }, metrics, workouts, today)?.dailyTargets.dailyCalorieTarget ?? null }
    : null
  const levelLabel = (l: string) => ACTIVITY_LEVELS.find(a => a.value === l)?.label.split(' (')[0] ?? l

  const handleApplyActivityLevel = () => {
    if (!profile || !activityMismatch) return
    const next = { ...profile, activity_level: activityMismatch.level }
    setProfile(next)
    upsertHealthProfile({
      age: next.age, gender: next.gender, height_cm: next.height_cm, activity_level: next.activity_level,
      workout_days_per_week: next.workout_days_per_week, food_preference: next.food_preference,
    })
  }

  const weightTrend = computeWeightTrend(metrics, dailyTargets?.normalBmiWeightKg ?? null)

  // Removing an item also subtracts it from today's Calories/Protein tiles,
  // mirroring what deleteFoodEntry does to health_metrics server-side.
  const handleDeleteFood = (entry: FoodLogEntry) => {
    setFoodLog(prev => prev.filter(f => f.id !== entry.id))
    setMetrics(prev => prev.map(m => m.date === entry.date ? {
      ...m,
      calories: m.calories !== null ? Math.max(0, m.calories - Number(entry.calories)) : m.calories,
      protein_g: m.protein_g !== null ? Math.max(0, m.protein_g - Number(entry.protein_g)) : m.protein_g,
    } : m))
    deleteFoodEntry(entry.id)
  }

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

  // Until something the score actually reads (calories, protein, steps, a
  // workout — not weight) is logged today, the daily score is a meaningless
  // 0 — show yesterday's score in the header instead of a red "0 · Getting
  // Started". Yesterday's workouts come from the calendar (already fetched).
  const loggedToday = workouts.length > 0 || (!!todayMetric && (todayMetric.calories !== null || todayMetric.protein_g !== null || todayMetric.steps !== null))
  const yesterday = days[5]
  const calendarWorkouts = calendar.filter(d => d.status === 'done').map(d => ({ date: d.date }) as Workout)
  const yesterdayScore = !loggedToday && metrics.some(m => m.date === yesterday)
    ? computeHealthPlan(profile, metrics, calendarWorkouts, yesterday)?.healthScore.overall ?? null
    : null

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
      <PageHeader title="Health" chips={<>
        {healthScore && (loggedToday ? (
          <HeaderChip className={`bg-surface-2 ${healthScoreBadgeColor}`}>{healthScore.overall}/100 · {healthScoreTier}</HeaderChip>
        ) : (
          <HeaderChip>{yesterdayScore !== null ? `${yesterdayScore}/100 yesterday · log today` : 'Nothing logged yet today'}</HeaderChip>
        ))}
        <HeaderChip>{workoutStatusLabel}</HeaderChip>
      </>} />

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
        {METRICS.map(m => (
          <MetricCard
            key={`${m.field}-${todayMetric?.[m.field] ?? ''}`}
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
          two-column grouping instead of stacking full-width. No items-start
          here (unlike other card-pair rows) since these two are meant to
          match height, not size independently to their own content. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)]">
        <DailyWorkoutCard initialWorkout={initialDailyWorkout} stats={workoutStats} />
        {profile && dailyTargets && healthScore ? (
          <HealthScoreHero
            score={healthScore}
            notLoggedYet={!loggedToday}
            onEditProfile={() => setShowProfileForm(true)}
            notice={activityMismatch && profile?.activity_level && (
              <div className="mt-3 pt-2.5 border-t border-surface-3 flex items-center justify-between gap-2 flex-wrap text-[11.5px]">
                <p className="text-fg-tertiary">
                  Profile says <span className="text-fg-secondary font-medium">{levelLabel(profile.activity_level)}</span>; last 4 weeks look <span className="text-warn font-semibold">{levelLabel(activityMismatch.level)}</span> ({workoutsPerWeek} workouts/wk, ~{avgSteps?.toLocaleString('en-IN')} steps){activityMismatch.target !== null && <> → target <span className="text-fg-secondary font-medium">{activityMismatch.target} kcal</span></>}
                </p>
                <button onClick={handleApplyActivityLevel} className="shrink-0 px-2.5 py-1 rounded-[6px] bg-accent text-white text-[11.5px] font-semibold hover:bg-accent/80 transition-colors">Update</button>
              </div>
            )}
          />
        ) : profile ? (
          <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)] flex items-center justify-between gap-3">
            <p className="text-xs text-fg-tertiary">Log today&apos;s weight to unlock your calorie targets and Health Score.</p>
            <button onClick={() => setShowProfileForm(true)} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-border-strong text-[11.5px] text-fg-secondary hover:bg-surface-2 transition-colors">
              <Settings2 size={11} /> Edit profile
            </button>
          </div>
        ) : null}
      </div>

      {/* Computed targets — a second stat-tile row, matching design's
          separate BMI/Calorie/Protein/Workouts-per-week group. */}
      {dailyTargets && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
          <StatCard value={dailyTargets.bmi} label="BMI" sub={`normal ≤24.9 · ~${dailyTargets.normalBmiWeightKg}kg`} />
          <StatCard value={`${dailyTargets.dailyCalorieTarget} kcal`} label="Calorie Target" sub={`${dailyTargets.carbsG}g carbs · ${dailyTargets.fatG}g fat`} />
          <StatCard value={`${dailyTargets.proteinTargetG}g`} label="Protein Target" sub="2g/kg of normal-BMI weight" />
          <StatCard value={`${workoutsPerWeek}${profile?.workout_days_per_week ? ` / ${profile.workout_days_per_week}` : ''}`} label="Workouts / Week" sub="actual vs plan · last 4 weeks" />
        </div>
      )}

      {/* Weight Trend + Today's Food — "is the plan working" (trend vs. plan
          pace) next to today's per-item intake behind the Calories/Protein
          tiles. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <WeightTrendCard trend={weightTrend} targetPaceKg={dailyTargets?.weeklyLossKg ?? null} normalBmiWeightKg={dailyTargets?.normalBmiWeightKg ?? null} />
        <TodaysFoodCard entries={foodLog} onDelete={handleDeleteFood} />
      </div>

      {/* Health Tip of the Day + Workout Calendar side by side, matching the
          design's shared calendar-widget pattern (same pairing as Coding's
          Today's Question + Contribution Calendar). Health Tip moved here
          2026-08-21 (was its own standalone card above), replacing the
          ad-hoc Workouts log — that logging capability stays available via
          the Daily Workout Planner above and the Health Telegram bot. */}
      {tip ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-[22px] leading-none">💡</div>
              <div>
                <p className="text-[13px] font-bold text-fg-primary mb-1">Health Tip of the Day</p>
                <p className="text-[12.5px] leading-[1.5] text-fg-secondary">{tip}</p>
              </div>
            </div>
          </Card>
          <Card>
            <WorkoutCalendar days={calendar} title="Workout Calendar" currentStreak={workoutStats.currentStreakDays} weeklyPlan={profile?.workout_days_per_week ?? null} />
          </Card>
        </div>
      ) : (
        <Card>
          <WorkoutCalendar days={calendar} title="Workout Calendar" currentStreak={workoutStats.currentStreakDays} weeklyPlan={profile?.workout_days_per_week ?? null} />
        </Card>
      )}
    </div>
  )
}
