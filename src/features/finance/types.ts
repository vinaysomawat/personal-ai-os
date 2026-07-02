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

export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Health', 'Shopping',
  'Entertainment', 'Learning', 'Utilities', 'Other',
] as const

export type Category = typeof CATEGORIES[number]
