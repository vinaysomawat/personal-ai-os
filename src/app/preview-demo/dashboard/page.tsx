import DashboardView from '@/features/dashboard/components/DashboardView'
import { todayIST, daysAgoIST } from '@/lib/date'

const today = todayIST()

const dummyData = {
  pendingTasks: [
    { id: '1', text: 'Finish system design notes', done: false, priority: 'high', due_date: today },
    { id: '2', text: 'Ship onboarding flow PR', done: false, priority: 'medium', due_date: null },
    { id: '3', text: 'Book dentist appointment', done: false, priority: 'low', due_date: null },
  ],
  recentApplications: [
    { id: '1', company: 'Acme Corp', role: 'Senior Frontend Engineer', status: 'interview', applied_at: today },
    { id: '2', company: 'Globex', role: 'Staff Engineer', status: 'applied', applied_at: today },
  ],
  botActivity: [
    { module: 'finance', message: 'spent 450 on groceries', response: '✅ Logged ₹450 under Food', created_at: new Date().toISOString() },
    { module: 'health', message: '6000 steps', response: '✅ Steps updated: 6,000', created_at: new Date().toISOString() },
  ],
  todayHealth: { weight_kg: 78, calories: 1850, protein_g: 120, steps: 6000, sleep_hours: 7, water_ml: 2000 },
  scoreHistory: Array.from({ length: 14 }, (_, i) => ({
    date: daysAgoIST(13 - i),
    life: 55 + Math.round(Math.sin(i / 2) * 15 + i),
    health: 60 + i, finance: 70 - i, career: 50 + i, learning: 45 + i, projects: 40 + i * 2,
  })),
  gamification: { xp: 2400, level: 4, xpProgress: 62, streak: 12, badges: ['🌱 First Step', '📅 Week Warrior', '🔥 7-Day Streak'] },
  scores: { health: 72, finance: 68, career: 64, learning: 58, projects: 76, life: 68 },
  scoreTips: {
    health: 'Log today\'s water intake for a full score',
    finance: 'Under budget — nothing to do here',
    career: 'Add a few more skills to the tracker',
    learning: 'Finish an in-progress resource for the biggest jump',
    projects: 'Maxed out — consistent practice',
  },
  stats: {
    pendingTaskCount: 3, activeApplications: 2, workoutsToday: 1,
    monthSpend: 32000, monthBudget: 45000, learningInProgress: 2, codingSolved30d: 19, documentCount: 14,
  },
  aiBudget: { callsToday: 6, costTodayUsd: 0.042, callsMonth: 118, costMonthUsd: 1.86, cacheHitRateMonth: 41 },
  topActions: [
    { emoji: '⚡', text: '1 high-priority task pending', href: '/planner' },
    { emoji: '🎯', text: '1 application in interview stage', href: '/career' },
    { emoji: '💻', text: "Today's coding question still open", href: '/coding' },
  ],
  todayProgress: { items: [], completed: 4, total: 7, score: 57 },
  todayRecommendations: [
    { emoji: '📊', text: "Log today's health metrics", href: '/health' },
    { emoji: '💻', text: "Solve today's coding question", href: '/coding' },
    { emoji: '💸', text: "Log today's expenses", href: '/finance' },
  ],
}

export default function DashboardPreview() {
  return <DashboardView data={dummyData} />
}
