import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const SONNET_MODEL = 'claude-sonnet-4-6'
export const HAIKU_MODEL = 'claude-haiku-4-5'

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
export async function callClaude(prompt: string, system: string | undefined, model: string, image?: ImageInput, webSearchMaxUses?: number): Promise<AIResult> {
  const content: Anthropic.MessageParam['content'] = image
    ? [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: image.base64 } },
        { type: 'text', text: prompt },
      ]
    : prompt

  const msg = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: system ?? 'You are a helpful personal AI assistant. Be concise, practical, and actionable.',
    messages: [{ role: 'user', content }],
    // max_uses caps searches per call — each search result's citation content
    // (encrypted_content blocks) counts as normal input tokens and can run
    // 10-50x more expensive than a non-search call if left uncapped.
    ...(webSearchMaxUses ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: webSearchMaxUses }] } : {}),
  })
  // With web_search enabled, the response can include tool_use/tool_result
  // blocks interleaved with text — take the last text block (the model's
  // final answer after any searches) rather than the first.
  const blocks = msg.content.filter(b => b.type === 'text')
  const block = blocks[blocks.length - 1]
  return {
    text: block?.type === 'text' ? block.text : '',
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
  }
}
