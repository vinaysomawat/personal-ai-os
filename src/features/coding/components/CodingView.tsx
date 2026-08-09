'use client'

import { Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { formatGoalsContext } from '@/features/goals/format'
import DailyCodingCard from './DailyCodingCard'
import CodingCalendar from './CodingCalendar'
import CodingSettingsPopover from './CodingSettingsPopover'
import QuestionHistory from './QuestionHistory'
import RecommendedQuestions from './RecommendedQuestions'
import TodaysQuizCard from './TodaysQuizCard'
import type { ResolvedGoal } from '@/features/goals/types'
import type { QuizQuestion } from '../todays-quiz'
import type { TodaysQuizAttempt } from '../todays-quiz-actions'
import { computeWeakAreas, type DailyQuestion, type CodingStats, type CalendarDay, type CodingSettings } from '../daily-core'

interface Props {
  dailyAssignment: DailyQuestion[]
  codingStats: CodingStats
  calendar: CalendarDay[]
  codingSettings: CodingSettings
  history: DailyQuestion[]
  goals: ResolvedGoal[]
  quizQuestions: QuizQuestion[]
  quizAttempt: TodaysQuizAttempt | null
}

const MODE_LABEL: Record<CodingSettings['mode'], (fixedCount: number) => string> = {
  rotation: () => 'Rotation',
  fixed: fixedCount => `Fixed · ${fixedCount}/day`,
}

export default function CodingView({ dailyAssignment, codingStats, calendar, codingSettings, history, goals, quizQuestions, quizAttempt }: Props) {
  const codingContext = `Current streak: ${codingStats.currentStreak}d (longest: ${codingStats.longestStreak}d). Total solved: ${codingStats.totalSolved} (${codingStats.easySolved} easy, ${codingStats.mediumSolved} medium, ${codingStats.hardSolved} hard). Completion rate: ${codingStats.completionRate}%.${formatGoalsContext(goals)}`

  const advisorOpen = useAIAdvisorOpen()
  const advisorPortal = useAIAdvisor('Code Mentor', Sparkles, (
    <ModuleRecommendations moduleLabel="Coding" context={codingContext} isOpen={advisorOpen} />
  ))

  // Deterministic (Product Principle 2), computed from `history` — already
  // fetched for Practice Log below, so this standalone card is a free read,
  // not a new query. Previously this data only surfaced inside Recommended
  // for You's pills, and only after clicking "Get Recommendations".
  const weakAreas = computeWeakAreas(history)

  return (
    <div className="space-y-5">
      {advisorPortal}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.02em] text-fg-primary">Coding</h1>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">🔥 {codingStats.currentStreak}-day streak</span>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">{MODE_LABEL[codingSettings.mode](codingSettings.fixed_count)}</span>
      </div>

      {/* Streak/Solved/Completion/Assignment — persistent top-level stats,
          matching the design; previously Streak/Solved lived only as small
          chips inside DailyCodingCard's header, and Assignment mode was
          never shown on the page at all (only inside the settings modal). */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <p className="text-[11px] text-fg-tertiary uppercase">Streak</p>
          <p className="text-xl font-bold text-fg-primary mt-1">🔥 {codingStats.currentStreak} days</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <p className="text-[11px] text-fg-tertiary uppercase">Solved</p>
          <p className="text-xl font-bold text-fg-primary mt-1">{codingStats.totalSolved}</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <p className="text-[11px] text-fg-tertiary uppercase">Completion rate</p>
          <p className="text-xl font-bold text-fg-primary mt-1">{codingStats.completionRate}%</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-fg-tertiary uppercase">Assignment</p>
            <p className="text-sm font-bold text-fg-primary mt-1 truncate">{MODE_LABEL[codingSettings.mode](codingSettings.fixed_count)}</p>
          </div>
          <CodingSettingsPopover initialSettings={codingSettings} />
        </div>
      </div>

      {weakAreas.length > 0 && (
        <Card title="Weak Areas">
          <p className="text-[11px] text-fg-tertiary mb-3">Topics with ≥2 attempts where struggles recur, worst first</p>
          <div className="flex flex-col gap-2.5">
            {weakAreas.slice(0, 5).map(w => (
              <div key={w.topic}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="font-semibold text-fg-primary">{w.topic}</span>
                  <span className="text-fg-tertiary">{w.strugglingCount} of {w.total} struggled · {w.struggleRate}%</span>
                </div>
                <div className="h-[5px] rounded-[3px] bg-border">
                  <div className={`h-full rounded-[3px] ${w.struggleRate >= 60 ? 'bg-risk' : 'bg-warn'}`} style={{ width: `${w.struggleRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Today's Question + Contribution Calendar side by side — Daily Tech
          Read moved to Learning (folded into its daily reading habit
          instead of a separate card, see learning/daily-read.ts). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DailyCodingCard initialAssignment={dailyAssignment} stats={codingStats} />
        <Card title="Contribution Calendar">
          <CodingCalendar days={calendar} currentStreak={codingStats.currentStreak} longestStreak={codingStats.longestStreak} />
        </Card>
      </div>

      <TodaysQuizCard questions={quizQuestions} initialAttempt={quizAttempt} />

      <QuestionHistory initialHistory={history} />

      <RecommendedQuestions />
    </div>
  )
}
