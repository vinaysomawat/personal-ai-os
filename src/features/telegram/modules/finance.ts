import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Finance bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"add_expense","amount":500,"category":"Food"|"Transport"|"Housing"|"Health"|"Shopping"|"Entertainment"|"Learning"|"Utilities"|"Other","description":"what it was for","date":"YYYY-MM-DD"}
{"action":"list_expenses","period":"today"|"week"|"month"}
{"action":"summary","month":"YYYY-MM"}
{"action":"set_budget","category":"Food","amount":5000}
{"action":"net_worth"}
{"action":"add_loan","name":"loan name","principal":1000000,"emi":15000,"rate":8.5,"months":180}
{"action":"set_salary","amount":100000}
{"action":"add_investment","name":"fund name","type":"mutual_fund"|"stocks"|"fd"|"crypto"|"other","invested":100000,"current":120000}
{"action":"ask","question":"free-form question about finances"}
{"action":"amend_expense","amount":500}
{"action":"undo_last"}
{"action":"add_recurring","name":"template name","amount":15000,"category":"Food"|"Transport"|"Housing"|"Health"|"Shopping"|"Entertainment"|"Learning"|"Utilities"|"Other","day_of_month":1}
{"action":"list_recurring"}
{"action":"help"}

Rules:
- amount is always a number (strip ₹, Rs, commas)
- Default date: today
- Default category: "Other"
- For "net worth" or "how much do I have" → net_worth
- For "my salary is X" or "I earn X" → set_salary
- For "add loan" / "I have an EMI of" → add_loan
- For "can I afford X", "should I invest", "retirement" → ask with the question
- For "actually make that X", "change it to X", "I meant X" (correcting the amount just logged) → amend_expense
- For "undo that", "delete that", "remove the last one", "oops ignore that" → undo_last
- For "rent is X every month", "auto-log my EMI", "recurring expense of X" → add_recurring (default day_of_month: 1)
- For "show my recurring expenses", "what auto-logs each month" → list_recurring`

export const VISION_PROMPT = `You are the Finance bot for Vinay AI OS, looking at a photo of a receipt or bill. Read the total amount and pick the best category. Return ONLY a JSON action:
{"action":"add_expense","amount":<number>,"category":"Food"|"Transport"|"Housing"|"Health"|"Shopping"|"Entertainment"|"Learning"|"Utilities"|"Other","description":"merchant or item name","date":"YYYY-MM-DD"}
Use today's date unless the receipt clearly shows a different one. If you cannot read a total amount, return {"action":"help"}.`

