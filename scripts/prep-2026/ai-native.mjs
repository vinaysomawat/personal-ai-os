// AI-native (category 'ai-native') — no new rows. The rows came from the
// 20261003b migration; 75 of them had no key points, so the Question Bank showed
// no "Show expected areas" button for them. This patch fills those key points
// by title (what a strong answer covers, never facts about the user's work).

const HINTS = {
  'What AI tools do you use in your daily work? How frequently?':
    'name the real tools (Claude Code, Copilot, ChatGPT) and what each is for, how often (daily, per task), one concrete recent example, where you deliberately do not use them, how you check the output',
  'Can you give me an example how you automated or improved any part of your work using AI?':
    'a specific task and the before state, what you built or changed (prompt, script, agent, CI step), how you verified it, a measurable result (time saved, fewer bugs), what you would improve next',
  'How do you use AI in your daily development workflow?':
    'where it fits by phase (understand, plan, code, test, review, debug), you lead and AI drafts, context you give it (files, rules file), verification after each step, what you keep for yourself',
  'Give me an example where AI significantly improved your productivity.':
    'a concrete task and the size of the win (hours to minutes), why AI fit that task, how you checked correctness, the cost (review time, fixes), what made it repeatable',
  'Tell me about a time AI generated incorrect code for you.':
    'what it generated and the subtle bug, how you caught it (test, reading, profiling, reproducing), why it was wrong (missing context, outdated API), the fix, what you changed in your process',
  'How do you know whether AI-generated code is actually correct?':
    'read and understand every line, run tests and add the missing ones, check edge cases and error paths, compare with the docs for the version you use, reproduce the behaviour, review it like a colleague\'s PR',
  'What does "pressure-testing AI output" mean to you?':
    'form your own hypothesis first, ask it to argue against itself or list failure modes, probe edge cases, verify claims against code, docs and tests, try to break it before trusting it',
  'AI gives you an answer that conflicts with your understanding of the system. What do you do?':
    'do not pick a side on confidence, find the evidence (read the code, logs, docs, run a quick experiment), check what context AI lacked, update your mental model or correct the AI, record the finding',
  'How do you use AI when working in an unfamiliar codebase?':
    'ask for a map of modules and data flow, then verify by reading the entry points, trace one real request end to end, ask it to explain specific files, never trust claims you have not checked, keep notes',
  'Can AI replace code review?':
    'no — it is a first pass for typos, obvious bugs and missing tests, humans own intent, architecture, product fit and knowledge sharing, AI misses context, use it to make human review faster',
  'What does "AI-native engineer" mean to you?':
    'AI is part of every step but judgment stays with you, you give it good context and verify everything, you know when not to use it, you own the final quality, you measure whether it actually helps',
  'Which AI tools do you use regularly?':
    'the tools by job (agentic coding, inline completion, chat for design, AI in review or CI), why each one, how you choose between them, settings for privacy and data retention',
  'How frequently do you use AI during development?':
    'an honest frequency (daily, most tasks), which tasks get it and which do not, how the share has changed, the line where you stop and do it by hand',
  'What parts of your development workflow do you use AI for?':
    'research and explaining code, scaffolding and boilerplate, tests and edge cases, refactoring, debugging hypotheses, docs and PR descriptions, with verification attached to each',
  'What tasks do you deliberately not delegate to AI? Why?':
    'architecture decisions and trade-offs, security-sensitive code, final review and merge, anything you cannot verify, work with secrets or customer data, learning a new fundamental',
  'How has AI changed the way you approach software development?':
    'more time on problem framing and review, less on typing, smaller steps with checks, writing specs and rules files, faster prototyping, a higher bar for verification',
  'How do you use AI when starting a completely unfamiliar task?':
    'use it to learn the landscape and vocabulary, ask for options with trade-offs, check against official docs, build a small spike to confirm, then plan the real work yourself',
  'How do you use AI to write code?':
    'give context (files, conventions, constraints), ask for a plan first, small steps, run tests and lint each step, read every diff, refactor what does not fit, commit checkpoints',
  'How do you review AI-generated code?':
    'same bar as a human PR, understand every line, check edge cases, errors, security and performance, conventions of the codebase, tests that actually assert behaviour, no unused or invented APIs',
  "What is the most significant mistake you've caught in AI-generated code?":
    'the specific bug and its impact had it shipped, why it looked plausible, how you caught it, the fix, the process change that would catch it earlier next time',
  'Have you ever rejected an AI-generated solution? Why?':
    'a concrete case, the reason (wrong for the system, too complex, insecure, unmaintainable, did not fit conventions), what you did instead, how you explained the decision',
  'What do you do when AI gives you multiple possible implementations?':
    'compare against your constraints (readability, performance, fit with existing code, testability), ask for trade-offs, prototype the top two if unclear, pick the simplest that meets the need, you make the call',
  'How do you prevent AI-generated code from introducing technical debt?':
    'project rules file, ask it to follow existing patterns, small diffs, refactor before merging, reject duplicated or over-engineered code, tests, the same review bar as human code',
  "How do you ensure AI-generated code follows your existing project's conventions?":
    'a rules file (CLAUDE.md, .cursorrules), point it at an existing example to copy, lint and format in CI, review for naming and structure, update the rules when you see drift',
  'Would you merge code written entirely by AI? Under what conditions?':
    'yes if you fully understand and own it, it passes tests you trust and review, it fits conventions, the risk is proportionate, nothing security-critical without extra scrutiny',
  'How do you use AI when debugging a production issue?':
    'gather evidence first (logs, traces, repro steps), form your own hypotheses, use AI to widen the hypothesis list and explain unfamiliar code, verify each one with data, never ship a fix you cannot explain',
  'Tell me about a bug where AI helped you find the root cause.':
    'the symptom and context, what you gave the AI, the hypothesis it suggested, how you confirmed it with evidence, the fix and the regression test',
  'Tell me about a time AI suggested the wrong root cause.':
    'what it claimed and why it sounded right, the evidence that disproved it, the real cause, the time cost, what you now do to avoid chasing wrong leads',
  'How do you prevent AI from sending you down the wrong debugging path?':
    'start from a reproduction, test each hypothesis with a quick experiment, give it the actual logs and code not a summary, time-box each lead, keep your own list of hypotheses',
  'If AI gives you a plausible explanation for a bug, how do you verify it?':
    'reproduce the bug, predict what the explanation implies and check it, add logging or a failing test, confirm the fix makes the test pass, check that nothing else explains it',
  'How would you use AI to investigate a performance issue?':
    'measure first (Performance panel, React Profiler, Web Vitals), give the AI the real profile data, ask for hypotheses, test each change with before/after numbers, keep only changes that move the metric',
  'How would you use AI to investigate a memory leak?':
    'reproduce and take heap snapshots, compare them to find retained objects, ask AI to explain retainer paths and common leak causes (listeners, timers, closures, subscriptions), verify the fix with a new snapshot',
  'How would you use AI to understand a large unfamiliar frontend codebase?':
    'ask for the architecture map and key flows, verify by reading entry points, routes and state, trace one feature end to end, ask targeted questions about specific files, write down what you confirmed',
  'How do you use AI to write tests?':
    'tell it the behaviour and edge cases to cover, ask for test cases before code, check that assertions test behaviour not implementation, make sure tests fail when the code is broken, keep them readable',
  'How do you verify AI-generated tests?':
    'break the code and check the test fails (mutation check), read every assertion, look for over-mocking and snapshot abuse, check edge and error cases exist, check they test behaviour',
  'Can AI-generated tests give you false confidence? How?':
    'yes — tests that mirror the implementation, weak or missing assertions, over-mocking, only the happy path, tests changed to pass; coverage numbers rise while bugs remain',
  'How would you ask AI to identify missing edge cases?':
    'give it the code and the requirement, ask it to list inputs that break it (empty, null, huge, concurrent, unicode, timezones, slow network), ask what the code assumes, turn the real ones into tests',
  'How do you use AI for test-case generation?':
    'derive cases from requirements and boundaries, ask for a table of inputs and expected outputs, review it against the spec, prune duplicates, turn the kept ones into tests',
  'Would you trust AI-generated unit tests without reviewing them? Why?':
    'no — tests are a spec of behaviour, AI can write tests that pass by mirroring bugs, check assertions and failure on broken code, the same review as production code',
  'How could you use AI with Playwright or E2E testing?':
    'generate tests from user flows, role-based locators over brittle selectors, use Playwright codegen or MCP to explore the app, keep tests deterministic (mocked network, test data), review flakiness',
  'Would you ask AI to design a frontend architecture?':
    'as a sparring partner yes, as the decision maker no; give it constraints (team, scale, existing system), ask for options with trade-offs, validate against real requirements, you decide and document',
  'How do you validate an architecture proposed by AI?':
    'check it against requirements and constraints, walk real use cases through it, look for failure modes and scale limits, prototype the risky part, get a review from people who know the system',
  "What would you do if AI proposed an architecture that technically works but doesn't fit your existing system?":
    'reject or adapt it, fit with the existing system and team skills matters more than elegance, migration cost and risk, take the good ideas incrementally, explain why',
  'How do you use AI to compare architectural approaches?':
    'list your criteria first, ask for each option\'s trade-offs against them, ask it to argue for each side, verify claims with docs and benchmarks, write the decision in an ADR',
  'Can AI make architectural decisions for you? Why or why not?':
    'no — it lacks the full context (team, history, business, constraints) and does not own the consequences, it can generate options and surface risks, the engineer decides and is accountable',
  'How would you use AI when designing a React application from scratch?':
    'start from requirements, ask for rendering, state, routing and data-fetching options with trade-offs, decide yourself, scaffold with AI, set conventions and a rules file early, verify each choice',
  'How would you use AI when designing a microfrontend architecture?':
    'first question whether microfrontends are needed, ask for composition options (Module Federation, iframes, build-time), shared dependencies and routing, team boundaries, verify with a spike',
  'How would you ask AI to identify scalability or performance risks in a frontend architecture?':
    'describe the architecture and expected scale, ask for bottlenecks (bundle size, rendering, data fetching, state updates), ask for how to measure each, verify with profiling and load tests',
  'How would you use AI as part of a code-review process?':
    'as a first pass before humans for bugs, missing tests and typos, advisory not blocking, tune for low noise, humans own intent and architecture, measure false positives',
  'What kinds of bugs is AI good at finding during code review?':
    'null and undefined handling, off-by-one errors, missing error handling, unused code, obvious security issues (XSS, secrets), inconsistent naming, missing tests',
  'What kinds of problems might AI miss during code review?':
    'business-logic mistakes, wrong requirements, architecture fit, cross-file and cross-service effects, performance at real scale, team conventions not written down, context outside the diff',
  'How do you verify an AI code-review comment before acting on it?':
    'reproduce the claimed issue or write a failing test, check it against the actual code paths, check the docs for the claimed behaviour, ignore style nits that conflict with conventions',
  'Have you used AI to review your own code before submitting a PR?':
    'yes, as a self-review pass for bugs, edge cases and missing tests, you still read the whole diff yourself, a concrete thing it caught, it makes the human review faster',
  "What is the best use of AI you've found in your development workflow?":
    'one specific use, why it works well there (bounded, verifiable), the measurable gain, how you check the output, why it beats the alternatives',
  'How do you measure whether AI is actually making you more productive?':
    'compare similar tasks before and after, cycle time and review time, defects and reverts, time spent fixing AI output, not lines of code, honest notes on where it slowed you down',
  'Does AI always make you faster?':
    'no — slower on unfamiliar or subtle problems, when context is missing, when output needs heavy fixes; faster on boilerplate, tests and exploration; knowing the difference is the skill',
  "Have you ever spent more time correcting AI output than writing the code yourself?":
    'yes, a concrete example, why it went wrong (vague prompt, missing context, wrong task for AI), when you stopped and wrote it yourself, what you now do differently',
  'How do you avoid becoming dependent on AI?':
    'solve first and compare, explain the code without AI, keep fundamentals sharp, debug some problems by hand, read docs and source, know when to switch it off',
  'How has AI changed your learning process?':
    'faster to explore a topic, ask for explanations at your level, then verify with docs and building something, quiz yourself, risk of shallow understanding and how you avoid it',
  'AI gives you a confident answer that looks correct. How do you determine whether it actually is?':
    'confidence is not evidence, check the claim against docs and code, test it, try edge cases, ask for sources and verify them, compare with your own reasoning',
  'AI suggests a solution that passes all your tests. Do you ship it?':
    'not on that alone — tests may be incomplete, read and understand it, check edge cases, performance and security, fit with conventions, add tests for what it changed',
  'AI suggests a solution that is significantly faster than your implementation. How do you decide whether to use it?':
    'measure it yourself on real data, check correctness and edge cases, readability and maintainability cost, whether the speed matters for users, understand why it is faster',
  'How do you distinguish between an AI hallucination and a valid but unfamiliar approach?':
    'check the API or technique exists in the official docs for your version, find real usage, run a small experiment, ask for sources and read them, look at the package on npm and GitHub',
  "What's the difference between an engineer who uses AI and an AI-native engineer?":
    'using AI = occasional help; AI-native = it is part of every step with a deliberate workflow, rules files, verification habits, knowing when not to use it, and full ownership of the result',
  'How do you maintain engineering judgment when AI can generate solutions instantly?':
    'think before prompting, form your own design and hypotheses, compare AI output against them, question trade-offs, keep reviewing deeply, practise fundamentals',
  'What responsibilities remain with the engineer when AI writes most of the code?':
    'problem framing and requirements, architecture and trade-offs, correctness, security and performance, review and testing, ownership in production, communicating decisions',
  'Scenario: You\'re debugging a production issue. You give the relevant code to AI and it confidently tells you the problem is caused by a race condition. What do you do?':
    'treat it as a hypothesis, check whether the evidence fits (timing, ordering, reproducibility), reproduce with throttling or forced ordering, add logging with request ids, confirm before fixing, look for other causes',
  'Scenario: AI generates a React component that passes all your tests but causes unnecessary re-renders in production. How would you detect and fix it?':
    'React Profiler and why-did-you-render, find the cause (new object or function props, context value, unstable keys, state too high), fix with memoization, stable references or moving state, measure after',
  'Scenario: AI recommends replacing your existing state-management approach with a completely different library. Would you do it? How would you evaluate the recommendation?':
    'start from the actual problem, cost of migration and team learning, run a spike on one feature, compare bundle size, performance and DX, incremental migration plan or decline',
  'Scenario: AI generates a large refactoring across 50 frontend files. How would you safely validate and ship it?':
    'split into reviewable PRs, read every diff, types, lint and tests in CI, visual regression and E2E on key flows, feature flag or staged rollout, monitoring and a rollback plan',
  'Scenario: AI tells you that a particular React optimization will improve performance. How do you prove that it actually improves performance?':
    'baseline measurement first (Profiler, Performance panel, Web Vitals), same conditions before and after, realistic data and devices, several runs, keep it only if users would notice',
  'Scenario: You\'re working in a codebase you don\'t understand. AI can explain every file to you. How would you use AI without blindly trusting its understanding of the system?':
    'use explanations as a map, verify by reading code and running it, trace real flows with logs or a debugger, check against tests and docs, ask teammates about history and intent',
  'Scenario: AI gives you two technically valid implementations. One is simpler, the other more performant. How do you choose?':
    'measure whether the performance difference matters for real users, default to the simpler one, readability and maintenance for the team, choose the faster one only with evidence, document why',
  "Scenario: AI-generated code introduces a subtle security vulnerability that isn't caught by your tests. What should your development process have done differently?":
    'security-focused review of AI code, SAST and dependency scanning in CI, threat model for risky areas, tests for security cases, a rules file with secure patterns, blameless follow-up',
  'Scenario: Your manager says "Use AI everywhere and increase your productivity." How would you decide where AI actually adds value?':
    'pick tasks that are well-defined and verifiable, run small experiments, measure time and quality, keep humans on high-risk work, share results and adjust, agree on metrics with the manager',
}

export async function patch(db) {
  const { data, error } = await db.from('coding_questions').select('id, title').eq('category', 'ai-native').in('title', Object.keys(HINTS))
  if (error) throw new Error(error.message)
  const missing = Object.keys(HINTS).filter(t => !data.some(r => r.title === t))
  if (missing.length) throw new Error(`ai-native titles not found: ${missing.join(' | ')}`)
  for (const r of data) {
    const res = await db.from('coding_questions').update({ answer_hints: HINTS[r.title] }).eq('id', r.id)
    if (res.error) throw new Error(`${r.title}: ${res.error.message}`)
  }
  return data.length
}

export default []
