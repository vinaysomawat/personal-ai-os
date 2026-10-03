import PrepView, { type PrepTab } from '@/features/prep/components/PrepView'
import { getPrepData } from '@/features/prep/actions'

const TABS: PrepTab[] = ['today', 'questions', 'flashcards', 'stories']

export default async function PrepPage({ searchParams }: { searchParams: Promise<{ tab?: string; cat?: string }> }) {
  const [{ tab, cat }, data] = await Promise.all([searchParams, getPrepData()])
  if (!data) return null
  const initialTab = TABS.includes(tab as PrepTab) ? (tab as PrepTab) : 'today'
  return (
    <PrepView
      initialTab={initialTab}
      initialCategory={cat ?? null}
      today={data.today}
      session={data.session}
      streak={data.streak}
      sessionsLast7={data.sessionsLast7}
      flashcards={data.flashcards}
      reviewedToday={data.reviewedToday}
      stories={data.stories}
      rehearsals={data.rehearsals}
      readiness={data.readiness}
      settings={data.settings}
      daysLeft={data.daysLeft}
      coverage={data.coverage}
      bank={data.bank}
    />
  )
}
