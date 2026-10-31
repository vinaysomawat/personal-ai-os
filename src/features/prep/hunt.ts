import { toPrepDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock } from './types'

// Interview War Mode — the Question Bank categories, redo rules and the
// question-block builder. The day itself is the day template (dayplan.ts).

export type BankCategory = 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm' | 'backend' | 'code-review' | 'resume' | 'architecture' | 'ai-engineering'

// Question Bank categories and the minutes one question takes.
export const BANK_CATEGORIES: { key: BankCategory; label: string; minutesPerQ: number }[] = [
  // Machine coding: build a component from scratch, timed (the #1 round at
  // Indian product companies).
  { key: 'ui-coding', label: 'UI coding', minutesPerQ: 45 },
  { key: 'system-design', label: 'System design', minutesPerQ: 60 },
  { key: 'quiz', label: 'Theory', minutesPerQ: 5 },
  // Full-stack "product engineer" loops: API design, Node/Next server, auth,
  // data, caching, AI backend.
  { key: 'backend', label: 'Backend & APIs', minutesPerQ: 8 },
  { key: 'javascript-functions', label: 'JS functions', minutesPerQ: 25 },
  // Answer from real experience + AI interviewer feedback.
  { key: 'ai-native', label: 'AI-native', minutesPerQ: 10 },
  { key: 'algorithm', label: 'Algorithms', minutesPerQ: 30 },
  // Senior / lead Angular roles (banks, fintech, GCCs).
  { key: 'angular', label: 'Angular', minutesPerQ: 6 },
  // General/fit questions (tell me about yourself, the layoff, salary…).
  { key: 'behavioral', label: 'Behavioral Q&A', minutesPerQ: 10 },
  // Review an AI-generated PR: find the planted issues, rank them, fix them.
  { key: 'code-review', label: 'Code review', minutesPerQ: 15 },
  // Deep-dive on my own resume claims (projects, numbers, decisions) — what
  // hiring-manager and onsite rounds probe.
  { key: 'resume', label: 'From my resume', minutesPerQ: 8 },
  // Senior / Lead / Staff / Architect loops: rendering strategy, bundling,
  // monorepos, micro-frontends, platform, security, design systems, leading.
  { key: 'architecture', label: 'FE architecture & lead', minutesPerQ: 8 },
  // AI product / full-stack AI engineer loops: LLMs, embeddings, vector DBs,
  // RAG, agentic RAG, agents, human-in-the-loop, evals, MCP & A2A, AI product UX.
  { key: 'ai-engineering', label: 'AI engineering', minutesPerQ: 8 },
]

export interface CategoryCoverage {
  key: BankCategory
  label: string
  total: number
  seen: number
  doneToday: number
  // Weak answers due for a redo today (redoDue below).
  redoDue: number
}

// Redo weak answers: a question whose latest rating is under 7 comes back
// 1 day (<5), 2 days (<6) or 4 days (<7) after that rating — the same gaps
// as the topic revision queue. Up to REDO_SHARE of a category's daily quota
// goes to these first; the rest is new questions. One answered today isn't
// due again today.
export const REDO_SHARE = 0.4
export const redoInterval = (rating: number) => rating < 5 ? 1 : rating < 6 ? 2 : 4
export const redoSlots = (quota: number) => Math.round(quota * REDO_SHARE)
export function isRedoDue(q: Pick<BankQuestion, 'last_rating' | 'last_rated_at' | 'last_seen_at'>, today: string): boolean {
  if (q.last_rating === null || q.last_rating >= 7 || !q.last_rated_at) return false
  if (q.last_seen_at && toPrepDateStr(q.last_seen_at) === today) return false
  const d = new Date(`${toPrepDateStr(q.last_rated_at)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + redoInterval(q.last_rating))
  return d.toISOString().slice(0, 10) <= today
}

function bankDetail(key: BankCategory, quota: number, focusTopic: string | null | undefined): string {
  const cat = BANK_CATEGORIES.find(c => c.key === key)!
  const s = quota === 1 ? '' : 's'
  // A guide, not a target: the block is a time box.
  const n = quota > 1 ? `about ${quota}` : `${quota}`
  switch (key) {
    case 'quiz': return `Answer ${n} theory questions out loud, type the gist, get the AI rating${focusTopic ? ` — focus: ${focusTopic}` : ''}`
    case 'ai-native': return `Answer ${n} AI-native question${s} from real experience, get the AI rating, tighten the answer`
    case 'ui-coding': return `Machine coding: build ${n} component${s} from scratch in your editor, timed — working, keyboard + ARIA, then summarize the trade-offs`
    case 'system-design': return `Design ${n} frontend system${s} end to end (Requirements → Architecture → Data → Interface → Optimizations), out loud, then get the AI rating`
    case 'backend': return `Answer ${n} backend & API question${s} out loud, get the AI rating`
    case 'resume': return `Answer ${n} resume deep-dive question${s} out loud from your real work — the decision, the trade-off, the number`
    case 'architecture': return `Answer ${n} architecture & lead question${s} out loud (rendering strategy, bundling, monorepo, micro-frontends, platform, leading teams) — the options, the trade-off, your call`
    case 'ai-engineering': return `Answer ${n} AI-engineering question${s} out loud — the pipeline, the trade-off, how you'd evaluate it`
    case 'code-review': return `Review ${n} AI-generated PR${s}: find the planted issues, rank them by severity, give the fix`
    case 'javascript-functions': return `Implement ${n} JS function${s} without looking anything up (polyfills, debounce, promise utilities), handle edge cases`
    default: return `Solve ${n} ${cat.label.toLowerCase()} problem${s} (medium, pattern-first), talking through complexity`
  }
}

// A question block is a time box (war.ts blockProgress): its minutes are
// the target, rounded to 5 and at least one question's worth. The question
// count is only a guide (and sizes the redo slots).
// A plan item can be split into several slots in a day (Edit today): the
// first keeps its key, the rest are `<key>~<n>`. baseKey() drops the suffix,
// catOf() gives a question block's category.
export const baseKey = (key: string) => key.split('~')[0]
export const catOf = (key: string) => baseKey(key).slice(5)

export function bankBlock(c: CategoryCoverage, budget: number, opts: { label?: string; prefix?: string; topic?: string; focusTopic?: string | null; gap: number }): PrepBlock {
  const cat = BANK_CATEGORIES.find(x => x.key === c.key)!
  const minutes = Math.max(cat.minutesPerQ, Math.round(budget / 5) * 5)
  const quota = Math.max(1, Math.floor(minutes / cat.minutesPerQ))
  const redo = Math.min(c.redoDue, redoSlots(quota))
  return {
    key: `bank:${c.key}`, label: opts.label ?? cat.label, minutes,
    detail: `${opts.prefix ?? ''}${bankDetail(c.key, quota, opts.focusTopic)}${redo ? ` — the first ${redo} redo your weak answers` : ''} (${Math.round((1 - opts.gap) * 100)}% of gate)`,
    href: `/prep?tab=questions&cat=${c.key}${opts.topic ? `&topic=${encodeURIComponent(opts.topic)}` : ''}`, done: c.doneToday * cat.minutesPerQ >= minutes,
  }
}

// Interview War Mode is always on (there is no target date to switch it off
// since v4.0.8). Kept as the one shared check for everything that pauses or
// changes while hunting, so turning it back into a setting is one place.
export async function isHuntMode(): Promise<boolean> {
  return true
}
