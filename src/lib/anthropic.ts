import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const SONNET_MODEL = 'claude-sonnet-4-6'
export const HAIKU_MODEL = 'claude-haiku-4-5'
// Haiku 5.5: a tenth of Haiku 4.5's price; thinks by default (adaptive), so
// callers pass a low effort and room for the thinking tokens.
export const HAIKU_5_5_MODEL = 'claude-haiku-5-5'

export interface AIResult {
  text: string
  inputTokens: number
  outputTokens: number
}

export interface ImageInput {
  base64: string
  mediaType: string
}

// Low-level primitive. Only the AI Gateway (src/lib/ai-gateway.ts) should call
// this directly — every feature module goes through askAI() instead, so
// model routing, caching, and budget tracking stay in one place.
//
// No server-side tools (e.g. web_search) are wired up here — removed
// 2026-09-23 after a single web_search call was observed pulling back 80k+
// input tokens of page content, enough alone to exhaust a whole day's AI
// budget (a search's result content counts as normal input tokens and can
// run 10-50x a non-search call, with no way to cap the size of what a
// search returns — only how many searches run). Every task now has the
// model self-report a value (e.g. a URL) and fall back to null/unsure
// rather than verifying it live.
export async function callClaude(prompt: string, system: string | undefined, model: string, image?: ImageInput, tuning: { maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {}): Promise<AIResult> {
  const content: Anthropic.MessageParam['content'] = image
    ? [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: image.base64 } },
        { type: 'text', text: prompt },
      ]
    : prompt

  const msg = await anthropic.messages.create({
    model,
    max_tokens: tuning.maxTokens ?? 4096,
    system: system ?? 'You are a helpful personal AI assistant. Be concise, practical, and actionable.',
    messages: [{ role: 'user', content }],
    ...(tuning.effort ? { output_config: { effort: tuning.effort } } : {}),
  })
  const block = msg.content.find(b => b.type === 'text')
  return {
    text: block?.type === 'text' ? block.text : '',
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
  }
}
