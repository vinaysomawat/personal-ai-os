import FinanceView from '@/features/finance/components/FinanceView'
import { getFinanceData } from '@/features/finance/actions'

export default async function FinancePage() {
  const data = await getFinanceData()
  return <FinanceView {...data} />
}
