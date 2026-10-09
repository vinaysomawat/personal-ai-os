import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/transcribe'

// Voice mode: the web mic button posts its recording here (a route handler,
// not a server action — server actions cap bodies at 1 MB). /api is outside
// the auth middleware, so the session is checked here.
const MAX_BYTES = 4 * 1024 * 1024
const VOCAB = 'Frontend interview answer. JavaScript, TypeScript, React, Next.js, Angular, RxJS, NgRx, useEffect, useMemo, useCallback, hydration, SSR, CSR, ARIA, a11y, debounce, throttle, Web Vitals, LCP, CLS, INP, GraphQL, REST, WebSocket, STAR, LLM, prompt.'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: 'GROQ_API_KEY is not set' }, { status: 500 })

  const form = await req.formData()
  const audio = form.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'No audio' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Recording too long — keep it under 5 minutes' }, { status: 413 })

  const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm'
  try {
    const text = await transcribeAudio(audio, `answer.${ext}`, { language: 'en', prompt: VOCAB })
    return NextResponse.json({ text })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Transcription failed' }, { status: 502 })
  }
}
