import PrepView, { type PrepTab } from '@/features/prep/components/PrepView'
import { getPrepData } from '@/features/prep/actions'

const TABS: PrepTab[] = ['today', 'ai', 'questions', 'mock', 'stories']

export default async function PrepPage({ searchParams }: { searchParams: Promise<{ tab?: string; cat?: string; topic?: string; format?: string }> }) {
  const [{ tab, cat, topic, format }, data] = await Promise.all([searchParams, getPrepData()])
  if (!data) return null
  const initialTab = TABS.includes(tab as PrepTab) ? (tab as PrepTab) : 'today'
  return (
    <PrepView
      initialTab={initialTab}
      initialCategory={cat ?? null}
      initialTopic={topic ?? null}
      initialFormat={format ?? null}
      today={data.today}
      session={data.session}
      streak={data.streak}
      sessionsLast7={data.sessionsLast7}
      mockRounds={data.mockRounds}
      war={data.war}
      focusSessions={data.focusSessions}
      template={data.template}
      stories={data.stories}
      rehearsals={data.rehearsals}
      readiness={data.readiness}
      settings={data.settings}
      coverage={data.coverage}
      bank={data.bank}
      roadmap={data.roadmap}
    />
  )
}
