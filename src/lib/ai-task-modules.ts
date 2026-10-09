import type { AITask } from './ai-gateway'

// Which module each AI Gateway task "belongs to," for Settings' AI Budget
// cost-by-module breakdown — the budget/usage tables (ai_usage_logs) only
// group by raw task name, not module, so this mapping is what turns "you
// spent $1.86 on jd_analysis + company_insights" into
// "Career cost $X this month." 'brain' covers the Personal Brain family
// (Ask Brain + the weekly/monthly digest crons that share
// its context-gathering) rather than being force-mapped onto one page module.
// 'shared' is for tasks with no single-module owner (Telegram intent
// parsing/vision run for every bot; module_recommendations is one generic
// component reused across 5+ pages, so the task name alone can't say which
// page triggered a given call).
export type AITaskModule = 'career' | 'finance' | 'health' | 'coding' | 'astrology' | 'brain' | 'prep' | 'shared'

export const TASK_MODULE: Record<AITask, AITaskModule> = {
  telegram_intent: 'shared',
  telegram_vision: 'shared',
  module_recommendations: 'shared',
  jd_analysis: 'career',
  company_insights: 'career',
  finance_advisor: 'finance',
  health_advisor: 'health',
  estimate_food_nutrition: 'health',
  astrology_reading: 'astrology',
  astrology_characteristics: 'astrology',
  story_critique: 'prep',
  ai_native_critique: 'prep',
  answer_critique: 'prep',
  mock_round_review: 'prep',
  prep_forecast: 'prep',
  weekly_digest: 'brain',
  monthly_digest: 'brain',
  brain_qa: 'brain',
}

export const TASK_MODULE_LABEL: Record<AITaskModule, string> = {
  career: 'Career', finance: 'Finance', health: 'Health',
  coding: 'Coding', astrology: 'Astrology', brain: 'Personal Brain', prep: 'Prep',
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
  jd_analysis: 'JD analysis',
  company_insights: 'Company insights',
  finance_advisor: 'Money Advisor',
  health_advisor: 'Health Coach',
  estimate_food_nutrition: 'Food nutrition estimate',
  astrology_reading: 'Astrology reading',
  astrology_characteristics: 'Astrology characteristics',
  story_critique: 'Story rehearsal feedback',
  ai_native_critique: 'AI-native answer feedback',
  answer_critique: 'Question Bank answer feedback',
  mock_round_review: 'Mock Round review',
  prep_forecast: 'Interview forecast (weekly)',
  weekly_digest: 'Weekly digest',
  monthly_digest: 'Monthly digest',
  brain_qa: 'Ask Brain',
}
