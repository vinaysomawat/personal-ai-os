-- v2.1 AI-Native section of the Prep Question Bank (ROADMAP-v2 §9).
-- 76 open-ended questions for AI-native engineering interviews (prepared
-- against the Apollo JD: form your own hypotheses, pressure-test AI output,
-- catch its mistakes, verify, own final quality). Stored in the shared
-- coding_questions pool under a new 'ai-native' category so the Question
-- Bank sprint, coverage, Job Hunt quotas and flashcards work unchanged;
-- Coding's daily picks select explicit categories, so these never appear there.

-- Explicit practice order (Apollo application questions → top 10 → the
-- rest by section → scenarios). Null for every existing question.
alter table coding_questions add column if not exists sort_order int;
-- Expected areas an answer should cover, shown on request and given to the
-- AI feedback as a rubric. Null when none were provided.
alter table coding_questions add column if not exists answer_hints text;
-- AI-native questions are verbal — there's no source page to link to.
-- Every existing row keeps its url; the Coding module never selects
-- 'ai-native' rows, so it can keep treating url as always present.
alter table coding_questions alter column url drop not null;

insert into coding_questions (title, difficulty, topics, sort_order, answer_hints, category, source, url)
select v.title, v.difficulty, v.topics, v.sort_order, v.answer_hints, 'ai-native', 'Apollo JD prep', null
from (values
  ('What AI tools do you use in your daily work? How frequently?', 'medium', array['Apollo application', 'Top 10']::text[], 1, null),
  ('Can you give me an example how you automated or improved any part of your work using AI?', 'medium', array['Apollo application']::text[], 2, null),
  ('How do you use AI in your daily development workflow?', 'easy', array['AI workflow', 'Top 10']::text[], 10, null),
  ('Which AI tools do you use regularly?', 'easy', array['AI workflow']::text[], 1401, null),
  ('How frequently do you use AI during development?', 'easy', array['AI workflow']::text[], 1402, null),
  ('What parts of your development workflow do you use AI for?', 'easy', array['AI workflow']::text[], 1403, null),
  ('What tasks do you deliberately not delegate to AI? Why?', 'easy', array['AI workflow']::text[], 1404, null),
  ('How has AI changed the way you approach software development?', 'easy', array['AI workflow']::text[], 1405, null),
  ('How do you use AI when starting a completely unfamiliar task?', 'easy', array['AI workflow']::text[], 1406, null),
  ('How do you use AI when working in an unfamiliar codebase?', 'easy', array['AI workflow', 'Top 10']::text[], 17, null),
  ('How do you use AI to write code?', 'medium', array['AI + coding']::text[], 1420, null),
  ('How do you review AI-generated code?', 'medium', array['AI + coding']::text[], 1421, null),
  ('How do you know whether AI-generated code is actually correct?', 'medium', array['AI + coding', 'Top 10', 'Must be strong']::text[], 14, null),
  ('Tell me about a time AI generated incorrect code for you.', 'medium', array['AI + coding', 'Top 10', 'Must be strong']::text[], 13, null),
  ('What is the most significant mistake you''ve caught in AI-generated code?', 'medium', array['AI + coding']::text[], 1424, null),
  ('Have you ever rejected an AI-generated solution? Why?', 'medium', array['AI + coding']::text[], 1425, null),
  ('What do you do when AI gives you multiple possible implementations?', 'medium', array['AI + coding']::text[], 1426, null),
  ('How do you prevent AI-generated code from introducing technical debt?', 'medium', array['AI + coding']::text[], 1427, null),
  ('How do you ensure AI-generated code follows your existing project''s conventions?', 'medium', array['AI + coding']::text[], 1428, null),
  ('Would you merge code written entirely by AI? Under what conditions?', 'medium', array['AI + coding']::text[], 1429, null),
  ('How do you use AI when debugging a production issue?', 'medium', array['AI + debugging']::text[], 1440, null),
  ('Tell me about a bug where AI helped you find the root cause.', 'medium', array['AI + debugging']::text[], 1441, null),
  ('Tell me about a time AI suggested the wrong root cause.', 'medium', array['AI + debugging']::text[], 1442, null),
  ('How do you prevent AI from sending you down the wrong debugging path?', 'medium', array['AI + debugging']::text[], 1443, null),
  ('If AI gives you a plausible explanation for a bug, how do you verify it?', 'medium', array['AI + debugging']::text[], 1444, null),
  ('How would you use AI to investigate a performance issue?', 'medium', array['AI + debugging']::text[], 1445, null),
  ('How would you use AI to investigate a memory leak?', 'medium', array['AI + debugging']::text[], 1446, null),
  ('How would you use AI to understand a large unfamiliar frontend codebase?', 'medium', array['AI + debugging']::text[], 1447, null),
  ('How do you use AI to write tests?', 'medium', array['AI + testing']::text[], 1460, null),
  ('How do you verify AI-generated tests?', 'medium', array['AI + testing']::text[], 1461, null),
  ('Can AI-generated tests give you false confidence? How?', 'medium', array['AI + testing']::text[], 1462, null),
  ('How would you ask AI to identify missing edge cases?', 'medium', array['AI + testing']::text[], 1463, null),
  ('How do you use AI for test-case generation?', 'medium', array['AI + testing']::text[], 1464, null),
  ('Would you trust AI-generated unit tests without reviewing them? Why?', 'medium', array['AI + testing']::text[], 1465, null),
  ('How could you use AI with Playwright or E2E testing?', 'medium', array['AI + testing']::text[], 1466, null),
  ('Would you ask AI to design a frontend architecture?', 'hard', array['AI + architecture']::text[], 1480, null),
  ('How do you validate an architecture proposed by AI?', 'hard', array['AI + architecture']::text[], 1481, null),
  ('What would you do if AI proposed an architecture that technically works but doesn''t fit your existing system?', 'hard', array['AI + architecture']::text[], 1482, null),
  ('How do you use AI to compare architectural approaches?', 'hard', array['AI + architecture']::text[], 1483, null),
  ('Can AI make architectural decisions for you? Why or why not?', 'hard', array['AI + architecture']::text[], 1484, null),
  ('How would you use AI when designing a React application from scratch?', 'hard', array['AI + architecture']::text[], 1485, null),
  ('How would you use AI when designing a microfrontend architecture?', 'hard', array['AI + architecture']::text[], 1486, null),
  ('How would you ask AI to identify scalability or performance risks in a frontend architecture?', 'hard', array['AI + architecture']::text[], 1487, null),
  ('Can AI replace code review?', 'medium', array['AI + code review', 'Top 10']::text[], 18, null),
  ('How would you use AI as part of a code-review process?', 'medium', array['AI + code review']::text[], 1501, null),
  ('What kinds of bugs is AI good at finding during code review?', 'medium', array['AI + code review']::text[], 1502, null),
  ('What kinds of problems might AI miss during code review?', 'medium', array['AI + code review']::text[], 1503, null),
  ('How do you verify an AI code-review comment before acting on it?', 'medium', array['AI + code review']::text[], 1504, null),
  ('Have you used AI to review your own code before submitting a PR?', 'medium', array['AI + code review']::text[], 1505, null),
  ('Give me an example where AI significantly improved your productivity.', 'easy', array['AI + productivity', 'Top 10']::text[], 12, null),
  ('What is the best use of AI you''ve found in your development workflow?', 'easy', array['AI + productivity']::text[], 1521, null),
  ('How do you measure whether AI is actually making you more productive?', 'easy', array['AI + productivity']::text[], 1522, null),
  ('Does AI always make you faster?', 'easy', array['AI + productivity']::text[], 1523, null),
  ('Have you ever spent more time correcting AI output than writing the code yourself?', 'easy', array['AI + productivity']::text[], 1524, null),
  ('How do you avoid becoming dependent on AI?', 'easy', array['AI + productivity']::text[], 1525, null),
  ('How has AI changed your learning process?', 'easy', array['AI + productivity']::text[], 1526, null),
  ('AI gives you a confident answer that looks correct. How do you determine whether it actually is?', 'hard', array['AI judgment']::text[], 1540, null),
  ('AI suggests a solution that passes all your tests. Do you ship it?', 'hard', array['AI judgment']::text[], 1541, null),
  ('AI suggests a solution that is significantly faster than your implementation. How do you decide whether to use it?', 'hard', array['AI judgment']::text[], 1542, null),
  ('AI gives you an answer that conflicts with your understanding of the system. What do you do?', 'hard', array['AI judgment', 'Top 10', 'Must be strong']::text[], 16, null),
  ('How do you distinguish between an AI hallucination and a valid but unfamiliar approach?', 'hard', array['AI judgment']::text[], 1544, null),
  ('What does "pressure-testing AI output" mean to you?', 'hard', array['AI judgment', 'Top 10', 'Must be strong']::text[], 15, null),
  ('What does "AI-native engineer" mean to you?', 'hard', array['AI judgment', 'Top 10']::text[], 19, null),
  ('What''s the difference between an engineer who uses AI and an AI-native engineer?', 'hard', array['AI judgment']::text[], 1547, null),
  ('How do you maintain engineering judgment when AI can generate solutions instantly?', 'hard', array['AI judgment']::text[], 1548, null),
  ('What responsibilities remain with the engineer when AI writes most of the code?', 'hard', array['AI judgment']::text[], 1549, null),
  ('Scenario: You''re debugging a production issue. You give the relevant code to AI and it confidently tells you the problem is caused by a race condition. What do you do?', 'hard', array['Scenario']::text[], 3000, null),
  ('Scenario: AI generates a React component that passes all your tests but causes unnecessary re-renders in production. How would you detect and fix it?', 'hard', array['Scenario']::text[], 3001, null),
  ('Scenario: AI recommends replacing your existing state-management approach with a completely different library. Would you do it? How would you evaluate the recommendation?', 'hard', array['Scenario']::text[], 3002, null),
  ('Scenario: You ask AI to implement an autocomplete component. It works, but it makes an API request on every keystroke. How would you review the solution?', 'hard', array['Scenario']::text[], 3003, 'debounce, cancellation (AbortController), race conditions / stale responses, caching, loading states, error handling, accessibility (combobox ARIA, keyboard)'),
  ('Scenario: AI generates a large refactoring across 50 frontend files. How would you safely validate and ship it?', 'hard', array['Scenario']::text[], 3004, null),
  ('Scenario: AI tells you that a particular React optimization will improve performance. How do you prove that it actually improves performance?', 'hard', array['Scenario']::text[], 3005, null),
  ('Scenario: You''re working in a codebase you don''t understand. AI can explain every file to you. How would you use AI without blindly trusting its understanding of the system?', 'hard', array['Scenario']::text[], 3006, null),
  ('Scenario: AI gives you two technically valid implementations. One is simpler, the other more performant. How do you choose?', 'hard', array['Scenario']::text[], 3007, null),
  ('Scenario: AI-generated code introduces a subtle security vulnerability that isn''t caught by your tests. What should your development process have done differently?', 'hard', array['Scenario']::text[], 3008, null),
  ('Scenario: Your manager says "Use AI everywhere and increase your productivity." How would you decide where AI actually adds value?', 'hard', array['Scenario']::text[], 3009, null)
) as v(title, difficulty, topics, sort_order, answer_hints)
where not exists (select 1 from coding_questions c where c.category = 'ai-native' and c.title = v.title);

