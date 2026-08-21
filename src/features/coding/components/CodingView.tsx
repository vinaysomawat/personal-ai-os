'use client'

import { Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import DailyCodingCard from './DailyCodingCard'
import CodingCalendar from './CodingCalendar'
import CodingSettingsPopover from './CodingSettingsPopover'
import QuestionHistory from './QuestionHistory'
import RecommendedQuestions from './RecommendedQuestions'
import TodaysPickCard from './TodaysPickCard'
import { computeWeakAreas, type DailyQuestion, type CodingStats, type CalendarDay, type CodingSettings } from '../daily-core'

interface Props {
  dailyAssignment: DailyQuestion[]
  codingStats: CodingStats
  calendar: CalendarDay[]
  codingSettings: CodingSettings
  history: DailyQuestion[]
}

const MODE_LABEL: Record<CodingSettings['mode'], (fixedCount: number) => string> = {
  rotation: () => 'Rotation',
  fixed: fixedCount => `Fixed · ${fixedCount}/day`,
}

export default function CodingView({ dailyAssignment, codingStats, calendar, codingSettings, history }: Props) {
  // dailyAssignment carries all of today's picks — algorithm, quiz,
  // javascript-functions, ui-coding, and (on alternate Saturdays)
  // system-design — sharing one category column (quiz.md) rather than
  // separate tables, so the split happens here in the view layer:
  // DailyCodingCard renders everything except the standalone-card
  // categories below (system-design rows have the same shape as algorithm
  // rows, so they need no special handling), and each standalone category
  // gets its own TodaysPickCard.
  const STANDALONE_CATEGORIES = ['quiz', 'javascript-functions', 'ui-coding']
  const algorithmAssignment = dailyAssignment.filter(a => !STANDALONE_CATEGORIES.includes(a.question.category))
  const quizPick = dailyAssignment.find(a => a.question.category === 'quiz') ?? null
  const jsFunctionsPick = dailyAssignment.find(a => a.question.category === 'javascript-functions') ?? null
  const uiCodingPick = dailyAssignment.find(a => a.question.category === 'ui-coding') ?? null
  const codingContext = `Current streak: ${codingStats.currentStreak}d (longest: ${codingStats.longestStreak}d). Total solved: ${codingStats.totalSolved} (${codingStats.easySolved} easy, ${codingStats.mediumSolved} medium, ${codingStats.hardSolved} hard). Completion rate: ${codingStats.completionRate}%.`

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
    <div className="space-y-3">
      {advisorPortal}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Coding</h1>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">🔥 {codingStats.currentStreak}-day streak</span>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">{MODE_LABEL[codingSettings.mode](codingSettings.fixed_count)}</span>
      </div>

      {/* Streak/Solved/Completion/Assignment — persistent top-level stats,
          matching the design; previously Streak/Solved lived only as small
          chips inside DailyCodingCard's header, and Assignment mode was
          never shown on the page at all (only inside the settings modal). */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
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

      {/* Today's Algorithm Question — standalone, full-width. */}
      <DailyCodingCard initialAssignment={algorithmAssignment} />

      {/* Weak Areas + Contribution Calendar side by side, Weak Areas at half
          width. Weak Areas only renders once ≥2-attempt data exists, so the
          Calendar takes the full row alone until then. */}
      {weakAreas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
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
                    <div className={`h-full rounded-[3px] ${w.struggleRate >= 70 ? 'bg-risk' : 'bg-warn'}`} style={{ width: `${w.struggleRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CodingCalendar days={calendar} title="Contribution Calendar" />
          </Card>
        </div>
      ) : (
        <Card>
          <CodingCalendar days={calendar} title="Contribution Calendar" />
        </Card>
      )}

      {/* Responsive grid, not stacked — matches the Claude Design source's
          2026-08-18 update to this section. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--grid-gap-sm)]">
        <TodaysPickCard title="Today's Quiz" pick={quizPick} />
        <TodaysPickCard title="Today's JS Function" pick={jsFunctionsPick} />
        <TodaysPickCard title="Today's UI Coding" pick={uiCodingPick} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <QuestionHistory initialHistory={history} />
        <RecommendedQuestions />
      </div>
    </div>
  )
}
