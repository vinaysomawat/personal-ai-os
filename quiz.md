# Change: Generalized Interview Practice Platform (Quiz / JS Functions / UI Coding / System Design)

## Context

The Coding module currently supports one content format well: algorithmic/DSA questions
(`coding_questions`, 336-question pool, daily rotation, streaks, Planner sync) plus a
separate hand-authored 50-question trivia pool (`todays-quiz.ts`, "Today's Quiz" — explicitly
scoped as a low-stakes warm-up, not a tracked skill signal).

GreatFrontEnd (and sites like it) structure front-end interview prep into (at least) four
distinct formats, each with a genuinely different content shape:

- **Quiz** — long-form conceptual Q&A (question + full markdown explanation + importance +
  difficulty + topics), e.g. the box-model question you linked
- **JavaScript functions** — implement a specific JS utility/API (debounce, deep clone, event
  emitter, etc.) — starter code + test cases + reference solution
- **User interface coding** — build a UI component to spec — starter code + requirements +
  reference solution
- **System design** — long-form front-end system design write-ups — problem statement +
  structured solution (requirements, architecture, deep-dives)

None of these four are currently modeled in the app. This spec adds a generalized practice
system supporting all four, plus a daily-goal layer to actually work through them
systematically — reusing the daily-assignment/streak/Planner-sync architecture the Coding
module's algorithm-question system already has, generalized across formats rather than
rebuilt per format.

## Decision point: what happens to "Today's Quiz"

Two options — pick one before implementation starts:

- **(a) Keep both.** Today's Quiz stays exactly as-is (fast daily trivia warm-up, hand-authored
  pool, no lasting skill tracking) and the new Quiz format becomes a separate, deeper practice
  surface (real long-form questions, tracked like the algorithm pool is). This is the safer
  choice if you still want the quick warm-up habit independent of deep prep.
- **(b) Replace.** Retire `todays-quiz.ts`'s hand-authored pool and point "Today's Quiz" at the
  new crawled Quiz content instead, changing its character from "quick trivia" to "real
  interview question of the day."

Given you said the existing quiz isn't "up to my standard and scope," (b) sounds closer to
what you want — but (a) is lower-risk since Today's Quiz already has its own well-defined,
working niche (a <2-minute daily warm-up, distinct from tracked prep). Recommend (a) unless
you're confident you don't want the quick-warm-up habit anymore.

## Data model

Rather than one undifferentiated table, use one table with a `format` discriminator column
plus a `content` jsonb payload whose shape depends on format — this keeps a single daily-
assignment/streak/sync pipeline (see below) working across all four formats instead of
duplicating that machinery four times, while still letting each format's content differ
structurally.

```
practice_questions (global pool, no user_id — same pattern as coding_questions)
  - id
  - format: 'quiz' | 'javascript-functions' | 'ui-coding' | 'system-design'
  - title
  - slug (matches the source URL slug, for re-crawling/dedup)
  - difficulty: easy | medium | hard
  - importance: low | medium | high        -- GreatFrontEnd-specific field, keep if present
  - topics: text[]                          -- reuse/extend the existing CODING_TOPICS-style taxonomy
  - source_url
  - content (jsonb) -- shape depends on format:
      quiz:               { questionMarkdown, solutionMarkdown }
      javascript-functions:{ problemMarkdown, starterCode, testCases, solutionMarkdown }
      ui-coding:          { problemMarkdown, starterCode, solutionMarkdown }
      system-design:      { problemMarkdown, solutionMarkdown, sections: string[] }
  - crawled_at
  - last_verified_at    -- last time you confirmed the content still renders/matches source

practice_daily_assignments (per-user, mirrors coding_daily_questions' shape)
  - question_id (FK practice_questions)
  - format                                   -- denormalized for fast per-format stats queries
  - assigned_date
  - completed, completed_at
  - outcome: solved | solved_with_help | struggled   -- reuse Coding's existing self-report pattern
  - task_id (FK tasks)                       -- two-way Planner sync, same as coding_daily_questions
```

`coding_questions` (existing algorithm pool) stays untouched — this is additive, not a
migration of existing data.

## Crawler

- **You have a paid GreatFrontEnd subscription**, so full-access content (including anything
  behind the "Get full access" gate) is legitimately available to your account — the crawler
  should authenticate as your logged-in session (e.g. reusing your session cookie) rather than
  scraping anonymously, so it sees the same content you'd see browsing manually. Still worth
  checking GreatFrontEnd's terms of service for anything specific about automated access even
  with a paid account, since "I can view it logged in" and "ToS permits scripted access to it"
  aren't automatically the same thing — a quick read of their ToS before building this is cheap
  insurance. Keep it to personal, rate-limited, low-frequency use either way (a one-person tool
  pulling content for your own study, not a redistribution system).
- **One-time backfill + incremental re-crawl**, not a live scrape on every page load — same
  shape as the existing 336-question algorithm pool, which was populated once via a one-time
  script, not fetched live. `crawled_at`/`last_verified_at` let you re-run the crawler
  periodically to pick up new questions without re-processing ones you already have
  (dedupe on `slug`).
- **Respect rate limits** — sequential requests with a real delay between them, a real
  user-agent string, and back off entirely on any 429/403 rather than retrying aggressively.
- Store `source_url` on every row and don't strip attribution — if you ever want to view a
  question's original context (comments, related questions, updates), the link should still
  work.
