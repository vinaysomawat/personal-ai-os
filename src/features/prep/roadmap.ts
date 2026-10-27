import type { PrepBlock } from './types'

// The 90-day Build roadmap (Senior Frontend → AI Product Engineer): one
// milestone per week, built into Personal OS itself so each one is a real,
// used feature to show in interviews. Deterministic — the week is counted
// from BUILD_START; after the last week (ROADMAP.length, 11) there is no
// Build block. Each Build is UI-first with a thin backend — the frontend
// side of AI features is the senior-frontend edge.

// Monday of week 1 (IST date).
export const BUILD_START = '2026-10-19'

export interface RoadmapWeek {
  week: number
  title: string
  milestone: string
  doneWhen: string
  links: { label: string; href: string }[]
}

export const ROADMAP: RoadmapWeek[] = [
  { week: 1, title: 'Backend & jobs', milestone: 'Write 10 raw SQL queries against your own Supabase tables (joins, window functions, EXPLAIN), then move one slow AI path (the weekly digest) to a background job with retries and idempotency, its progress shown in the UI',
    doneWhen: 'you can explain every index on prep_sessions / question_progress, and the job survives a forced failure without double-writing',
    links: [{ label: 'Postgres EXPLAIN', href: 'https://www.postgresql.org/docs/current/using-explain.html' }, { label: 'Inngest docs', href: 'https://www.inngest.com/docs' }] },
  { week: 2, title: 'Streaming chat UI', milestone: 'Stream Ask Brain token by token: incremental rendering, stop and retry, an optimistic message list that survives a reload, plus tokens and cost per message from askAI()',
    doneWhen: 'Ask Brain streams, can be cancelled mid-answer, and shows cost per answer',
    links: [{ label: 'Streaming messages', href: 'https://docs.claude.com/en/docs/build-with-claude/streaming' }, { label: 'AI SDK', href: 'https://ai-sdk.dev/docs' }] },
  { week: 3, title: 'Embeddings', milestone: 'Enable pgvector in Supabase, embed every Question Bank question and your saved answers, and show a "similar questions" list under each question (loading, empty and ranked states)',
    doneWhen: 'a ranked "similar questions" list appears under each question',
    links: [{ label: 'Supabase pgvector', href: 'https://supabase.com/docs/guides/database/extensions/pgvector' }] },
  { week: 4, title: 'Hybrid retrieval', milestone: 'Combine Postgres full-text and vector search with reciprocal-rank fusion behind a search box over your questions, answers and stories, with highlighted matches',
    doneWhen: 'you have measured recall@5 for vector-only vs hybrid on 20 real queries',
    links: [{ label: 'Hybrid search', href: 'https://supabase.com/docs/guides/ai/hybrid-search' }] },
  { week: 5, title: 'RAG with citations', milestone: 'Ask Brain answers from retrieved notes, answers and stories with citation chips (hover to preview the source, click to open it), and says "not in your data" when nothing matches',
    doneWhen: 'every Ask Brain answer cites sources or declines',
    links: [{ label: 'Citations', href: 'https://docs.claude.com/en/docs/build-with-claude/citations' }] },
  { week: 6, title: 'Agent with tools', milestone: 'Rebuild Ask Brain as a tool-calling agent over the existing loaders (loadPrepData, finance, health) instead of one stuffed prompt, with a step limit and a live timeline of each tool call',
    doneWhen: 'a multi-step question shows each tool call in the UI as it runs',
    links: [{ label: 'Tool use', href: 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview' }] },
  { week: 7, title: 'Human-in-the-loop', milestone: 'Let the agent propose writes (log an expense, schedule a workout, add a reminder) as Approve / Edit / Reject cards before they run',
    doneWhen: 'no agent write happens without an approval, and rejected actions are logged',
    links: [{ label: 'Building effective agents', href: 'https://www.anthropic.com/engineering/building-effective-agents' }] },
  { week: 8, title: 'Evals', milestone: 'Build a golden set of 40 answers you rated by hand and measure how well answer_critique agrees with you; run it in CI when a prompt changes',
    doneWhen: 'CI prints agreement (e.g. within ±1 on 85% of answers) and fails on a regression',
    links: [{ label: 'Define success & evals', href: 'https://docs.claude.com/en/docs/test-and-evaluate/develop-tests' }] },
  { week: 9, title: 'MCP server', milestone: 'Expose Prep as an MCP server (tools: today_plan, next_question, log_answer, readiness) and use it from Claude Desktop / Claude Code; stretch: make it remote over Streamable HTTP with OAuth 2.1 + PKCE',
    doneWhen: 'you can run a drill from Claude Desktop and the answer lands in question_progress, and you can explain MCP vs A2A out loud',
    links: [{ label: 'MCP spec', href: 'https://modelcontextprotocol.io/specification' }, { label: 'TypeScript SDK', href: 'https://github.com/modelcontextprotocol/typescript-sdk' }, { label: 'MCP authorization', href: 'https://modelcontextprotocol.io/specification/draft/basic/authorization' }] },
  { week: 10, title: 'Production', milestone: 'Add tracing and latency to every askAI() and tool call, a prompt-injection case in the eval set, a fallback model on API failure, and a latency / cost panel in Settings',
    doneWhen: 'Settings → System Health shows p50/p95 latency and cost per task',
    links: [{ label: 'Langfuse', href: 'https://langfuse.com/docs' }] },
  { week: 11, title: 'Package it', milestone: 'Write the README architecture diagram, record a 2-minute demo, and put the numbers (eval agreement, recall@5, cost per answer) on your resume',
    doneWhen: 'the demo link and numbers are on your resume and LinkedIn',
    links: [] },
]

// A finished week (roadmap_progress): the proof that it shipped.
export interface RoadmapProgress {
  week: number
  proof_url: string | null
  metric: string | null
  notes: string | null
  completed_at: string
}

// Each week's practice theme: the Question Bank category and topics the
// themed drill pulls from, so you answer questions on what you build.
export interface WeekTheme { category: 'ai-engineering' | 'backend' | 'resume'; topics: string[] }
export const THEMES: Record<number, WeekTheme> = {
  1: { category: 'backend', topics: ['Data', 'Node / Next.js server'] },
  2: { category: 'ai-engineering', topics: ['LLM fundamentals', 'AI product UX'] },
  3: { category: 'ai-engineering', topics: ['Embeddings & chunking', 'Vector databases'] },
  4: { category: 'ai-engineering', topics: ['RAG & retrieval', 'Vector databases'] },
  5: { category: 'ai-engineering', topics: ['RAG & retrieval', 'Agentic RAG'] },
  6: { category: 'ai-engineering', topics: ['Agents & workflows'] },
  7: { category: 'ai-engineering', topics: ['Human-in-the-loop', 'AI product UX'] },
  8: { category: 'ai-engineering', topics: ['Evals & production'] },
  9: { category: 'ai-engineering', topics: ['MCP & A2A'] },
  10: { category: 'ai-engineering', topics: ['Evals & production'] },
  11: { category: 'resume', topics: [] },
}
// Outside the roadmap the drill is AI engineering, any topic.
export const themeFor = (date: string): WeekTheme => THEMES[roadmapWeek(date)?.week ?? 0] ?? { category: 'ai-engineering', topics: [] }

// 1-based week for an IST date, or null before the start / after the last week.
export function roadmapWeek(date: string): RoadmapWeek | null {
  const days = Math.floor((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${BUILD_START}T00:00:00Z`).getTime()) / 86400000)
  if (days < 0) return null
  return ROADMAP[Math.floor(days / 7)] ?? null
}

// Learn and Build take their minutes from the day template (dayplan.ts).
// Read the week's concept before building it. Ticked by FocusBar Finish.
export function learnBlock(date: string, minutes: number): PrepBlock | null {
  const w = roadmapWeek(date)
  if (!w) return null
  return {
    key: 'learn', label: `Learn · W${w.week}: ${w.title}`, minutes,
    detail: w.links.length
      ? `Read the docs below before you build — note 3 things you'd say about it in an interview`
      : `Re-read your proof links and numbers from weeks 1–${ROADMAP.length - 1} — note the 3 strongest for your resume`,
    href: '/prep?tab=ai', done: false, links: w.links,
  }
}

// Ticked by FocusBar Finish (not a question block, so no quota).
export function buildBlock(date: string, minutes: number): PrepBlock | null {
  const w = roadmapWeek(date)
  if (!w) return null
  return {
    key: 'build', label: `Build · W${w.week}: ${w.title}`, minutes,
    detail: `${w.milestone}. Done when ${w.doneWhen}.`,
    href: '/prep?tab=ai', done: false,
  }
}
