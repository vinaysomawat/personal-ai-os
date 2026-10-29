import { COMPETENCIES, type BankQuestion, type Story } from './types'

// Interview prep from a job description — the deterministic half (no AI):
// which skills the JD asks for, mapped onto the Question Bank's categories
// and topics; the bank questions to practise for them (unseen and weak
// first); your coverage per matched category; the Story Bank stories whose
// competencies the JD's leadership asks hit; and search links for interview
// experiences. The AI plan and online research add to this (actions.ts,
// the /interview-prep skill).

interface Skill {
  label: string
  // Word-boundary patterns, matched case-insensitively.
  patterns: string[]
  // Bank category, optionally narrowed to one topic.
  targets: { category: string; topic?: string }[]
}

const SKILLS: Skill[] = [
  { label: 'React', patterns: ['react', 'react\\.js', 'reactjs', 'hooks', 'redux', 'zustand', 'react query'], targets: [{ category: 'quiz', topic: 'React & State Management' }, { category: 'ui-coding', topic: 'React & State Management' }] },
  { label: 'Next.js', patterns: ['next\\.js', 'nextjs', 'app router', 'server components', 'ssr', 'ssg', 'isr'], targets: [{ category: 'quiz', topic: 'Next.js' }, { category: 'backend', topic: 'Node / Next.js server' }] },
  { label: 'JavaScript', patterns: ['javascript', 'es6', 'ecmascript', 'closures', 'event loop'], targets: [{ category: 'quiz', topic: 'JavaScript Fundamentals' }, { category: 'javascript-functions' }] },
  { label: 'TypeScript', patterns: ['typescript'], targets: [{ category: 'quiz', topic: 'TypeScript' }] },
  { label: 'Async & promises', patterns: ['async', 'promises?', 'concurrency'], targets: [{ category: 'quiz', topic: 'Async & Promises' }] },
  { label: 'CSS & layout', patterns: ['css', 'tailwind', 'sass', 'scss', 'responsive', 'styled-components'], targets: [{ category: 'quiz', topic: 'CSS & Layout' }] },
  { label: 'Web performance', patterns: ['performance', 'web vitals', 'core web vitals', 'lighthouse', 'lcp', 'bundle size', 'optimi[sz]ation'], targets: [{ category: 'quiz', topic: 'Performance' }, { category: 'architecture', topic: 'Performance architecture' }] },
  { label: 'Accessibility', patterns: ['accessibility', 'a11y', 'wcag', 'aria', 'screen readers?'], targets: [{ category: 'quiz', topic: 'Accessibility' }] },
  { label: 'Testing', patterns: ['testing', 'unit tests?', 'jest', 'vitest', 'cypress', 'playwright', 'testing library', 'tdd'], targets: [{ category: 'quiz', topic: 'Testing' }] },
  { label: 'Browser & DOM', patterns: ['dom', 'browser apis?', 'web apis?', 'service workers?'], targets: [{ category: 'quiz', topic: 'DOM & Browser APIs' }] },
  { label: 'APIs', patterns: ['rest apis?', 'restful', 'graphql', 'api design', 'grpc', 'apis?'], targets: [{ category: 'backend', topic: 'API design' }, { category: 'quiz', topic: 'Networking & APIs' }] },
  { label: 'Node.js', patterns: ['node', 'node\\.js', 'nodejs', 'express', 'nestjs', 'fastify'], targets: [{ category: 'backend', topic: 'Node / Next.js server' }] },
  { label: 'Python', patterns: ['python', 'fastapi', 'django', 'flask', 'pydantic'], targets: [{ category: 'backend' }] },
  { label: 'Databases', patterns: ['sql', 'postgres(ql)?', 'mysql', 'mongodb', 'databases?', 'supabase', 'prisma'], targets: [{ category: 'backend', topic: 'Data' }] },
  { label: 'Caching', patterns: ['caching', 'cache', 'redis', 'cdn'], targets: [{ category: 'backend', topic: 'Caching & performance' }] },
  { label: 'Auth & security', patterns: ['auth', 'authentication', 'authori[sz]ation', 'oauth', 'jwt', 'security', 'owasp', 'xss', 'csrf'], targets: [{ category: 'backend', topic: 'Auth & security' }, { category: 'architecture', topic: 'Security' }] },
  { label: 'System design', patterns: ['system design', 'scalab(le|ility)', 'distributed', 'microservices', 'high[- ]level design', 'low[- ]level design'], targets: [{ category: 'system-design' }] },
  { label: 'Frontend architecture', patterns: ['architecture', 'micro[- ]frontends?', 'module federation', 'monorepo', 'nx', 'turborepo', 'design systems?', 'component librar(y|ies)'], targets: [{ category: 'architecture' }] },
  { label: 'Build tooling', patterns: ['webpack', 'vite', 'rollup', 'babel', 'esbuild', 'ci/cd', 'ci\\/cd'], targets: [{ category: 'architecture', topic: 'Build & bundling' }, { category: 'architecture', topic: 'Platform & delivery' }] },
  { label: 'Real-time', patterns: ['websockets?', 'real[- ]time', 'sse', 'server-sent events'], targets: [{ category: 'system-design', topic: 'Real-time' }] },
  { label: 'Angular', patterns: ['angular', 'rxjs', 'ngrx', 'signals'], targets: [{ category: 'angular' }] },
  { label: 'LLMs & GenAI', patterns: ['llms?', 'genai', 'generative ai', 'gpt', 'openai', 'anthropic', 'claude', 'prompt engineering', 'prompts?'], targets: [{ category: 'ai-engineering', topic: 'LLM fundamentals' }] },
  { label: 'RAG & vectors', patterns: ['rag', 'retrieval', 'embeddings?', 'vector (db|database|search|store)s?', 'pgvector', 'pinecone'], targets: [{ category: 'ai-engineering', topic: 'RAG & retrieval' }, { category: 'ai-engineering', topic: 'Vector databases' }] },
  { label: 'AI agents', patterns: ['agents?', 'agentic', 'mcp', 'tool calling', 'function calling', 'langchain', 'langgraph'], targets: [{ category: 'ai-engineering', topic: 'Agents & workflows' }] },
  { label: 'Evals', patterns: ['evals?', 'evaluation', 'llm-as-judge'], targets: [{ category: 'ai-engineering', topic: 'Evals & production' }] },
  { label: 'AI-assisted coding', patterns: ['copilot', 'cursor', 'ai tools', 'ai-assisted', 'ai assisted', 'ai-native'], targets: [{ category: 'ai-native' }] },
  { label: 'DSA', patterns: ['algorithms?', 'data structures?', 'problem[- ]solving', 'leetcode', 'dsa'], targets: [{ category: 'algorithm' }] },
  { label: 'Machine coding', patterns: ['machine coding', 'ui components?', 'build components', 'component development'], targets: [{ category: 'ui-coding' }] },
  { label: 'Code review', patterns: ['code reviews?', 'reviewing code', 'pull requests?'], targets: [{ category: 'code-review' }] },
  { label: 'Leadership', patterns: ['lead', 'leadership', 'mentor(ing|ship)?', 'tech lead', 'ownership', 'stakeholders?', 'cross[- ]functional'], targets: [{ category: 'architecture', topic: 'Tech lead' }, { category: 'behavioral', topic: 'Leadership' }] },
]