-- Additions beyond the Apollo reference list — gaps a senior FE loop at an
-- AI-native company commonly probes: building AI features in the frontend,
-- prompting/context, agents, security, leading adoption, LLM basics, plus
-- 6 more scenarios. Ordered after the reference sections, before/after its
-- scenarios; every row has expected areas.
insert into coding_questions (title, difficulty, topics, sort_order, answer_hints, category, source, url)
select v.title, v.difficulty, v.topics, v.sort_order, v.answer_hints, 'ai-native', 'AI-native additions', null
from (values
  ('How would you build a streaming chat UI in React?', 'hard', array['Building AI features']::text[], 2000, 'fetch + ReadableStream or SSE, incremental state updates batched per animation frame, AbortController for Stop, auto-scroll that respects user scroll-up, partial markdown rendering, error/retry mid-stream'),
  ('How do you design loading and latency UX for LLM responses that take 5–30 seconds?', 'hard', array['Building AI features']::text[], 2001, 'time-to-first-token, streaming over spinners, skeletons, progress/status steps for tool calls, cancel, optimistic user message, perceived vs actual latency'),
  ('How do you safely render AI-generated markdown and code in the browser?', 'hard', array['Building AI features']::text[], 2002, 'XSS — sanitize (DOMPurify) or a markdown renderer without raw HTML, no dangerouslySetInnerHTML on raw output, link rel/target safety, syntax highlighting cost on long outputs'),
  ('How do you design UX for non-deterministic AI output?', 'hard', array['Building AI features']::text[], 2003, 'regenerate, edit-and-resend, thumbs feedback, showing sources/citations, confidence and disclaimers, graceful failure, undo for AI actions, user stays in control'),
  ('Why should a frontend never call an LLM API directly with a key? How would you architect it instead?', 'hard', array['Building AI features']::text[], 2004, 'key exposure, backend proxy / BFF, auth + per-user rate limits, cost caps, request validation, streaming through the proxy, logging'),
  ('How do you test UI that depends on non-deterministic AI output?', 'hard', array['Building AI features']::text[], 2005, 'mock the model at the network boundary with recorded fixtures, test states (streaming, error, abort, empty), contract tests on structured output, keep E2E deterministic, separate quality evals'),
  ('What are evals, and how would you evaluate the quality of an AI feature you shipped?', 'hard', array['Building AI features']::text[], 2006, 'golden datasets, rubric / LLM-as-judge with human spot checks, regression runs on prompt or model changes, online signals (thumbs, retries, abandonment), cost and latency as metrics'),
  ('How would you consume structured output or tool calls from an LLM in the UI?', 'hard', array['Building AI features']::text[], 2007, 'JSON schema / zod validation, never trust shape, fallback on parse failure, render tool-call progress states, partial JSON while streaming'),
  ('How do you make streaming AI content accessible?', 'hard', array['Building AI features']::text[], 2008, 'aria-live polite (not per token — announce on completion or in chunks), focus management, keyboard Stop, reduced motion for typing effects, screen-reader-friendly code blocks'),
  ('How would you handle a user stopping, editing, or retrying a generation mid-stream?', 'hard', array['Building AI features']::text[], 2009, 'AbortController, cancel the server request too, discard or keep the partial output deliberately, avoid stale responses landing after a retry (request ids), branch conversation state'),
  ('How do you structure a prompt for a non-trivial coding task?', 'medium', array['Prompting & context']::text[], 2010, 'goal, constraints, relevant files and conventions, examples, explicit acceptance criteria, ask for a plan before code, state what not to change'),
  ('How do you give an AI tool the right context about your codebase?', 'medium', array['Prompting & context']::text[], 2011, 'pointing at specific files, project rules/instructions files (CLAUDE.md, .cursorrules), existing patterns to copy, keeping context small and relevant, not dumping the whole repo'),
  ('How do you break a large feature into tasks an AI can execute reliably?', 'medium', array['Prompting & context']::text[], 2012, 'small verifiable steps, plan first, one concern per step, tests or checks after each step, commit checkpoints'),
  ('When do you start a fresh AI session instead of continuing a long conversation?', 'medium', array['Prompting & context']::text[], 2013, 'context window limits and degradation, stale assumptions, after a wrong turn, summarizing state into a fresh prompt'),
  ('How do you write and maintain a project rules file for AI coding tools?', 'medium', array['Prompting & context']::text[], 2014, 'conventions, architecture, commands, do/don''t lists, keep it short and current, treat it like docs that get reviewed'),
  ('What''s the difference between AI autocomplete, chat, and agentic coding tools? When do you use each?', 'medium', array['AI agents & tooling']::text[], 2015, 'inline completion for flow, chat for explanation and design, agents for multi-file tasks with verification; cost of review grows with autonomy'),
  ('How do you supervise an AI agent that is making multi-file changes?', 'medium', array['AI agents & tooling']::text[], 2016, 'plan review before execution, small diffs, run tests/lint/build, read every diff, permission limits, stop early when it drifts'),
  ('What guardrails would you put on an AI agent that has terminal or repo access?', 'medium', array['AI agents & tooling']::text[], 2017, 'least privilege, no secrets in env, allowlisted commands, no force-push / prod access, sandbox or branch, human approval for irreversible actions'),
  ('What is MCP (Model Context Protocol), and how would you use it in a development workflow?', 'medium', array['AI agents & tooling']::text[], 2018, 'standard way to connect models to tools/data (docs, tickets, DB, browser), when it beats copy-paste, trust and permission boundaries'),
  ('How would you integrate AI into CI — PR review bots, test generation, or triage?', 'medium', array['AI agents & tooling']::text[], 2019, 'advisory not blocking, signal-to-noise tuning, humans own merge, measure false positives, cost per run'),
  ('What code or data would you never paste into an AI tool?', 'hard', array['AI security & privacy']::text[], 2020, 'secrets, credentials, customer PII, proprietary data against policy; company-approved tools and data-retention settings'),
  ('What is prompt injection, and why does it matter for AI agents and AI features?', 'hard', array['AI security & privacy']::text[], 2021, 'untrusted content (web pages, issues, emails) carrying instructions, agents with tools act on it, mitigations: least privilege, treat content as data, human confirmation, output filtering'),
  ('AI suggests an npm package you''ve never heard of. What do you check before installing it?', 'hard', array['AI security & privacy']::text[], 2022, 'hallucinated / typosquatted packages (slopsquatting), verify on npm and GitHub, downloads, maintainers, recent publish, install scripts, bundle size, license'),
  ('What licensing or IP concerns exist with AI-generated code?', 'hard', array['AI security & privacy']::text[], 2023, 'verbatim reproduction of licensed code, company policy, provenance, code-reference filters in tools'),
  ('What security issues does AI-generated frontend code commonly introduce?', 'hard', array['AI security & privacy']::text[], 2024, 'XSS via innerHTML, unsafe URL handling, secrets in client bundles, missing auth checks assumed client-side, weak input validation, outdated dependency versions'),
  ('How would you introduce AI tools to a team that is skeptical of them?', 'hard', array['Leading AI adoption']::text[], 2025, 'start with low-risk high-value tasks, share real examples and failures, opt-in pilots, measure, address quality and security concerns openly'),
  ('What team standards would you set for AI-generated code in pull requests?', 'hard', array['Leading AI adoption']::text[], 2026, 'author fully owns and understands the code, same review bar, tests required, disclose large AI-generated chunks, small PRs'),
  ('How do you mentor a junior engineer who relies too heavily on AI?', 'hard', array['Leading AI adoption']::text[], 2027, 'ask them to explain the code, solve first then compare, debugging without AI sessions, review their prompts, build fundamentals'),
  ('A teammate submits AI-generated code they can''t explain in review. How do you handle it?', 'hard', array['Leading AI adoption']::text[], 2028, 'don''t merge, pair through it, reinforce ownership norm privately, check whether the process or deadline pushed them there'),
  ('How would you measure the impact of AI tools across a frontend team?', 'hard', array['Leading AI adoption']::text[], 2029, 'cycle time, review time, defect and revert rates, developer surveys, avoid lines-of-code metrics, compare before/after on similar work'),
  ('At a high level, how do LLMs work — tokens, context window, temperature — and why does it matter for how you use them?', 'medium', array['LLM fundamentals']::text[], 2030, 'next-token prediction, context limits and lost-in-the-middle, temperature vs determinism, why exact recall and math are weak, cost per token'),
  ('Why do LLMs hallucinate, and how does that change how you use them?', 'medium', array['LLM fundamentals']::text[], 2031, 'plausible continuation not retrieval of truth, more likely on niche APIs and recent versions, ground with docs/code, verify claims'),
  ('What is RAG, and when would a product use it instead of fine-tuning?', 'medium', array['LLM fundamentals']::text[], 2032, 'retrieve relevant docs into the prompt, fresh and citable data, cheaper than fine-tuning; fine-tuning for style/format; chunking and retrieval quality matter'),
  ('Scenario: An AI agent''s PR makes a failing test pass by changing the test''s assertion instead of fixing the code. How do you catch and prevent this?', 'hard', array['Scenario']::text[], 3010, 'review test diffs as carefully as code, flag weakened assertions, require reasoning for test changes, protected test files or review rules'),
  ('Scenario: Product wants an AI chat assistant shipped inside your app in two weeks. What frontend architecture do you propose?', 'hard', array['Scenario']::text[], 3011, 'BFF proxy, streaming, conversation state model, abort/retry, safe rendering, telemetry and feedback, feature flag, eval plan, scope cuts'),
  ('Scenario: Your streaming AI response UI becomes janky on very long outputs. How do you diagnose and fix it?', 'hard', array['Scenario']::text[], 3012, 'profile with React DevTools/Performance panel, batch token updates per frame, memoize finished messages, avoid re-parsing full markdown each token, virtualize long histories'),
  ('Scenario: A junior engineer opens a 2,000-line AI-generated PR. What do you do?', 'hard', array['Scenario']::text[], 3013, 'ask to split, review the plan first, check tests and conventions, coach on scope, don''t rubber-stamp'),
  ('Scenario: On a deadline, AI''s fix works but you don''t understand why. Do you ship it?', 'hard', array['Scenario']::text[], 3014, 'understand before shipping or time-box learning, add a test that pins the behavior, document the risk, follow-up ticket, ownership'),
  ('Scenario: AI-generated code works locally but fails in production only for some users. How do you investigate?', 'hard', array['Scenario']::text[], 3015, 'environment differences (browser, locale, timezone, feature flags, data shape), logs and error tracking, reproduce with real conditions, form your own hypothesis before asking AI')
) as v(title, difficulty, topics, sort_order, answer_hints)
where not exists (select 1 from coding_questions c where c.category = 'ai-native' and c.title = v.title);