- This crawler is a one-off script (`scripts/crawl-practice-questions.mjs` or similar), not
  part of the deployed app — same category as the existing one-time AI title-inference script
  used to backfill `coding_questions.topics`, which the README notes explicitly isn't part of
  the app itself.

## Daily goal engine (generalized)

Reuse the exact architecture `daily-core.ts` already established for algorithm questions,
generalized across the four new formats:

- **Per-format daily/weekly targets** — e.g. "1 quiz + 1 JS function every weekday, 1 UI
  coding question twice a week, 1 system design question weekly" — a per-format cadence
  setting (extend `coding_settings`-style config, or a new `practice_settings` table scoped
  per format) rather than a single blended daily count, since these formats have very
  different time costs (a quiz takes 5 minutes, a system design write-up takes an hour).
- **Assignment logic** mirrors `daily-core.ts`'s rotation: pick the next unassigned question
  per format respecting difficulty/topic variety, insert a linked Planner task (`area:
  "Practice"` or reuse `"Coding"`), same two-way sync pattern (`task_id`) as every other
  synced module.
- **Streaks** — either one combined practice streak across all formats, or per-format streaks
  (recommend combined, to avoid fragmenting the existing single Coding streak concept into
  four separate numbers that are harder to stay motivated by) — decide before implementation.
- **Dashboard/Life Score integration** — extend the existing Coding score component
  (`min(100, codingQuestionsSolvedLast30Days × 4)`) to count completions across all formats,
  not just algorithm questions, OR keep the Life Score's Coding sub-score algorithm-only and
  add a separate "Practice" signal into Today's Focus/Needs Attention instead — the first
  option is less invasive (no new sub-score, no Life Score formula change) and is recommended
  unless you specifically want the four formats weighted differently in your daily score.

## AI's role (stays minimal, per Product Principle 2)

Content itself is externally sourced (crawled), never AI-generated or AI-invented — same
anti-hallucination stance the app already applies everywhere (Learning's "no url field" on
AI-suggested resources, Coding's "never invents a question" constraint on recommendations).
AI's only reasonable role here:

- **Optional hint/explain-further requests** — a free-form "explain this differently" or
  "give me a hint" button on a question, reusing the existing Code Mentor advisor pattern
  (`askAI`, uncached since each request differs) — grounded in the question's own content,
  not inventing new problems.
- **Weak-area detection across formats** — extend `computeWeakAreas()`'s existing topic-based
  logic (already used for algorithm questions) to also run over `practice_daily_assignments`,
  so a `struggled` outcome on a "closures" JS-function question and a `struggled` outcome on a
  "closures" quiz question both count toward the same "closures" weak area — deterministic,
  no new AI call, just broadening an existing computation's input.

No new AI Gateway task is strictly required for the core feature — question content, daily
assignment, and streaks are all deterministic, matching how the algorithm-question system
already works.

## UI

- Coding page gains a format picker (tabs or pills: Algorithms / Quiz / JS Functions / UI
  Coding / System Design) — Algorithms tab is today's existing page content unchanged; the
  other four reuse the same card shell (today's assigned question, streak/stats row,
  Practice Log-style filterable history) with format-appropriate content rendering:
  - Quiz: render `questionMarkdown` + a "reveal solution" toggle showing `solutionMarkdown`
  - JS Functions / UI Coding: `starterCode` in a read-only code block (this app has no code
    editor/execution environment — you'd self-assess against `solutionMarkdown` after
    attempting it in your own IDE, same self-reported `outcome` pattern as algorithm
    questions, not an in-app judge)
  - System Design: render `problemMarkdown`, then `solutionMarkdown` behind a reveal toggle,
    with `sections` as a table of contents if the write-up is long
- Settings gets per-format cadence controls if you go with the per-format targets design above.

## Implementation phases

1. **Crawler + backfill**: schema, one-time crawl script, populate `practice_questions` for
   all four formats respecting the scope/rate-limit constraints above. Validate a handful of
   entries by hand against the live site before trusting the full backfill.
2. **Quiz format end-to-end**: daily assignment, Planner sync, streak, UI — prove the whole
   pipeline on the simplest format (Quiz has the simplest content shape) before building the
   other three.
3. **JS Functions + UI Coding**: same pipeline, code-block rendering added.
4. **System Design**: same pipeline, longer-form rendering.
5. **Weak-area unification** across formats.
6. **Today's Quiz decision** (see "Decision point" above) — implement whichever option you
   picked, once the new Quiz format has been live long enough to judge whether it actually
   replaces the old habit well.

## Acceptance criteria

- [ ] Crawler authenticates using your own paid-tier session and stays within what your
      account can legitimately view, respects `robots.txt`, and rate-limits requests
- [ ] `practice_questions` dedupes on `slug` — re-running the crawler doesn't create duplicate
      rows
- [ ] Existing `coding_questions`/algorithm daily-habit system is completely unaffected by
      this change
- [ ] Each new format's daily assignment creates a linked Planner task and syncs two-way, same
      as the existing algorithm-question system
- [ ] `computeWeakAreas()` (or its generalized equivalent) correctly aggregates struggled
      topics across formats, not just within one
- [ ] No new AI Gateway task added for core functionality — question content, assignment, and
      streaks stay fully deterministic
- [ ] A handful of crawled entries per format are spot-checked by hand against the live site
      before the backfill is trusted