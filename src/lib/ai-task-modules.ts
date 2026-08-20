import type { AITask } from './ai-gateway'

// Which module each AI Gateway task "belongs to," for Settings' AI Budget
// cost-by-module breakdown — the budget/usage tables (ai_usage_logs) only
// group by raw task name, not module, so this mapping is what turns "you
// spent $1.86 on career_mentor + jd_analysis + company_insights" into
// "Career cost $X this month." 'brain' covers the Personal Brain family
// (Ask/Decide/Reflect tabs + the digest/journal/reflection crons that share
// its context-gathering) rather than being force-mapped onto one page module.
// 'shared' is for tasks with no single-module owner (Telegram intent
// parsing/vision run for every bot; module_recommendations is one generic
// component reused across 5+ pages, so the task name alone can't say which
// page triggered a given call).
export type AITaskModule = 'planner' | 'career' | 'finance' | 'health' | 'learning' | 'coding' | 'astrology' | 'brain' | 'shared'

export const TASK_MODULE: Record<AITask, AITaskModule> = {
  telegram_intent: 'shared',
  telegram_vision: 'shared',
  module_recommendations: 'shared',
  career_mentor: 'career',
  jd_analysis: 'career',
  generate_topic_quiz: 'career',
  recommend_quiz_topic: 'career',
  company_insights: 'career',
  finance_advisor: 'finance',
  finance_scenario: 'finance',
  health_report: 'health',
  health_daily_plan: 'health',
  health_advisor: 'health',
  estimate_food_nutrition: 'health',
  study_plan: 'learning',
  resource_quiz: 'learning',
  recommend_resources: 'learning',
  recommend_daily_read: 'learning',
  coding_mentor: 'coding',
  recommend_coding_questions: 'coding',
  astrology_reading: 'astrology',
  astrology_characteristics: 'astrology',
  daily_briefing: 'brain',
  weekly_digest: 'brain',
  monthly_digest: 'brain',
  brain_qa: 'brain',
  brain_decision: 'brain',
  brain_weekly_reflection: 'brain',
  brain_monthly_review: 'brain',
  daily_journal: 'brain',
  evening_reflection: 'brain',
}

export const TASK_MODULE_LABEL: Record<AITaskModule, string> = {
  planner: 'Planner', career: 'Career', finance: 'Finance', health: 'Health',
  learning: 'Learning', coding: 'Coding', astrology: 'Astrology', brain: 'Personal Brain',
  shared: 'Shared / cross-module',
}

// Full task -> display label, kept here (not duplicated in SettingsView) so
// it can't drift out of sync with AITask the way the old inline copy had —
// that one was missing ~16 of the 31 current tasks and still listed a task
// that no longer exists.
export const TASK_LABEL: Record<AITask, string> = {
  telegram_intent: 'Telegram intent parsing',
  telegram_vision: 'Photo recognition',
  module_recommendations: 'Module recommendations',
  career_mentor: 'Career Mentor',
  jd_analysis: 'JD analysis',
  generate_topic_quiz: 'Career topic quiz',
  recommend_quiz_topic: 'Quiz topic recommendation',
  company_insights: 'Company insights',
  finance_advisor: 'Money Advisor',
  finance_scenario: 'Purchase scenario simulation',
  health_report: 'Health report',
  health_daily_plan: 'Daily health plan',
  health_advisor: 'Health Coach',
  estimate_food_nutrition: 'Food nutrition estimate',
  study_plan: 'Study plan',
  resource_quiz: 'Resource quiz',
  recommend_resources: 'Resource recommendations',
  recommend_daily_read: 'Daily read recommendation',
  coding_mentor: 'Code Mentor',
  recommend_coding_questions: 'Coding question recommendations',
  astrology_reading: 'Astrology reading',
  astrology_characteristics: 'Astrology characteristics',
  daily_briefing: 'Daily briefing',
  weekly_digest: 'Weekly digest',
  monthly_digest: 'Monthly digest',
  brain_qa: 'Ask Brain',
  brain_decision: 'Decision Queue',
  brain_weekly_reflection: 'Weekly reflection',
  brain_monthly_review: 'Monthly review',
  daily_journal: 'Daily journal',
  evening_reflection: 'Evening reflection',
}
