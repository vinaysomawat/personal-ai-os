import type { SupabaseClient } from '@supabase/supabase-js'

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
{"action":"help"}

Rules:
- amount is always a number (strip ₹, Rs, commas)
- Default date: today
- Default category: "Other"
- For "net worth" or "how much do I have" → net_worth
- For "my salary is X" or "I earn X" → set_salary
- For "add loan" / "I have an EMI of" → add_loan
- For "can I afford X", "should I invest", "retirement" → ask with the question`

const CE: Record<string, string> = { Food: '🍔', Transport: '🚗', Housing: '🏠', Health: '💊', Shopping: '🛍️', Entertainment: '🎬', Learning: '📚', Utilities: '💡', Other: '📦' }

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const month = today.slice(0, 7)

  switch (action.action) {
    case 'add_expense': {
      const { error } = await db.from('expenses').insert({ user_id: userId, amount: Number(action.amount), category: action.category ?? 'Other', description: action.description ?? null, date: action.date ?? today })
      if (error) return `❌ ${error.message}`
      return `${CE[String(action.category ?? 'Other')] ?? '📦'} Added ₹${Number(action.amount).toLocaleString('en-IN')} for *${action.description ?? action.category}*`
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
      const { aiText } = await import('@/lib/anthropic')
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
      const answer = await aiText(`${context}\n\nQuestion: ${action.question}`, "You are Vinay's personal finance advisor. Give sharp, numbers-driven advice. Be direct. Under 150 words.")
      return `🤖 *Finance Advisor:*\n\n${answer}`
    }

    default:
      return `*Finance Bot — What I can do:*\n\n💸 *Expenses:*\n• "spent 500 on Swiggy food"\n• "show today's expenses"\n• "monthly summary"\n• "set food budget 8000"\n\n📊 *Portfolio:*\n• "net worth"\n• "my salary is 120000"\n• "add home loan 20L EMI 15000 180 months"\n• "add SIP Axis Bluechip invested 50000 current 65000"\n\n🤖 *AI Advisor:*\n• "can I afford a car?"\n• "should I prepay my loan?"`
  }
}
