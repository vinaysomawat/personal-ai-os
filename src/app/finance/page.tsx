import FinanceView from '@/features/finance/components/FinanceView'
import { getFinanceData, getFinanceCalendarData } from '@/features/finance/actions'

export default async function FinancePage() {
  const [data, calendar] = await Promise.all([getFinanceData(), getFinanceCalendarData()])
  return <FinanceView {...data} calendar={calendar} />
}
