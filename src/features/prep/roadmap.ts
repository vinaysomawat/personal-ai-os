import type { PrepBlock } from './types'

// The AI engineering path (Frontend → Full stack → AI engineer): 11 guided
// weeks in 4 stages, built in Job Copilot — a small project you write from
// scratch (not Personal OS), so you can explain every line in an interview.
// Each week: concepts in plain words, 5 steps with a "done when" check,
// links, and the line you'd say in an interview. Deterministic — the week is
// counted from BUILD_START; today's Learn / Build blocks follow the first
// step of the week not ticked yet (roadmap_steps).

// Day 1 of week 1 (IST date). Weeks run 7 days from here.
export const BUILD_START = '2026-10-29'

export const PROJECT = { name: 'Job Copilot', pitch: 'paste a job description → it pulls out the skills, matches them to your notes, answers questions about your prep with citations, and later an agent tracks your applications' }

export const STAGES = [
  { stage: 1, title: 'LLM apps in TypeScript' },
  { stage: 2, title: 'Retrieval (RAG)' },
  { stage: 3, title: 'Agents & MCP' },
  { stage: 4, title: 'Ship like an AI engineer' },
] as const

export interface RoadmapStep { title: string; task: string; doneWhen: string; concept: number }
export interface WeekTheme { category: 'ai-engineering' | 'backend' | 'resume'; topics: string[] }
export interface RoadmapWeek {
  week: number
  stage: 1 | 2 | 3 | 4
  title: string
  goal: string
  concepts: { term: string; plain: string }[]
  steps: RoadmapStep[]
  links: { label: string; href: string }[]
  interviewLine: string
  // The themed drill: the bank category and topics to practise this week.
  theme: WeekTheme
}

const step = (title: string, task: string, doneWhen: string, concept: number): RoadmapStep => ({ title, task, doneWhen, concept })

