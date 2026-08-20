'use server'

import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { callClaude, SONNET_MODEL, HAIKU_MODEL, type ImageInput } from '@/lib/anthropic'
import { todayIST, istMidnightUtc, istDateStrToUtcMidnight } from '@/lib/date'

export type AITask =
  | 'telegram_intent'
  | 'telegram_vision'
  | 'career_mentor'
  | 'jd_analysis'
  | 'generate_topic_quiz'
  | 'recommend_quiz_topic'
  | 'company_insights'
  | 'finance_advisor'
  | 'health_report'
  | 'health_daily_plan'
  | 'health_advisor'
  | 'study_plan'
  | 'resource_quiz'
  | 'recommend_resources'
  | 'recommend_daily_read'
  | 'coding_mentor'
  | 'recommend_coding_questions'
  | 'module_recommendations'
  | 'daily_briefing'
  | 'weekly_digest'
  | 'monthly_digest'
  | 'brain_qa'
  | 'brain_decision'
  | 'brain_weekly_reflection'
  | 'brain_monthly_review'
  | 'daily_journal'
  | 'finance_scenario'
  | 'evening_reflection'
  | 'estimate_food_nutrition'
  | 'astrology_reading'
  | 'astrology_characteristics'

interface TaskConfig {
  model: string
  /** null = never cache (chat-style / always-unique prompts) */
  cacheTTLSeconds: number | null
  /** Returned when the daily/monthly budget is exhausted or the call errors */
  fallback: string
}

const SIX_HOURS = 6 * 60 * 60
const SEVEN_DAYS = 7 * 24 * 60 * 60
// "Effectively permanent" for content that should only regenerate when its
// own input data changes (astrology.md 3.8's characteristics profile, keyed
// off the natal chart, which only changes when birth details are re-saved)
// — the cache key already changes when the prompt does, so this TTL is a
// ceiling against indefinite staleness, not the thing doing the real work.
const ONE_YEAR = 365 * 24 * 60 * 60
const BUDGET_FALLBACK = "I'm over my AI budget for today — try again tomorrow."

const TASK_CONFIG: Record<AITask, TaskConfig> = {
  telegram_intent:        { model: HAIKU_MODEL,  cacheTTLSeconds: null,       fallback: '{"action":"help"}' },
  telegram_vision:        { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: '{"action":"help"}' },
  career_mentor:          { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: BUDGET_FALLBACK },
  jd_analysis:            { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: 'null' },
  generate_topic_quiz:    { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: '[]' },
  recommend_quiz_topic:   { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: '{}' },
  company_insights:       { model: SONNET_MODEL, cacheTTLSeconds: SEVEN_DAYS, fallback: 'null' },
  finance_advisor:        { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: BUDGET_FALLBACK },
  health_report:          { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: 'No report available right now — AI budget reached for today.' },
  health_daily_plan:      { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: '' },
  health_advisor:         { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: BUDGET_FALLBACK },
  study_plan:             { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: '' },
  resource_quiz:          { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: '[]' },
  recommend_resources:    { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: '[]' },
  recommend_daily_read:   { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: 'null' },
  coding_mentor:          { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: BUDGET_FALLBACK },
  recommend_coding_questions: { model: SONNET_MODEL, cacheTTLSeconds: null,  fallback: '[]' },
  module_recommendations: { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: '[]' },
  daily_briefing:         { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: 'AI summary unavailable today — the deterministic sections below are still accurate.' },
  weekly_digest:          { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: 'AI summary unavailable this week — the numbers above are still accurate.' },
  monthly_digest:         { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: 'AI summary unavailable this month — the numbers above are still accurate.' },
  brain_qa:               { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: BUDGET_FALLBACK },
  brain_decision:         { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: '{}' },
  brain_weekly_reflection:{ model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: "Couldn't generate this week's reflection right now — try again shortly." },
  brain_monthly_review:   { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: '{}' },
  daily_journal:          { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: "Journal entry unavailable today — AI call failed, today's activity is still logged in each module." },
  finance_scenario:       { model: SONNET_MODEL, cacheTTLSeconds: null,       fallback: BUDGET_FALLBACK },
  evening_reflection:     { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS,  fallback: "Couldn't generate tonight's reflection right now — try again shortly." },
  estimate_food_nutrition:{ model: SONNET_MODEL, cacheTTLSeconds: SEVEN_DAYS, fallback: 'null' },
  // astrology_reading's real TTL is computed dynamically per call (seconds
  // to the next calendar boundary of the period being requested — see
  // astrology/actions.ts) and passed via AskAIOptions.cacheTTLSeconds,
  // which overrides this default; SIX_HOURS here only matters as a fallback
  // for the rare code path that calls askAI('astrology_reading', ...)
  // without that override.
  astrology_reading:      { model: SONNET_MODEL, cacheTTLSeconds: SIX_HOURS, fallback: 'Reading unavailable right now — AI budget reached for today.' },
  astrology_characteristics: { model: SONNET_MODEL, cacheTTLSeconds: ONE_YEAR, fallback: 'Characteristics unavailable right now — AI budget reached for today.' },
}

// Static per-model pricing, USD per 1M tokens (Sonnet 4.6 / Haiku 4.5).
const PRICING: Record<string, { input: number; output: number }> = {
  [SONNET_MODEL]: { input: 3.00, output: 15.00 },
  [HAIKU_MODEL]:  { input: 1.00, output: 5.00 },
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model]
  if (!price) return 0
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output
}

