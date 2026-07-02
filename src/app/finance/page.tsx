import FinanceView from '@/features/finance/components/FinanceView'
import { getFinanceData } from '@/features/finance/actions'

export default async function FinancePage() {
  const { expenses, budgets, month } = await getFinanceData()
  return <FinanceView initialExpenses={expenses} initialBudgets={budgets} month={month} />
}
