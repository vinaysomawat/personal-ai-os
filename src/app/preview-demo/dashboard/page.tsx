import DashboardView from '@/features/dashboard/components/DashboardView'
import { daysAgoIST } from '@/lib/date'

const dummyData = {
  todayHealth: { weight_kg: 78, calories: 1850, protein_g: 120, steps: 6000 },
  scoreHistory: Array.from({ length: 14 }, (_, i) => ({
    date: daysAgoIST(13 - i),
    life: 55 + Math.round(Math.sin(i / 2) * 15 + i),
    health: 60 + i, finance: 70 - i, projects: 40 + i * 2,
  })),
  scores: { health: 72, finance: 68, projects: 76, life: 72 },
  scoreBreakdown: {
    health: { today: 75, weeklyAvg: 68, blended: 72, delta: 2 },
    finance: { today: 70, weeklyAvg: 65, blended: 68, delta: -1 },
    projects: { today: 80, weeklyAvg: 70, blended: 76, delta: 5 },
  },
  lifeDelta: 2,
  scoreTips: {
    health: 'Log today\'s steps for a full score',
    finance: 'Under budget — nothing to do here',
    projects: 'Maxed out — consistent practice',
  },
  stats: {
    workoutsToday: 1,
    monthSpend: 32000, monthBudget: 45000, practiced30d: 19,
    workoutStreak: 4, prepStreak: 3,
  },
  prepToday: { done: 2, total: 6 },
  workoutCategory: 'Push Day',
  aiBudget: { callsToday: 6, costTodayUsd: 0.042, callsMonth: 118, costMonthUsd: 1.86, cacheHitRateMonth: 41 },
  topActions: [
    { emoji: '🔁', text: '2 revision topics due: Async & Promises (5/10)', href: '/prep?tab=questions' },
  ],
  todayProgress: {
    items: [
      { key: 'health-metrics', label: "Log today's health metrics", done: true, href: '/health' },
      { key: 'prep', label: 'Prep session: 2/6 blocks done', done: false, href: '/prep' },
      { key: 'expense', label: "Log today's expenses", done: false, href: '/finance' },
    ],
    completed: 1, total: 3, score: 33,
  },
  careerMemory: { currentRole: null, currentCompany: null, targetRole: null, currentSalary: null, bio: null },
  financialGoals: [],
  astrology: null,
  huntMode: true,
}

const dummyExecutive = { risks: [] }

const dummyHunt = {
  overall: 64,
  tier: { label: '✅ INTERVIEW-READY · 4 blockers to close', tone: 'good' as const },
  topBlocker: { label: 'System design', score: 58, gate: 80 },
  score: { today: 54, window: '11:00am–12:30am', good: false, recent: [{ date: '2026-10-05', score: 40 }, { date: '2026-10-06', score: 72 }, { date: '2026-10-07', score: null }, { date: '2026-10-08', score: 91 }, { date: '2026-10-09', score: 60 }, { date: '2026-10-10', score: 83 }] },
  mockAvg: 6.4,
  revisionDue: 3,
  blocks: { done: 3, total: 7 },
  runway: 5.4,
}

export default function DashboardPreview() {
  return <DashboardView data={dummyData} executive={dummyExecutive} hunt={dummyHunt} />
}