function cacheKeyFor(model: string, system: string | undefined, prompt: string): string {
  return createHash('sha256').update(`${model}::${system ?? ''}::${prompt}`).digest('hex')
}

// Safety ceilings, not tight budgets — tune via env once you know your real usage pattern.
const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD ?? 3)
const MONTHLY_BUDGET_USD = Number(process.env.AI_MONTHLY_BUDGET_USD ?? 50)

// A "use server" file can only export async functions — Settings reads the
// ceilings through this rather than importing the constants directly.
export async function getAiBudgetLimits() {
  return { dailyBudget: DAILY_BUDGET_USD, monthlyBudget: MONTHLY_BUDGET_USD }
}

type ServiceClient = ReturnType<typeof createServiceClient>

async function spendSince(db: ServiceClient, userId: string, sinceISO: string): Promise<number> {
  const { data } = await db
    .from('ai_usage_logs')
    .select('estimated_cost_usd')
    .eq('user_id', userId)
    .gte('created_at', sinceISO)
  return (data ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_usd), 0)
}

async function logUsage(
  db: ServiceClient, userId: string, task: AITask, model: string,
  inputTokens: number, outputTokens: number, cost: number, cacheHit: boolean
): Promise<void> {
  try {
    await db.from('ai_usage_logs').insert({
      user_id: userId, task, model,
      input_tokens: inputTokens, output_tokens: outputTokens,
      estimated_cost_usd: cost, cache_hit: cacheHit,
    })
  } catch {
    // Non-fatal: a logging failure shouldn't break the AI feature
  }
}

interface AskAIOptions {
  /** Skip the cache lookup (still writes the fresh result to cache) — for explicit "Regenerate" actions */
  bypassCache?: boolean
  userId?: string
  /** Image content is always unique — never cached, regardless of the task's configured TTL */
  image?: ImageInput
  /**
   * Per-call override of the task's configured cacheTTLSeconds — for the one
   * case in the app (astrology_reading) where the correct TTL genuinely
   * varies per call rather than being fixed per task (daily/monthly/yearly
   * periods each cache until their own calendar boundary, not a flat
   * duration). null disables caching for this call specifically.
   */
  cacheTTLSeconds?: number | null
}

export interface AskAIResult {
  text: string
  /** When this exact response was generated — the cache row's created_at on
   * a cache hit, or "now" on a fresh call. Lets a UI show "Updated 3 days
   * ago" on AI-derived content instead of leaving staleness invisible. */
  generatedAt: string
}

/**
 * Single entry point for every AI call in the app. Routes to the right model
 * per task, checks a response cache, enforces a daily/monthly spend ceiling,
 * and logs usage — so no feature module needs to touch the Anthropic client,
 * a model string, or cost tracking directly. `askAI()` below is the plain
 * string-returning wrapper every existing call site uses; this version
 * additionally reports when the returned text was actually generated, for
 * the handful of call sites that want to show that to the user.
 */
export async function askAIWithMeta(task: AITask, prompt: string, system?: string, opts: AskAIOptions = {}): Promise<AskAIResult> {
  const config = TASK_CONFIG[task]
  const userId = opts.userId ?? process.env.SUPABASE_USER_ID
  const now = () => new Date().toISOString()
  if (!userId) return { text: config.fallback, generatedAt: now() }

  const db = createServiceClient()
  const ttlSeconds = opts.cacheTTLSeconds !== undefined ? opts.cacheTTLSeconds : config.cacheTTLSeconds
  const cacheable = ttlSeconds !== null && !opts.image
  const key = cacheable ? cacheKeyFor(config.model, system, prompt) : null

  if (key && !opts.bypassCache) {
    try {
      const { data: hit } = await db
        .from('ai_cache')
        .select('response, created_at')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      if (hit) {
        await logUsage(db, userId, task, config.model, 0, 0, 0, true)
        return { text: hit.response, generatedAt: hit.created_at }
      }
    } catch {
      // Cache read failure — fall through to a live call
    }
  }

  const todayStart = istMidnightUtc()
  const monthStart = istDateStrToUtcMidnight(todayIST().slice(0, 7) + '-01')
  const [dailySpend, monthlySpend] = await Promise.all([
    spendSince(db, userId, todayStart),
    spendSince(db, userId, monthStart),
  ])
  if (dailySpend >= DAILY_BUDGET_USD || monthlySpend >= MONTHLY_BUDGET_USD) {
    return { text: config.fallback, generatedAt: now() }
  }

  try {
    const { text, inputTokens, outputTokens } = await callClaude(prompt, system, config.model, opts.image)
    const cost = estimateCost(config.model, inputTokens, outputTokens)
    await logUsage(db, userId, task, config.model, inputTokens, outputTokens, cost, false)
    const generatedAt = now()

    if (key && text) {
      const expiresAt = new Date(Date.now() + ttlSeconds! * 1000).toISOString()
      try {
        await db.from('ai_cache').upsert(
          { cache_key: key, response: text, model: config.model, expires_at: expiresAt },
          { onConflict: 'cache_key' }
        )
      } catch {
        // Non-fatal: cache write failure just means the next identical call misses too
      }
    }

    return { text, generatedAt }
  } catch {
    return { text: config.fallback, generatedAt: now() }
  }
}

export async function askAI(task: AITask, prompt: string, system?: string, opts: AskAIOptions = {}): Promise<string> {
  return (await askAIWithMeta(task, prompt, system, opts)).text
}
