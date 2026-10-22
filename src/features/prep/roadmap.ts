import type { PrepBlock } from './types'

// The 90-day Build roadmap (Senior Frontend → AI Product Engineer): one
// milestone per week, built into Personal OS itself so each one is a real,
// used feature to show in interviews. Deterministic — the week is counted
// from BUILD_START; after week 13 there is no Build block.

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
  { week: 1, title: 'Backend gaps', milestone: 'Write 15 raw SQL queries against your own Supabase tables (joins, window functions, EXPLAIN), then sketch the OAuth 2.1 authorization-code + PKCE flow from memory',
    doneWhen: 'you can explain every index on prep_sessions / question_progress and draw the PKCE flow without notes',
    links: [{ label: 'Postgres EXPLAIN', href: 'https://www.postgresql.org/docs/current/using-explain.html' }, { label: 'OAuth 2.1', href: 'https://oauth.net/2.1/' }] },
  { week: 2, title: 'Queues & jobs', milestone: 'Move one slow AI path (JD analysis or the weekly forecast) to a background job with retries and idempotency, with progress shown in the UI',
    doneWhen: 'the job survives a forced failure and retries without double-writing',
    links: [{ label: 'Inngest docs', href: 'https://www.inngest.com/docs' }] },
  { week: 3, title: 'LLM API depth', milestone: 'Add streaming to Ask Brain (token-by-token, stop, retry), plus tokens and cost per message from askAI()',
    doneWhen: 'Ask Brain streams, can be cancelled, and shows cost per answer',
    links: [{ label: 'Streaming messages', href: 'https://docs.claude.com/en/docs/build-with-claude/streaming' }, { label: 'AI SDK', href: 'https://ai-sdk.dev/docs' }] },
  { week: 4, title: 'Embeddings', milestone: 'Enable pgvector in Supabase and embed every Question Bank question and your saved answers',
    doneWhen: 'a "similar questions" list appears under each question',
    links: [{ label: 'Supabase pgvector', href: 'https://supabase.com/docs/guides/database/extensions/pgvector' }] },
  { week: 5, title: 'Hybrid retrieval', milestone: 'Combine Postgres full-text and vector search with reciprocal-rank fusion; logged interview questions find their closest bank questions',
    doneWhen: 'you have measured recall@5 for vector-only vs hybrid on 20 real queries',
    links: [{ label: 'Hybrid search', href: 'https://supabase.com/docs/guides/ai/hybrid-search' }] },
  { week: 6, title: 'RAG with citations', milestone: 'Ask Brain answers from retrieved notes, answers and stories with clickable citations, and says "not in your data" when nothing matches',
    doneWhen: 'every Ask Brain answer cites sources or declines',
    links: [{ label: 'Citations', href: 'https://docs.claude.com/en/docs/build-with-claude/citations' }] },
  { week: 7, title: 'Agent with tools', milestone: 'Rebuild Ask Brain as a tool-calling agent over the existing loaders (loadPrepData, loadPipelineStatus, finance) instead of one stuffed prompt, with a step limit',
    doneWhen: 'a multi-step question shows each tool call in the UI as it runs',
    links: [{ label: 'Tool use', href: 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview' }] },
  { week: 8, title: 'Human-in-the-loop', milestone: 'Let the agent propose writes (log outreach, schedule a round) that need an Approve / Reject tap before they run',
    doneWhen: 'no agent write happens without an approval, and rejected actions are logged',
    links: [{ label: 'Building effective agents', href: 'https://www.anthropic.com/engineering/building-effective-agents' }] },
  { week: 9, title: 'Evals', milestone: 'Build a golden set of 40 answers you rated by hand and measure how well answer_critique agrees with you; run it in CI when a prompt changes',
    doneWhen: 'CI prints agreement (e.g. within ±1 on 85% of answers) and fails on a regression',
    links: [{ label: 'Define success & evals', href: 'https://docs.claude.com/en/docs/test-and-evaluate/develop-tests' }] },
  { week: 10, title: 'MCP server', milestone: 'Expose Prep as an MCP server (tools: today_plan, next_question, log_answer, readiness) and use it from Claude Desktop / Claude Code',
    doneWhen: 'you can run a drill from Claude Desktop and the answer lands in question_progress',
    links: [{ label: 'MCP spec', href: 'https://modelcontextprotocol.io/specification' }, { label: 'TypeScript SDK', href: 'https://github.com/modelcontextprotocol/typescript-sdk' }] },
  { week: 11, title: 'MCP auth & A2A', milestone: 'Make the MCP server remote over Streamable HTTP with OAuth (protected-resource metadata, PKCE, scoped tools); add a small research agent the coach delegates to over A2A',
    doneWhen: 'an unauthenticated client gets 401 + resource metadata, and you can explain MCP vs A2A out loud',
    links: [{ label: 'MCP authorization', href: 'https://modelcontextprotocol.io/specification/draft/basic/authorization' }, { label: 'A2A protocol', href: 'https://a2a-protocol.org/' }] },
  { week: 12, title: 'Production', milestone: 'Add tracing and latency to every askAI() and tool call, a prompt-injection case in the eval set, and a fallback model on API failure',
    doneWhen: 'Settings → System Health shows p50/p95 latency and cost per task',
    links: [{ label: 'Langfuse', href: 'https://langfuse.com/docs' }] },
  { week: 13, title: 'Package it', milestone: 'Write the README architecture diagram, record a 2-minute demo, and put the numbers (eval agreement, recall@5, cost per answer) on your resume',
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
  1: { category: 'backend', topics: ['Data', 'Auth & security'] },
  2: { category: 'backend', topics: ['Node / Next.js server', 'API design'] },
  3: { category: 'ai-engineering', topics: ['LLM fundamentals'] },
  4: { category: 'ai-engineering', topics: ['Embeddings & chunking', 'Vector databases'] },
  5: { category: 'ai-engineering', topics: ['RAG & retrieval', 'Vector databases'] },
  6: { category: 'ai-engineering', topics: ['RAG & retrieval', 'Agentic RAG'] },
  7: { category: 'ai-engineering', topics: ['Agents & workflows'] },
  8: { category: 'ai-engineering', topics: ['Human-in-the-loop', 'AI product UX'] },
  9: { category: 'ai-engineering', topics: ['Evals & production'] },
  10: { category: 'ai-engineering', topics: ['MCP & A2A'] },
  11: { category: 'ai-engineering', topics: ['MCP & A2A'] },
  12: { category: 'ai-engineering', topics: ['Evals & production'] },
  13: { category: 'resume', topics: [] },
}
// Outside the 13 weeks the drill is AI engineering, any topic.
export const themeFor = (date: string): WeekTheme => THEMES[roadmapWeek(date)?.week ?? 0] ?? { category: 'ai-engineering', topics: [] }

// 1-based week for an IST date, or null before the start / after week 13.
export function roadmapWeek(date: string): RoadmapWeek | null {
  const days = Math.floor((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${BUILD_START}T00:00:00Z`).getTime()) / 86400000)
  if (days < 0) return null
  return ROADMAP[Math.floor(days / 7)] ?? null
}

// Build time per load level: Light 60 · Steady 120 · Intense 150 minutes.
export const buildMinutes = (hoursPerDay: number) => hoursPerDay <= 4 ? 60 : hoursPerDay <= 6 ? 120 : 150
// Learn time per load level: Light 20 · Steady 30 · Intense 40 minutes.
export const learnMinutes = (hoursPerDay: number) => hoursPerDay <= 4 ? 20 : hoursPerDay <= 6 ? 30 : 40

// Read the week's concept before building it. Ticked by FocusBar Finish.
export function learnBlock(date: string, hoursPerDay: number): PrepBlock | null {
  const w = roadmapWeek(date)
  if (!w) return null
  return {
    key: 'learn', label: `Learn · W${w.week}: ${w.title}`, minutes: learnMinutes(hoursPerDay),
    detail: w.links.length
      ? `Read the docs below before you build — note 3 things you'd say about it in an interview`
      : 'Re-read your proof links and numbers from weeks 1–12 — note the 3 strongest for your resume',
    href: '/prep?tab=ai', done: false, links: w.links,
  }
}

// Ticked by FocusBar Finish (not a question block, so no quota).
export function buildBlock(date: string, hoursPerDay: number): PrepBlock | null {
  const w = roadmapWeek(date)
  if (!w) return null
  return {
    key: 'build', label: `Build · W${w.week}: ${w.title}`, minutes: buildMinutes(hoursPerDay),
    detail: `${w.milestone}. Done when ${w.doneWhen}.`,
    href: '/prep?tab=ai', done: false,
  }
}
