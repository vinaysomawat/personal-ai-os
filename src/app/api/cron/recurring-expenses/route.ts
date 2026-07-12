import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  const dayOfMonth = Number(today.split('-')[2])
  const monthStart = today.slice(0, 7) + '-01'

  const { data: due } = await supabase
    .from('recurring_expenses')
    .select('id, name, amount, category')
    .eq('user_id', user.id)
    .eq('active', true)
    .eq('day_of_month', dayOfMonth)

  const templates = due ?? []
  if (templates.length === 0) {
    return NextResponse.json({ ok: true, logged: 0 })
  }

  // Guard against double-logging if the cron ever retries or fires twice.
  const { data: alreadyLogged } = await supabase
    .from('expenses')
    .select('recurring_expense_id')
    .eq('user_id', user.id)
    .gte('date', monthStart)
    .in('recurring_expense_id', templates.map(t => t.id))

  const loggedIds = new Set((alreadyLogged ?? []).map(e => e.recurring_expense_id))
  const toLog = templates.filter(t => !loggedIds.has(t.id))

  if (toLog.length > 0) {
    await supabase.from('expenses').insert(toLog.map(t => ({
      user_id: user.id,
      amount: t.amount,
      category: t.category,
      description: `${t.name} (recurring)`,
      date: today,
      recurring_expense_id: t.id,
    })))
  }

  return NextResponse.json({ ok: true, logged: toLog.length, skippedAlreadyLogged: templates.length - toLog.length })
}
