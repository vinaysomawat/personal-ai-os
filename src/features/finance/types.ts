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

export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Health', 'Shopping',
  'Entertainment', 'Learning', 'Utilities', 'EMIs', 'Bills', 'Other',
] as const

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'stocks',      label: 'Stocks' },
  { value: 'fd',          label: 'Fixed Deposit' },
  { value: 'crypto',      label: 'Crypto' },
  { value: 'other',       label: 'Other' },
]