export const ROADMAP: RoadmapWeek[] = [
  {
    week: 1, stage: 1, title: 'Your first LLM call',
    goal: 'A Next.js page that sends text to Claude from a server route and shows the answer with its token cost',
    concepts: [
      { term: 'Token', plain: 'A chunk of text, about ¾ of a word. You pay per input and output token, and the context window is the most tokens one call can hold.' },
      { term: 'Messages API', plain: 'You send a system prompt plus a list of user / assistant messages; the model returns the next assistant message. It remembers nothing between calls — you resend the history.' },
      { term: 'System prompt', plain: 'Instructions for every turn: the role, the rules, the output format.' },
      { term: 'Temperature', plain: 'How random the output is. Low (0–0.3) for extraction and facts, higher for brainstorming.' },
      { term: 'Server-side key', plain: 'The API key lives only in a server env var. The browser calls your route; your route calls Anthropic.' },
    ],
    steps: [
      step('Set up the repo', 'npx create-next-app job-copilot (TypeScript, App Router, Tailwind), push it to GitHub, npm i @anthropic-ai/sdk, put ANTHROPIC_API_KEY in .env.local', 'the app runs locally and .env.local is git-ignored', 4),
      step('First call', 'A POST /api/ask route handler that sends the request text to claude-haiku-5-5 with max_tokens 500 and returns the answer text', 'curl -X POST localhost:3000/api/ask returns an answer', 1),
      step('A page for it', 'A textarea + Ask button calling /api/ask, with loading and error states', 'you can ask from the browser, and a wrong key shows a clear error, not a crash', 1),
      step('System prompt + temperature', 'Make it a job-description explainer: a system prompt with its role, rules and format; run the same JD at temperature 0 and 1', 'you can say in one line what changed between 0 and 1', 2),
      step('Tokens and cost', 'Read usage.input_tokens / output_tokens from the response and show them and the cost under each answer', 'every answer shows its tokens and cost', 0),
    ],
    links: [{ label: 'Claude API — get started', href: 'https://docs.claude.com/en/docs/get-started' }, { label: 'Prompt engineering overview', href: 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview' }],
    interviewLine: 'An LLM call is a stateless request: system prompt plus messages in, tokens out. I keep the key on the server, cap max_tokens and show the cost of every answer.',
    theme: { category: 'ai-engineering', topics: ['Foundations', 'LLM fundamentals'] },
  },
  {
    week: 2, stage: 1, title: 'Streaming & structured output',
    goal: 'Answers stream in token by token with Stop, and a job description comes back as validated JSON',
    concepts: [
      { term: 'Streaming', plain: 'The API sends the answer in small events as it is generated, so the first words show in under a second instead of after the whole answer.' },
      { term: 'AbortController', plain: 'The browser API that cancels a fetch — your Stop button.' },
      { term: 'Structured output', plain: 'Asking the model for JSON in a fixed shape (via a tool definition or a JSON instruction) so code can use it.' },
      { term: 'Validate, don\'t trust', plain: 'Parse the model\'s JSON with a zod schema; the shape can still be wrong even when you asked nicely.' },
    ],
    steps: [
      step('Stream from the route', 'Use client.messages.stream() in the route and return a ReadableStream of the text deltas', 'curl -N shows the text arriving bit by bit', 0),
      step('Render the stream in React', 'Read response.body with getReader() + TextDecoder and append each chunk to state', 'the answer types out live in the page', 0),
      step('Stop and retry', 'An AbortController behind a Stop button, a Retry button, and the partial answer kept after Stop', 'Stop halts the answer mid-sentence and Retry starts it again', 1),
      step('Job description → JSON', 'A /api/extract route returning { title, seniority, mustHave[], niceToHave[], years } using a tool definition, validated with zod', '3 real job descriptions parse with no zod errors', 2),
      step('Handle bad output', 'On a zod failure retry once with the error in the prompt, then show a friendly error; show the skills as chips', 'a deliberately broken response is retried or shown as an error, never a crash', 3),
    ],
    links: [{ label: 'Streaming messages', href: 'https://docs.claude.com/en/docs/build-with-claude/streaming' }, { label: 'Tool use (structured output)', href: 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview' }, { label: 'zod', href: 'https://zod.dev' }],
    interviewLine: 'I stream tokens over plain HTTP so the first words show fast, let users stop, and never trust model JSON — it goes through a zod schema with one retry.',
    theme: { category: 'ai-engineering', topics: ['LLM fundamentals', 'AI product UX'] },
  },
  {
    week: 3, stage: 1, title: 'Save it: Postgres + RLS',
    goal: 'Jobs and chats saved per user in Supabase, protected by Row Level Security, with SQL you wrote by hand',
    concepts: [
      { term: 'Tables & foreign keys', plain: 'One table per thing (jobs, chats); a foreign key links a chat to its job.' },
      { term: 'SQL basics', plain: 'select / where / join / group by — the four things you will use every day.' },
      { term: 'Row Level Security', plain: 'Postgres policies that add "only your rows" to every query, so a bug in your code still can\'t leak another user\'s data.' },
      { term: 'auth.uid()', plain: 'Supabase reads the user from the request\'s JWT; policies compare auth.uid() to user_id.' },
    ],
    steps: [
      step('Create the tables', 'A free Supabase project; tables jobs (id, user_id, company, title, jd_text, skills jsonb, created_at) and chats (id, user_id, job_id, role, content, created_at)', 'both tables exist, chats.job_id references jobs', 0),
      step('Turn on RLS + sign-in', 'Enable RLS with select / insert / update / delete policies on auth.uid() = user_id; add email magic-link sign-in', 'a second test user cannot see the first user\'s jobs', 2),
      step('Save from the app', 'Save extracted jobs and chat messages from route handlers or server actions using the signed-in user\'s client', 'after a reload your jobs and chat history are still there', 3),
      step('5 SQL queries by hand', 'In the SQL editor: jobs per week, the most common must-have skills (jsonb_array_elements), the last message per chat, jobs joined with chats, and EXPLAIN on one', 'you can explain every line of each query', 1),
      step('A Jobs page', 'A list of your jobs, newest first, with skill chips and a "skills asked most" summary from your SQL', 'the page shows your real data', 1),
    ],
    links: [{ label: 'Supabase + Next.js quickstart', href: 'https://supabase.com/docs/guides/getting-started/quickstarts/nextjs' }, { label: 'Row Level Security', href: 'https://supabase.com/docs/guides/database/postgres/row-level-security' }],
    interviewLine: 'The browser only ever sees its own rows because RLS checks auth.uid() inside Postgres; the service-role key stays on the server.',
    theme: { category: 'backend', topics: ['Row Level Security', 'Data'] },
  },
  {
    week: 4, stage: 2, title: 'Embeddings',
    goal: 'Your notes embedded in pgvector, with a ranked "related notes" list under each job',
    concepts: [
      { term: 'Embedding', plain: 'A list of numbers that captures what a text means. Texts with similar meaning get vectors close together.' },
      { term: 'Cosine similarity', plain: 'How closely two vectors point the same way, from -1 to 1. Higher = more similar meaning.' },
      { term: 'Embedding model', plain: 'A separate, cheap model that only makes vectors (e.g. Voyage AI or OpenAI text-embedding-3-small) — not the chat model.' },
      { term: 'pgvector', plain: 'A Postgres extension that stores vectors and finds the nearest ones, next to your normal data and RLS.' },
    ],
    steps: [
      step('Add your notes', 'A notes table; paste 20–30 of your own notes (stories, tech notes, resume points); pick an embedding model and get its key', '20+ notes are stored', 2),
      step('Embeddings by hand', 'A script that embeds 5 sentences and prints the cosine similarity of each pair — write the cosine function yourself', 'similar sentences score higher and you can say why', 1),
      step('pgvector', 'Enable the vector extension, add an embedding column, and embed notes and jobs when they are saved', 'every row has an embedding', 3),
      step('Similarity search', 'A match_notes SQL function (order by embedding <=> query, limit 5) called with supabase.rpc', 'searching "leadership conflict" returns your right story', 0),
      step('Related notes UI', 'Under each job, the 5 most related notes with their score, plus loading and empty states', 'it shows on a real job', 0),
    ],
    links: [{ label: 'Embeddings guide', href: 'https://docs.claude.com/en/docs/build-with-claude/embeddings' }, { label: 'Supabase vector columns', href: 'https://supabase.com/docs/guides/ai/vector-columns' }],
    interviewLine: 'Embeddings turn text into vectors so "near" means "similar in meaning"; I keep them in pgvector next to the data so filters and RLS still apply.',
    theme: { category: 'ai-engineering', topics: ['Embeddings & chunking', 'Vector databases'] },
  },
  {
    week: 5, stage: 2, title: 'RAG with citations',
    goal: 'Ask questions about your notes and get grounded, streamed answers with clickable sources — or "not in your notes"',
    concepts: [
      { term: 'RAG', plain: 'Retrieval-augmented generation: find the relevant text first, put it in the prompt, and have the model answer from it.' },
      { term: 'Chunking', plain: 'Splitting long documents into pieces (a few hundred tokens, with a little overlap) so retrieval finds the exact part.' },
      { term: 'Grounding', plain: 'Telling the model to answer only from the sources and to say "not found" otherwise — the main fix for made-up answers.' },
      { term: 'Citations', plain: 'The answer points to the source chunks it used, so the user can check it.' },
    ],
    steps: [
      step('Chunk long docs', 'Add 2–3 long documents (your resume, a system-design note), split them into chunks with overlap, each with its source and position, and embed them', 'the chunks are stored with embeddings', 1),
      step('Retrieve → prompt', 'A /api/answer route: embed the question, fetch the top 5 chunks, build a prompt with numbered sources', 'you can log the exact prompt that was sent', 0),
      step('Grounded answers', 'System prompt rules: use only the sources, cite [n], say "Not in your notes" when they don\'t cover it', 'an off-topic question gets "Not in your notes"', 2),
      step('Citation chips', 'Render each [n] as a chip; hover shows the chunk, click opens the note', 'every answer shows clickable sources', 3),
      step('Stream it', 'Reuse week 2\'s streaming: send the sources first, then the answer tokens', 'sources appear first and the answer streams after them', 0),
    ],
    links: [{ label: 'Citations', href: 'https://docs.claude.com/en/docs/build-with-claude/citations' }, { label: 'Contextual retrieval', href: 'https://www.anthropic.com/news/contextual-retrieval' }],
    interviewLine: 'RAG is retrieve, then generate: I embed the question, pull the top chunks, and the model must cite them or say it doesn\'t know.',
    theme: { category: 'ai-engineering', topics: ['RAG & retrieval', 'Embeddings & chunking'] },
  },
  {
    week: 6, stage: 2, title: 'Better retrieval + your first eval',
    goal: 'A 20-question eval that measures retrieval, and hybrid search shipped only if it wins',
    concepts: [
      { term: 'Full-text search', plain: 'Classic keyword search (Postgres tsvector). Great for exact words, names and acronyms that vectors blur.' },
      { term: 'Hybrid search', plain: 'Run keyword and vector search, then merge the two rankings — usually with reciprocal rank fusion (RRF).' },
      { term: 'Eval set', plain: 'A fixed list of real questions with the answer you expect, run every time you change something.' },
      { term: 'recall@5', plain: 'Out of your test questions, the share where the right chunk is in the top 5 results.' },
    ],
    steps: [
      step('Write the eval set', '20 real questions in a JSON file, each with the note or chunk that should be retrieved', 'the file has 20 questions with expected sources', 2),
      step('Eval script', 'A script that runs each question through your vector search and prints recall@5', 'it prints a number', 3),
      step('Full-text search', 'A tsvector column with a GIN index and a keyword search function', 'an acronym query (e.g. "RBAC") finds the exact note', 0),
      step('Hybrid with RRF', 'A SQL function that merges the keyword and vector rankings with RRF', 'your eval script can run the hybrid version', 1),
      step('Compare and decide', 'Run both, write vector vs hybrid recall@5 in the README, switch the app to the winner', 'the README shows both numbers', 3),
    ],
    links: [{ label: 'Supabase hybrid search', href: 'https://supabase.com/docs/guides/ai/hybrid-search' }],
    interviewLine: 'I don\'t guess whether retrieval is good: 20 labelled questions, recall@5 for vector vs hybrid, and I ship the winner.',
    theme: { category: 'ai-engineering', topics: ['RAG & retrieval', 'Vector databases'] },
  },
  {
    week: 7, stage: 3, title: 'Tool calling, by hand',
    goal: 'An agent loop you wrote yourself (no framework) that answers multi-step questions with your own tools',
    concepts: [
      { term: 'Tool', plain: 'A function the model can ask you to run, described by a name, a description and a JSON schema for its input.' },
      { term: 'The tool loop', plain: 'The model asks for a tool → your code runs it → you send the result back → repeat until it gives a final answer.' },
      { term: 'Workflow vs agent', plain: 'A workflow has fixed steps you coded; an agent lets the model choose the next step. Use the simplest one that works.' },
      { term: 'Guardrails', plain: 'A step limit, validated tool inputs, and errors returned to the model instead of thrown.' },
    ],
    steps: [
      step('Define 3 tools', 'search_notes(query), list_jobs(status?), get_job(id) — JSON schemas plus TypeScript functions over your tables', 'each one runs on its own from a test script', 0),
      step('Write the loop', 'Call Claude with the tools, run what it asks for, send tool_result back, loop until stop_reason is "end_turn", at most 6 steps', '"which of my jobs need Kafka?" calls list_jobs then get_job', 1),
      step('Validate + recover', 'zod-validate every tool input; return errors as tool results, not exceptions', 'a bad job id gives the model an error it recovers from', 3),
      step('Log every step', 'Save each tool call (name, input, output, ms) with the answer', 'you can read the full trace of one answer in the database', 3),
      step('RAG vs agent', 'Answer the same 5 questions with week 5\'s RAG and with the agent; note quality, latency and cost', 'the README has the comparison', 2),
    ],
    links: [{ label: 'Tool use overview', href: 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview' }, { label: 'Building effective agents', href: 'https://www.anthropic.com/engineering/building-effective-agents' }],
    interviewLine: 'An agent is a loop: the model picks a tool, my code validates and runs it, and I cap the steps and log every call.',
    theme: { category: 'ai-engineering', topics: ['Agents & workflows', 'LLM fundamentals'] },
  },
  {
    week: 8, stage: 3, title: 'Agent UX + human-in-the-loop',
    goal: 'A live timeline of the agent\'s steps, and no write happens without your Approve',
    concepts: [
      { term: 'Streaming steps', plain: 'Send events, not just text: step started, tool called, tool result, answer tokens.' },
      { term: 'Approval gate', plain: 'Actions that change data are proposed first and run only after a human approves.' },
      { term: 'Idempotency', plain: 'An approved action runs exactly once, even if Approve is clicked twice — an idempotency key.' },
      { term: 'Audit log', plain: 'A record of every action: what, who approved it, when.' },
    ],
    steps: [
      step('Stream the steps', 'Send agent events as Server-Sent Events and show each tool call with its status in a timeline', 'the timeline updates live during a multi-step answer', 0),
      step('A proposed write', 'An add_job / update_job_status tool that saves a pending action instead of running', 'the model\'s request is saved as pending', 1),
      step('Approve / Edit / Reject', 'A card in the chat; Approve runs the action once using an idempotency key', 'double-clicking Approve writes only once', 2),
      step('Reject and edit', 'A rejection reason goes back to the model; Edit changes the arguments before running', 'the agent responds sensibly to a rejection', 1),
      step('Audit view', 'A page listing every action with who approved it and when', 'every write has an audit row', 3),
    ],
    links: [{ label: 'Building effective agents', href: 'https://www.anthropic.com/engineering/building-effective-agents' }],
    interviewLine: 'The agent can propose, but only a human can approve a write — and every approved action runs once and is logged.',
    theme: { category: 'ai-engineering', topics: ['Human-in-the-loop', 'AI product UX'] },
  },
  {
    week: 9, stage: 3, title: 'MCP server',
    goal: 'Your Job Copilot tools usable from Claude Desktop through your own MCP server',
    concepts: [
      { term: 'MCP', plain: 'Model Context Protocol: a standard way to give any AI app your tools and data, so you write them once.' },
      { term: 'Server primitives', plain: 'Tools (actions), resources (data to read), prompts (reusable templates).' },
      { term: 'Transports', plain: 'stdio for a local server the app launches; Streamable HTTP for a remote one (which then needs OAuth).' },
      { term: 'Host & client', plain: 'Claude Desktop or Claude Code is the host; it connects to your server and shows your tools to the model.' },
    ],
    steps: [
      step('Run an example', 'Read the MCP intro and add an example server from the TypeScript SDK to Claude Desktop', 'Claude Desktop lists the example tool', 0),
      step('Your server', 'A job-copilot-mcp package exposing search_notes and list_jobs over stdio, reusing week 7\'s tool code', 'Claude Desktop calls search_notes', 1),
      step('Resource + prompt', 'Add a resource (a job\'s description) and a prompt ("prep me for this job")', 'both show up in Claude Desktop', 1),
      step('Test it', 'Run every tool from the MCP Inspector; keys come from env and never appear in logs', 'every tool passes in the Inspector', 2),
      step('Write it up', 'A README section: MCP vs plain function calling, and what a remote server would need (Streamable HTTP + OAuth)', 'you can explain it out loud in 2 minutes', 2),
    ],
    links: [{ label: 'MCP intro', href: 'https://modelcontextprotocol.io/docs/getting-started/intro' }, { label: 'TypeScript SDK', href: 'https://github.com/modelcontextprotocol/typescript-sdk' }, { label: 'MCP Inspector', href: 'https://modelcontextprotocol.io/docs/tools/inspector' }],
    interviewLine: 'MCP lets me write my tools once and use them from any AI app; locally it\'s stdio, remotely it\'s Streamable HTTP with OAuth.',
    theme: { category: 'ai-engineering', topics: ['MCP & A2A', 'Agents & workflows'] },
  },
  {
    week: 10, stage: 4, title: 'Python + FastAPI',
    goal: 'Extraction and retrieval moved to a FastAPI service the Next.js app calls, all running in Docker',
    concepts: [
      { term: 'Why Python', plain: 'Most AI libraries and AI-engineer job posts are Python-first; you need to be productive in it.' },
      { term: 'FastAPI', plain: 'A Python web framework where type hints define routes, validation and the /docs page.' },
      { term: 'Pydantic', plain: 'Python\'s zod: schemas that validate data at runtime.' },
      { term: 'Service split', plain: 'Next.js for the UI and BFF, a Python service for AI work — each in the language it\'s best at.' },
    ],
    steps: [
      step('Python setup', 'uv (or venv), FastAPI and uvicorn; a /health route; open /docs', '/docs shows your route', 1),
      step('Port extraction', 'A /extract route with a Pydantic model for the job JSON, using the Anthropic Python SDK', 'it returns the same JSON as your TypeScript version', 2),
      step('Port retrieval', 'A /search route calling your Supabase match function', 'its results match the TypeScript version', 3),
      step('Call it from Next.js', 'The Next.js route calls FastAPI with a shared secret header; generate TypeScript types from FastAPI\'s OpenAPI with openapi-typescript', 'the app works with FastAPI behind it', 3),
      step('Docker', 'A Dockerfile for the FastAPI service and a docker compose file for both', 'docker compose up runs the whole app', 3),
    ],
    links: [{ label: 'FastAPI tutorial', href: 'https://fastapi.tiangolo.com/tutorial/' }, { label: 'Pydantic', href: 'https://docs.pydantic.dev/latest/' }],
    interviewLine: 'The UI stays in Next.js; the AI service is FastAPI with Pydantic models, and the TypeScript types are generated from its OpenAPI spec.',
    theme: { category: 'backend', topics: ['FastAPI'] },
  },
  {
    week: 11, stage: 4, title: 'Evals, production & packaging',
    goal: 'Answer-quality evals, tracing and cost per answer, safety and fallbacks — then the demo and 3 numbers on your resume',
    concepts: [
      { term: 'LLM-as-judge', plain: 'A model grades answers against a rubric — useful only after you check it agrees with your own grades.' },
      { term: 'Tracing', plain: 'Logging each call\'s model, tokens, latency and cost so you can see what is slow or expensive.' },
      { term: 'Prompt injection', plain: 'Text inside your data that tries to give the model orders ("ignore previous instructions").' },
      { term: 'Fallbacks', plain: 'Timeouts, a retry with backoff, a smaller backup model, and a friendly error.' },
    ],
    steps: [
      step('Answer-quality eval', '15 questions you grade 1–5 yourself; a judge prompt grades the same answers; measure how often you agree', 'the script prints the agreement %', 0),
      step('Tracing + cost', 'Log model, tokens, latency and cost per call; a /stats page with p50 / p95 latency and cost per answer', '/stats shows real numbers', 1),
      step('Prompt injection', 'Plant an "ignore previous instructions" note in your data, harden the prompt, and add it to the eval', 'the injection case passes', 2),
      step('Reliability', 'Timeouts, one retry with backoff, a fallback model, friendly errors', 'cutting the network mid-call shows a clean error', 3),
      step('Package it', 'A README with an architecture diagram, a 2-minute demo video, and 3 numbers (recall@5, judge agreement, cost per answer) on your resume', 'the demo link and numbers are on your resume', 1),
    ],
    links: [{ label: 'Define success & build evals', href: 'https://docs.claude.com/en/docs/test-and-evaluate/develop-tests' }],
    interviewLine: 'I measure it: recall@5 for retrieval, judge agreement for answers, and cost and p95 latency per answer — with fallbacks when the model fails.',
    theme: { category: 'ai-engineering', topics: ['Evals & production', 'AI product UX'] },
  },
]

// The stage of each AI-engineering bank topic — the drill and the AI tab go
// stage by stage. Keep in step with STAGE in scripts/prep-2026/ai-engineering.mjs.
export const AI_TOPIC_STAGE: Record<string, number> = {
  'Foundations': 1, 'LLM fundamentals': 1, 'AI product UX': 1,
  'Embeddings & chunking': 2, 'Vector databases': 2, 'RAG & retrieval': 2,
  'Agents & workflows': 3, 'Agentic RAG': 3, 'Human-in-the-loop': 3, 'MCP & A2A': 3,
  'Evals & production': 4, 'Frameworks': 4,
}

// A finished week (roadmap_progress): the proof that it shipped.
export interface RoadmapProgress {
  week: number
  proof_url: string | null
  metric: string | null
  notes: string | null
  completed_at: string
}
// A ticked step (roadmap_steps): `step` is 0-based within its week.
export interface RoadmapStepDone { week: number; step: number; done_at: string }

// Outside the path the drill is AI engineering, any topic.
export const themeFor = (date: string): WeekTheme => roadmapWeek(date)?.theme ?? { category: 'ai-engineering', topics: [] }

// 1-based week for an IST date, or null before the start / after the last week.
export function roadmapWeek(date: string): RoadmapWeek | null {
  const days = Math.floor((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${BUILD_START}T00:00:00Z`).getTime()) / 86400000)
  if (days < 0) return null
  return ROADMAP[Math.floor(days / 7)] ?? null
}

// The week's next step: the first not ticked (null = all 5 done).
export const nextStep = (w: RoadmapWeek, done: RoadmapStepDone[]): number | null => {
  const i = w.steps.findIndex((_, k) => !done.some(d => d.week === w.week && d.step === k))
  return i < 0 ? null : i
}

// Learn and Build take their minutes from the day template (dayplan.ts) and
// follow the week's next step. Both are ticked by FocusBar Finish; the step
// itself is ticked in the AI tab.
export function learnBlock(date: string, minutes: number, done: RoadmapStepDone[]): PrepBlock | null {
  const w = roadmapWeek(date)
  if (!w) return null
  const i = nextStep(w, done)
  const c = i === null ? null : w.concepts[w.steps[i].concept]
  return {
    key: 'learn', label: `Learn · W${w.week}: ${c ? c.term : 'review the week'}`, minutes,
    detail: c
      ? `${c.term} — ${c.plain} Read the links below for it, then say it in your own words.`
      : `All steps done — re-read this week's concepts and say the interview line out loud: "${w.interviewLine}"`,
    href: '/prep?tab=ai', done: false, links: w.links,
  }
}

export function buildBlock(date: string, minutes: number, done: RoadmapStepDone[]): PrepBlock | null {
  const w = roadmapWeek(date)
  if (!w) return null
  const i = nextStep(w, done)
  if (i === null) return {
    key: 'build', label: `Build · W${w.week}: write it up`, minutes,
    detail: `All 5 steps done — write the README section for "${w.title}", push it, and mark the week shipped in the AI tab with the link and its number.`,
    href: '/prep?tab=ai', done: false,
  }
  const s = w.steps[i]
  return {
    key: 'build', label: `Build · W${w.week} step ${i + 1}/5: ${s.title}`, minutes,
    detail: `${PROJECT.name}: ${s.task}. Done when ${s.doneWhen} — then tick it in the AI tab.`,
    href: '/prep?tab=ai', done: false,
  }
}
