import { READINESS_AREAS } from './types'

// JD priority topic (career QUIZ_TOPICS vocabulary) → a Prep Question Bank
// link. Shared by the Interviews page and Company Prep Mode.
export function topicHref(topic: string): string {
  if (topic === 'System Design') return '/prep?tab=questions&cat=system-design'
  const area = READINESS_AREAS.find(a => (a.quizTopics as readonly string[]).includes(topic))
  const coding = area?.codingTopics[0]
  return `/prep?tab=questions&cat=quiz${coding ? `&topic=${encodeURIComponent(coding)}` : ''}`
}