const CE: Record<string, string> = { Food: '🍔', Transport: '🚗', Housing: '🏠', Health: '💊', Shopping: '🛍️', Entertainment: '🎬', Learning: '📚', Utilities: '💡', Other: '📦' }

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  const today = new Date().toISOString().split('T')[0]
  const month = today.slice(0, 7)

  switch (action.action) {
    case 'add_expense': {
      const category = String(action.category ?? 'Other')
      const amount = Number(action.amount)
      const date = String(action.date ?? today)
      const { error } = await db.from('expenses').insert({ user_id: userId, amount, category, description: action.description ?? null, date })
      if (error) return `❌ ${error.message}`

      // Proactive nudge — warn inline if this pushes the category over/near budget,
      // using data already available in this call rather than a separate check.
      let nudge = ''
      const expenseMonth = date.slice(0, 7)
      const { data: budgetRow } = await db.from('budgets').select('amount').eq('user_id', userId).eq('category', category).eq('month', expenseMonth).maybeSingle()
      if (budgetRow?.amount) {
        const { data: categoryExpenses } = await db.from('expenses').select('amount').eq('user_id', userId).eq('category', category).gte('date', `${expenseMonth}-01`)
        const spent = (categoryExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0)
        const ratio = spent / Number(budgetRow.amount)
        if (ratio >= 1) {
          nudge = `\n⚠️ Over ${category} budget by ₹${Math.round(spent - Number(budgetRow.amount)).toLocaleString('en-IN')} this month`
        } else if (ratio >= 0.9) {
          nudge = `\n⚠️ ${Math.round(ratio * 100)}% of ${category} budget used this month`
        }
      }

      return `${CE[category] ?? '📦'} Added ₹${amount.toLocaleString('en-IN')} for *${action.description ?? category}*${nudge}`
    }

    case 'list_expenses': {
      const period = (action.period as string) ?? 'today'
      const from = period === 'today' ? today : period === 'week' ? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] : `${month}-01`
      const { data } = await db.from('expenses').select('amount, category, description, date').eq('user_id', userId).gte('date', from).order('date', { ascending: false }).limit(15)
      if (!data?.length) return `No expenses in the last ${period}.`
      const total = data.reduce((s, e) => s + e.amount, 0)
      return `💸 *${period} expenses:*\n` + data.map(e => `${CE[e.category] ?? '📦'} ₹${e.amount.toLocaleString('en-IN')} — ${e.description ?? e.category}`).join('\n') + `\n\n*Total: ₹${total.toLocaleString('en-IN')}*`
    }

    case 'summary': {
      const m = (action.month as string) ?? month
      const { data } = await db.from('expenses').select('amount, category').eq('user_id', userId).gte('date', `${m}-01`).lte('date', `${m}-31`)
      if (!data?.length) return `No expenses in ${m}.`
      const byCategory: Record<string, number> = {}
      data.forEach(e => { byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount })
      const total = data.reduce((s, e) => s + e.amount, 0)
      const lines = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([c, a]) => `${CE[c] ?? '📦'} ${c}: ₹${a.toLocaleString('en-IN')}`)
      return `📊 *${m} Summary:*\n${lines.join('\n')}\n\n*Total: ₹${total.toLocaleString('en-IN')}*`
    }

    case 'set_budget': {
      const { error } = await db.from('budgets').upsert({ user_id: userId, category: action.category, amount: Number(action.amount), month }, { onConflict: 'user_id,category,month' })
      if (error) return `❌ ${error.message}`
      return `✅ Budget set: ${action.category} → ₹${Number(action.amount).toLocaleString('en-IN')}/month`
    }

    case 'set_salary': {
      const { data: existing } = await db.from('finance_profile').select('emergency_fund_months').eq('user_id', userId).single()
      const { error } = await db.from('finance_profile').upsert({ user_id: userId, monthly_salary: Number(action.amount), emergency_fund_months: existing?.emergency_fund_months ?? 6, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) return `❌ ${error.message}`
      return `💰 Salary updated: ₹${Number(action.amount).toLocaleString('en-IN')}/month`
    }

    case 'add_loan': {
      const { error } = await db.from('loans').insert({ user_id: userId, name: action.name, principal: Number(action.principal), emi: Number(action.emi), interest_rate: action.rate ?? null, remaining_months: action.months ?? null })
      if (error) return `❌ ${error.message}`
      return `🏦 Added loan: *${action.name}*\nEMI: ₹${Number(action.emi).toLocaleString('en-IN')}/mo · ${action.months ?? '?'} months remaining`
    }

    case 'add_investment': {
      const { error } = await db.from('investments').insert({ user_id: userId, name: action.name, type: action.type ?? 'other', invested_amount: Number(action.invested), current_value: Number(action.current ?? action.invested), updated_at: new Date().toISOString() })
      if (error) return `❌ ${error.message}`
      const pl = Number(action.current ?? action.invested) - Number(action.invested)
      return `📈 Added: *${action.name}*\nInvested: ₹${Number(action.invested).toLocaleString('en-IN')} · Current: ₹${Number(action.current ?? action.invested).toLocaleString('en-IN')}${pl !== 0 ? ` · P&L: ₹${pl.toLocaleString('en-IN')}` : ''}`
    }

    case 'net_worth': {
      const [profileRes, loansRes, investmentsRes, expensesRes] = await Promise.all([
        db.from('finance_profile').select('monthly_salary').eq('user_id', userId).single(),
        db.from('loans').select('emi, remaining_months').eq('user_id', userId),
        db.from('investments').select('invested_amount, current_value').eq('user_id', userId),
        db.from('expenses').select('amount').eq('user_id', userId).gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
      ])
      const portfolio = (investmentsRes.data ?? []).reduce((s, i) => s + Number(i.current_value), 0)
      const debt = (loansRes.data ?? []).reduce((s, l) => s + Number(l.emi) * (l.remaining_months ?? 0), 0)
      const netWorth = portfolio - debt
      const salary = profileRes.data?.monthly_salary ?? 0
      const avgSpend = Math.round((expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0) / 3)
      const emis = (loansRes.data ?? []).reduce((s, l) => s + Number(l.emi), 0)
      return `💼 *Net Worth Snapshot:*\n\nPortfolio: ₹${portfolio.toLocaleString('en-IN')}\nTotal debt: ₹${debt.toLocaleString('en-IN')}\n*Net Worth: ₹${netWorth.toLocaleString('en-IN')}*\n\n💸 Monthly: ₹${salary.toLocaleString('en-IN')} salary − ₹${emis.toLocaleString('en-IN')} EMIs − ₹${avgSpend.toLocaleString('en-IN')} avg spend = *₹${(salary - emis - avgSpend).toLocaleString('en-IN')} free*`
    }

    case 'ask': {
      const { askAI } = await import('@/lib/ai-gateway')
      const [profileRes, loansRes, investmentsRes, goalsRes, expensesRes] = await Promise.all([
        db.from('finance_profile').select('*').eq('user_id', userId).single(),
        db.from('loans').select('*').eq('user_id', userId),
        db.from('investments').select('*').eq('user_id', userId),
        db.from('financial_goals').select('*').eq('user_id', userId),
        db.from('expenses').select('amount').eq('user_id', userId).gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
      ])
      const salary = profileRes.data?.monthly_salary ?? 0
      const emis = (loansRes.data ?? []).reduce((s, l) => s + Number(l.emi), 0)
      const portfolio = (investmentsRes.data ?? []).reduce((s, i) => s + Number(i.current_value), 0)
      const avgSpend = Math.round((expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0) / 3)
      const context = `Vinay's finances: salary ₹${salary}/mo, EMIs ₹${emis}/mo, avg spend ₹${avgSpend}/mo, portfolio ₹${portfolio}, loans: ${(loansRes.data ?? []).map(l => `${l.name} ₹${l.emi}/mo ${l.remaining_months}mo left`).join('; ')}, goals: ${(goalsRes.data ?? []).map(g => `${g.name} target ₹${g.target_amount} saved ₹${g.current_amount}`).join('; ')}`
      const answer = await askAI('finance_advisor', `${context}\n\nQuestion: ${action.question}`, "You are Vinay's personal finance advisor. Give sharp, numbers-driven advice. Be direct. Under 150 words.", { userId })
      return `🤖 *Finance Advisor:*\n\n${answer}`
    }

    case 'amend_expense': {
      const { data } = await db.from('expenses').select('id, description, category, amount').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const last = data?.[0]
      if (!last) return `❌ No recent expense to amend.`
      const newAmount = Number(action.amount)
      await db.from('expenses').update({ amount: newAmount }).eq('id', last.id)
      return `✏️ Updated *${last.description ?? last.category}*: ₹${Number(last.amount).toLocaleString('en-IN')} → ₹${newAmount.toLocaleString('en-IN')}`
    }

    case 'undo_last': {
      const { data } = await db.from('expenses').select('id, description, category, amount').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const last = data?.[0]
      if (!last) return `❌ No recent expense to undo.`
      await db.from('expenses').delete().eq('id', last.id)
      return `🗑️ Undone: ₹${Number(last.amount).toLocaleString('en-IN')} for *${last.description ?? last.category}*`
    }

    case 'add_recurring': {
      const category = String(action.category ?? 'Other')
      const dayOfMonth = Math.min(28, Math.max(1, Number(action.day_of_month ?? 1)))
      const { error } = await db.from('recurring_expenses').insert({ user_id: userId, name: action.name, amount: Number(action.amount), category, day_of_month: dayOfMonth })
      if (error) return `❌ ${error.message}`
      return `🔁 Added recurring: *${action.name}* — ₹${Number(action.amount).toLocaleString('en-IN')}/mo on day ${dayOfMonth}${CE[category] ? ` ${CE[category]}` : ''}\n_Auto-logs every month via the daily cron._`
    }

    case 'list_recurring': {
      const { data } = await db.from('recurring_expenses').select('name, amount, category, day_of_month, active').eq('user_id', userId).order('day_of_month', { ascending: true })
      if (!data?.length) return 'No recurring expenses set up. Try "rent is 15000 every month".'
      return `🔁 *Recurring expenses:*\n` + data.map(r => `${CE[r.category] ?? '📦'} *${r.name}* — ₹${Number(r.amount).toLocaleString('en-IN')}/mo _(day ${r.day_of_month}${r.active ? '' : ', paused'})_`).join('\n')
    }

    default:
      return `*Finance Bot — What I can do:*\n\n💸 *Expenses:*\n• "spent 500 on Swiggy food"\n• "show today's expenses"\n• "monthly summary"\n• "set food budget 8000"\n• "actually make that 400" (amend)\n• "undo that"\n\n🔁 *Recurring:*\n• "rent is 15000 every month"\n• "show my recurring expenses"\n\n📊 *Portfolio:*\n• "net worth"\n• "my salary is 120000"\n• "add home loan 20L EMI 15000 180 months"\n• "add SIP Axis Bluechip invested 50000 current 65000"\n\n🤖 *AI Advisor:*\n• "can I afford a car?"\n• "should I prepay my loan?"`
  }
}
