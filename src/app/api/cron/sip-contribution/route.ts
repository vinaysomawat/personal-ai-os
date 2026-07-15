import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logCronRun } from '@/lib/cron-log'
import { todayIST } from '@/lib/date'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'sip-contribution')

  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const today = todayIST()
  const dayOfMonth = Number(today.split('-')[2])
  const thisMonth = today.slice(0, 7)

  const { data: due } = await supabase
    .from('investments')
    .select('id, invested_amount, sip_amount, sip_last_contribution_month')
    .eq('user_id', user.id)
    .eq('is_sip', true)
    .eq('sip_day_of_month', dayOfMonth)

  // sip_last_contribution_month is the dedup watermark — skips any SIP
  // already contributed to this calendar month, so a retried or
  // twice-firing cron can't double-apply a contribution (same class of
  // guard the recurring-expenses cron uses via recurring_expense_id).
  const toContribute = (due ?? []).filter(inv => inv.sip_last_contribution_month !== thisMonth)

  for (const inv of toContribute) {
    await supabase.from('investments').update({
      invested_amount: Number(inv.invested_amount) + Number(inv.sip_amount),
      sip_last_contribution_month: thisMonth,
      updated_at: new Date().toISOString(),
    }).eq('id', inv.id)
  }

  return NextResponse.json({ ok: true, contributed: toContribute.length, skippedAlreadyContributed: (due?.length ?? 0) - toContribute.length })
}
