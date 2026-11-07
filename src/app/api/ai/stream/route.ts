import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamAI } from '@/lib/ai-gateway'
import { aiStreamRequest, type AIStreamRequest } from '@/features/ai/stream-request'
import { buildFinancePrompt, FINANCE_ADVISOR_SYSTEM } from '@/features/ai/finance-prompt'
import { buildBrainPrompt, buildContextSummary, BRAIN_SYSTEM_PROMPT } from '@/features/brain/prompts'
import { streamModelAnswer } from '@/features/prep/critique'
import { getAstrologyProfile, streamAstrologyReading } from '@/features/astrology/actions'
import type { SupabaseClient } from '@supabase/supabase-js'

// Streams plain-text AI replies to the browser. A route handler, not a server
// action, so the response can be read while it's written (useAIStream). /api
// is outside the auth middleware, so the session is checked here.
export const maxDuration = 60

function streamFor(body: AIStreamRequest, supabase: SupabaseClient, userId: string): Promise<ReadableStream<Uint8Array>> {
  switch (body.feature) {
    case 'brain':
      return streamAI('brain_qa', buildBrainPrompt(buildContextSummary(body.context), body.history, body.question), BRAIN_SYSTEM_PROMPT, { userId })
    case 'finance':
      return streamAI('finance_advisor', buildFinancePrompt(body.question, body.context), FINANCE_ADVISOR_SYSTEM, { userId })
    case 'model_answer':
      return streamModelAnswer(supabase, userId, body.questionId)
    case 'astrology':
      return getAstrologyProfile().then(profile => {
        if (!profile) throw new Error('Astrology profile not set')
        return streamAstrologyReading(profile, body.period, body.lang)
      })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = aiStreamRequest.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    const stream = await streamFor(body.data, supabase, user.id)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Proxies must pass each chunk on as it arrives.
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start the reply' }, { status: 500 })
  }
}
