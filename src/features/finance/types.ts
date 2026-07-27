export interface Expense {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  month: string
}

export interface FinanceProfile {
  id: string
  user_id: string
  monthly_salary: number | null
  emergency_fund_months: number
  updated_at: string
}

export interface Loan {
  id: string
  user_id: string
  name: string
  principal: number
  emi: number
  interest_rate: number | null
  remaining_months: number | null
  created_at: string
}

export type InvestmentType = 'mutual_fund' | 'stocks' | 'fd' | 'crypto' | 'other'

export interface Investment {
  id: string
  user_id: string
  name: string
  type: InvestmentType
  invested_amount: number
  current_value: number
  notes: string | null
  is_sip: boolean
  sip_amount: number | null
  sip_day_of_month: number | null
  sip_last_contribution_month: string | null
  updated_at: string
  created_at: string
}

export type GoalPriority = 'high' | 'medium' | 'low'

export interface FinancialGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  priority: GoalPriority
  created_at: string
}

export interface RecurringExpense {
  id: string
  user_id: string
  name: string
  amount: number
  category: string
  day_of_month: number
  active: boolean
  created_at: string
}

export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Health', 'Shopping',
  'Entertainment', 'Learning', 'Utilities', 'EMIs', 'Bills', 'Other',
] as const

export type Category = typeof CATEGORIES[number]

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'stocks',      label: 'Stocks' },
  { value: 'fd',          label: 'Fixed Deposit' },
  { value: 'crypto',      label: 'Crypto' },
  { value: 'other',       label: 'Other' },
]

export const INVESTMENT_COLOR: Record<InvestmentType, string> = {
  mutual_fund: 'bg-purple-500/15 text-purple-400',
  stocks:      'bg-good-soft text-green-400',
  fd:          'bg-warn-soft text-amber-400',
  crypto:      'bg-orange-500/15 text-orange-400',
  other:       'bg-surface-2 text-fg-secondary',
}
