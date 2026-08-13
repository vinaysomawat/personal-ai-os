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
  todayHealth: { weight_kg: 78, calories: 1850, protein_g: 120, steps: 6000 },
  scoreHistory: Array.from({ length: 14 }, (_, i) => ({
    date: daysAgoIST(13 - i),
    life: 55 + Math.round(Math.sin(i / 2) * 15 + i),
    health: 60 + i, finance: 70 - i, career: 50 + i, learning: 45 + i, projects: 40 + i * 2,
  })),
  gamification: { xp: 2400, level: 4, xpProgress: 62, streak: 12, badges: ['🌱 First Step', '📅 Week Warrior', '🔥 7-Day Streak'] },
  scores: { health: 72, finance: 68, career: 64, learning: 58, projects: 76, life: 68 },
  scoreTips: {
    health: 'Log today\'s steps for a full score',
    finance: 'Under budget — nothing to do here',
    career: 'Add a few more skills to the tracker',
    learning: 'Finish an in-progress resource for the biggest jump',
    projects: 'Maxed out — consistent practice',
  },
  stats: {
    pendingTaskCount: 3, overdueCount: 1, activeApplications: 2, workoutsToday: 1,
    monthSpend: 32000, monthBudget: 45000, learningInProgress: 2, resourcesNeedingRevision: 1, codingSolved30d: 19,
    workoutStreak: 4, learningStreak: 6,
  },
  codingQuestionPending: true,
  workoutCategory: 'Push Day',
  aiBudget: { callsToday: 6, costTodayUsd: 0.042, callsMonth: 118, costMonthUsd: 1.86, cacheHitRateMonth: 41 },
  topActions: [
    { emoji: '⚡', text: '1 high-priority task pending', href: '/planner' },
    { emoji: '🎯', text: '1 application in interview stage', href: '/career' },
    { emoji: '💻', text: "Today's coding question still open", href: '/coding' },
  ],
  todayProgress: {
    items: [
      { key: 'health-metrics', label: "Log today's health metrics", done: true, href: '/health' },
      { key: 'coding', label: "Solve today's coding question", done: false, href: '/coding' },
      { key: 'coding-quiz', label: "Complete Today's Quiz", done: true, href: '/coding' },
      { key: 'daily-read', label: "Read today's article", done: true, href: '/learning' },
      { key: 'expense', label: "Log today's expenses", done: false, href: '/finance' },
    ],
    completed: 3, total: 5, score: 60,
  },
  careerMemory: { currentRole: null, currentCompany: null, targetRole: null, currentSalary: null, bio: null },
  financialGoals: [],
  recentPatterns: [],
}

const dummyExecutive = { brief: null, risks: [], opportunities: [], whatsChanged: [], codingStreak: 0 }

export default function DashboardPreview() {
  return <DashboardView data={dummyData} executive={dummyExecutive} />
}
