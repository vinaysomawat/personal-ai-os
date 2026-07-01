import Card from '../components/Card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const summary = [
  { label: 'Monthly Income', value: '₹1,20,000', change: '+5%', up: true },
  { label: 'Monthly Spend', value: '₹68,400', change: '-3%', up: false },
  { label: 'Savings Rate', value: '43%', change: '=', up: null },
  { label: 'Net Worth', value: '₹8,24,000', change: '+12%', up: true },
]

const budget = [
  { category: 'Housing', spent: 18000, limit: 20000, color: 'bg-blue-500' },
  { category: 'Food', spent: 9500, limit: 10000, color: 'bg-green-500' },
  { category: 'Transport', spent: 4200, limit: 5000, color: 'bg-amber-500' },
  { category: 'Learning', spent: 3800, limit: 5000, color: 'bg-purple-500' },
  { category: 'Entertainment', spent: 6200, limit: 5000, color: 'bg-red-500' },
  { category: 'Savings / Invest', spent: 51600, limit: 60000, color: 'bg-accent' },
]

const transactions = [
  { desc: 'Swiggy', amount: -520, date: 'Today', cat: 'Food' },
  { desc: 'Salary credit', amount: 120000, date: 'Jun 30', cat: 'Income' },
  { desc: 'Zerodha SIP', amount: -10000, date: 'Jun 30', cat: 'Invest' },
  { desc: 'Electricity bill', amount: -1840, date: 'Jun 29', cat: 'Utilities' },
  { desc: 'Udemy course', amount: -1299, date: 'Jun 28', cat: 'Learning' },
]

export default function Finance() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.map(s => (
          <Card key={s.label}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {s.up === true && <TrendingUp size={12} className="text-green-400" />}
              {s.up === false && <TrendingDown size={12} className="text-red-400" />}
              {s.up === null && <Minus size={12} className="text-slate-500" />}
              <span className={`text-xs ${s.up === true ? 'text-green-400' : s.up === false ? 'text-red-400' : 'text-slate-500'}`}>
                {s.change} this month
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Budget vs Spend">
          <div className="space-y-3.5">
            {budget.map(b => {
              const pct = Math.min((b.spent / b.limit) * 100, 100)
              const over = b.spent > b.limit
              return (
                <div key={b.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={over ? 'text-red-400' : 'text-slate-300'}>{b.category}</span>
                    <span className="text-slate-500 font-mono">
                      ₹{b.spent.toLocaleString()} / ₹{b.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : b.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Recent Transactions">
          <ul className="space-y-2">
            {transactions.map((t, i) => (
              <li key={i} className="flex items-center gap-3 py-2 border-b border-surface-3 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{t.desc}</p>
                  <p className="text-xs text-slate-600">{t.date} · {t.cat}</p>
                </div>
                <span className={`text-sm font-mono font-medium ${t.amount > 0 ? 'text-green-400' : 'text-slate-300'}`}>
                  {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