// JD phrases → Story Bank competencies (which stories to have ready).
const COMPETENCY_PATTERNS: Record<string, string[]> = {
  ownership: ['ownership', 'end[- ]to[- ]end', 'drive'],
  mentoring: ['mentor', 'mentoring', 'coach', 'grow (the )?team', 'hiring'],
  influence: ['influence', 'stakeholders?', 'align'],
  technical_decision: ['architecture', 'trade-?offs?', 'technical decisions?', 'design decisions?'],
  raising_bar: ['quality', 'best practices', 'standards', 'code reviews?'],
  conflict: ['conflict', 'disagree'],
  ambiguity: ['ambiguity', 'ambiguous', 'fast[- ]paced', 'startup', '0 to 1', 'zero to one'],
  failure: ['learn', 'growth mindset', 'feedback'],
  delivery: ['deadlines?', 'deliver', 'ship', 'fast[- ]paced'],
  collaboration: ['cross[- ]functional', 'collaborat', 'product managers?', 'designers?', 'partner'],
}

const re = (patterns: string[]) => new RegExp(`(^|[^a-z0-9])(${patterns.join('|')})(?=$|[^a-z0-9])`, 'gi')

export interface JdSkill { label: string; hits: number; targets: { category: string; topic?: string }[] }
export interface JdCategoryGap { category: string; total: number; seen: number; avgRating: number | null }
export interface JdMatch {
  skills: JdSkill[]
  // Matched bank categories, strongest first (drives the day plan's order).
  categories: string[]
  gaps: JdCategoryGap[]
  // Bank question ids to practise, in order.
  questions: { id: string; title: string; category: string; topic: string | null; why: 'unseen' | 'weak' | 'review' }[]
  stories: { id: string; title: string; competencies: string[] }[]
  competencies: string[]
}

const MAX_QUESTIONS = 24
const PER_TARGET = 3

