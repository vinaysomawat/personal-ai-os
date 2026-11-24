import { NextRequest, NextResponse } from 'next/server'
import { handleUpdate, isValidModule } from '@/features/telegram/handler'
import type { TelegramUpdate } from '@/lib/telegram/types'

// A /quiz category tap generates up to 8 quiz items with one AI call before
// replying, and drill answers are AI-graded inline — give both room.
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module } = await params

  if (!isValidModule(module)) {
    return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  await handleUpdate(module, update)

  return NextResponse.json({ ok: true })
}
