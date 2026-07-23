import type { Signal } from '@/lib/signals'
import type { ResolvedGoal, GoalModule } from './types'

const MODULE_HREF: Record<GoalModule, string> = { career: '/career', learning: '/learning', coding: '/coding' }

// Picks the single most urgent active (unachieved) goal rather than surfacing
// all of them — nearest target_date first, then lowest progress ratio — so
// this plugs into the same one-candidate-per-check shape every other
// signals.ts file uses.
export function checkGoalProgress(goals: ResolvedGoal[]): Signal | null {
  const active = goals.filter(g => !g.achieved_at)
  if (active.length === 0) return null

  const scored = active.map(g => {
    const daysToTarget = g.target_date ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000) : null
    const progressRatio = g.target_value != null && g.resolvedCurrentValue != null && g.target_value > 0
      ? g.resolvedCurrentValue / g.target_value : null

    let weight = 58
    if (daysToTarget !== null && daysToTarget <= 7) weight = 85
    else if (daysToTarget !== null && daysToTarget <= 30) weight = 70
    if (progressRatio !== null && progressRatio < 0.25) weight += 10

    return { goal: g, weight, daysToTarget }
  })

  const top = scored.reduce((a, b) => (b.weight > a.weight ? b : a))
  const { goal, weight, daysToTarget } = top

  const progressText = goal.target_value != null && goal.resolvedCurrentValue != null
    ? ` — ${goal.resolvedCurrentValue}/${goal.target_value}`
    : ''
  const dueText = daysToTarget === null ? '' : daysToTarget < 0 ? ' (past due)' : daysToTarget <= 30 ? ` (${daysToTarget}d left)` : ''

  return {
    id: `goals.${goal.id}`, module: goal.module, weight, emoji: '🎯', href: MODULE_HREF[goal.module],
    message: `Goal "${goal.name}"${progressText}${dueText} — keep pushing`,
  }
}