export function matchJD(jd: string, bank: BankQuestion[], stories: Story[]): JdMatch {
  const text = jd.toLowerCase()
  const skills = SKILLS.map(s => ({ label: s.label, hits: (text.match(re(s.patterns)) ?? []).length, targets: s.targets }))
    .filter(s => s.hits > 0).sort((a, b) => b.hits - a.hits)

  const weight = new Map<string, number>()
  for (const s of skills) for (const t of s.targets) weight.set(t.category, (weight.get(t.category) ?? 0) + s.hits)
  const categories = [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)

  const gaps = categories.map(category => {
    const qs = bank.filter(q => q.category === category)
    const rated = qs.filter(q => q.last_rating !== null)
    return {
      category, total: qs.length, seen: qs.filter(q => q.last_seen_at).length,
      avgRating: rated.length ? Math.round(rated.reduce((s, q) => s + q.last_rating!, 0) / rated.length * 10) / 10 : null,
    }
  })

  // Per matched (category, topic): weak answers first (rated < 7, lowest
  // first), then unseen, then the ones practised longest ago.
  const picked = new Set<string>()
  const questions: JdMatch['questions'] = []
  for (const s of skills) for (const t of s.targets) {
    const pool = bank.filter(q => q.category === t.category && (!t.topic || q.topics.includes(t.topic)) && !picked.has(q.id))
    const weak = pool.filter(q => q.last_rating !== null && q.last_rating < 7).sort((a, b) => a.last_rating! - b.last_rating!)
    const unseen = pool.filter(q => !q.last_seen_at).sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity))
    const review = pool.filter(q => q.last_seen_at && (q.last_rating === null || q.last_rating >= 7)).sort((a, b) => a.last_seen_at!.localeCompare(b.last_seen_at!))
    const take = [...weak.map(q => [q, 'weak'] as const), ...unseen.map(q => [q, 'unseen'] as const), ...review.map(q => [q, 'review'] as const)].slice(0, PER_TARGET)
    for (const [q, why] of take) {
      if (questions.length >= MAX_QUESTIONS) break
      picked.add(q.id)
      questions.push({ id: q.id, title: q.title, category: q.category, topic: t.topic ?? null, why })
    }
  }

  const competencies = COMPETENCIES.map(c => c.key as string).filter(k => re(COMPETENCY_PATTERNS[k] ?? []).test(text))
  const matchedStories = stories
    .filter(s => s.competencies.some(c => competencies.includes(c)))
    .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0))
    .slice(0, 5)
    .map(s => ({ id: s.id, title: s.title, competencies: s.competencies.filter(c => competencies.includes(c)) }))

  return { skills, categories, gaps, questions, stories: matchedStories, competencies }
}

// Google searches for recent interview experiences (last 12 months).
export function searchLinks(company: string, role: string | null, today: string): { label: string; href: string }[] {
  const since = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const q = (s: string) => `https://www.google.com/search?q=${encodeURIComponent(`${s} after:${since}`)}`
  const who = `"${company}"${role ? ` ${role}` : ''}`
  return [
    { label: 'Glassdoor', href: q(`${who} interview questions site:glassdoor.com OR site:glassdoor.co.in`) },
    { label: 'AmbitionBox', href: q(`${who} interview questions site:ambitionbox.com`) },
    { label: 'LeetCode Discuss', href: q(`${who} interview experience site:leetcode.com/discuss`) },
    { label: 'Reddit', href: q(`${who} interview experience site:reddit.com`) },
    { label: 'GeeksforGeeks', href: q(`${who} interview experience site:geeksforgeeks.org`) },
    { label: 'Blind', href: q(`${who} interview site:teamblind.com`) },
    { label: 'LinkedIn posts', href: q(`${who} interview experience site:linkedin.com/posts`) },
  ]
}

// The AI half (interview_plan task, actions.ts) and the online research the
// /interview-prep Claude Code skill writes into interview_preps.research.
export interface InterviewPlan {
  roleRead: string
  focusAreas: { area: string; why: string }[]
  rounds: { name: string; what: string }[]
  questions: { q: string; type: string; why: string }[]
  knownFor: string[]
  askThem: string[]
  prepareFor: string[]
  timeline: { when: string; what: string }[]
}
export interface InterviewResearch {
  updatedAt: string
  summary?: string
  sources: { title: string; url: string; date?: string; note?: string }[]
  questions: { q: string; source?: string; count?: number }[]
  process?: string[]
}
export interface InterviewPrep {
  id: string
  company: string
  role: string | null
  round: string | null
  jd: string
  interview_date: string
  start_min: number | null
  minutes: number
  matched: JdMatch | null
  plan: InterviewPlan | null
  research: InterviewResearch | null
  created_at: string
}
