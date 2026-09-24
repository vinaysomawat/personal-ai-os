# Personal OS v2 — Roadmap

**Goal of v2:** turn Personal OS from a set of trackers into the system that gets you a **Tech Lead (UI) / Senior Frontend** offer and builds the habits of a good UI tech lead — while the app itself becomes a portfolio-grade example of senior UI engineering you can talk about in interviews.

Status (2026-09-24): **v2.0 built** — expanded quiz topics, Learning missing links, Flashcards (§3.4), Story Bank (§3.2), Today's Prep (§2.1), Interview Readiness matrix (§2.2), in the new Prep module (README §14). v2.1+ not started. Sizes: **S** ≤ half a day · **M** 1–2 days · **L** 3–5 days.

---

## 1. What the usage data says (why v2 looks like this)

| Signal | Data (as of 2026-09-24) | Implication |
|---|---|---|
| Practice is fragmented | 4–5 coding picks + 1 daily read + workout + metrics + expenses = ~9 separate daily items | One focused **daily prep session** beats nine scattered checkboxes |
| Practice collapsed in September | Coding 15/92 picks; daily reads 1/20; quiz attempts: 2 total in Career, 9 in Learning (all Aug) | Load, not motivation, is the problem — v2 must be *less* per day, better sequenced |
| Interview prep is thin | 1 application (rejected), 2 topic quizzes ever, no behavioral/system-design practice anywhere | Biggest gaps for a lead role: **system design, behavioral/leadership stories, mock rounds** |
| Quiz topic list misses senior staples | 10 topics; no Accessibility, Testing, Security, Design Systems, State Mgmt, Web Vitals | Expand the topic map to the actual senior-FE interview surface |
| AI advisors barely used | 11 opens total across 6 advisors | Don't add more chat panels; put AI where it *reviews your work* (design write-ups, stories, mock answers) |
| Telegram is the logging layer | 73% of expenses, all food logs, most metrics | Keep; extend to prep (e.g. "rehearse story", "log decision") |
| The app has no engineering-quality story | 0 tests, no a11y tooling, no component docs, no ⌘K | The app itself can be your strongest interview artifact |

---

## 2. Headline: a new **Prep** module (the center of v2)

Replaces scattered practice with one place that answers *"what do I practice today, and am I getting interview-ready?"*

### 2.1 Today's Prep — one sequenced session (P0 · L)
A single 45–60 min plan, deterministic (no AI), built from existing pools:

| Block | Time | Source |
|---|---|---|
| Warm-up flashcards | 5 min | Flashcards (§3.4) due today |
| Main practice | 25–30 min | Day's focus (below): 1 coding / UI-coding question, or a system-design drill, or a mock round |
| Concept | 10 min | Today's daily read *or* a 10-question topic quiz on the week's weakest topic |
| Lead rep | 5 min | Rehearse one STAR story, or log one Lead Journal entry |

**Weekly focus rotation:** Mon JS/TS depth · Tue React/Next internals · Wed Frontend system design · Thu UI coding (build a component) · Fri Behavioral + leadership · Sat Mock interview · Sun review + flashcards only.

- Replaces the 4 separate coding picks + daily read as the primary daily ask (they still exist as pools/back-catalog).
- Dashboard's Daily Mission gets one "Today's Prep" item; Telegram sends one morning message with the session.
- Streak = days a session was completed (consistency, matches the new Coding score).

### 2.2 Interview Readiness matrix (P0 · M)
One page-level scorecard across the senior-FE interview surface, each cell fed by real data (deterministic):

`JS depth · TypeScript · React/Next · CSS & layout · Accessibility · Performance/Web Vitals · Testing · Browser & networking · Frontend system design · UI coding · Behavioral · Leadership`

- Inputs: topic-quiz readiness, coding weak areas by topic, system-design drill scores, story-bank coverage, mock-round scores.
- Shows the 3 weakest cells as "next focus" and drives the weekly rotation's content picks.
- Replaces Career's static score components on the Dashboard with this readiness (Career score = readiness + pipeline).

### 2.3 Target-company prep kit (P1 · M)
Reuses the existing JD analysis (priority topics, missing skills, company focus): for an active application, generate a checklist — which readiness cells to raise, which stories to prepare, 3 system-design prompts typical for that company. Checklist items are deterministic from the JD analysis; only the "typical prompts" line uses AI (cached 7 days, like Interview Guidance).

---

## 3. New mini-modules

### 3.1 System Design Drills (P0 · L) — biggest gap for lead roles
- Prompt library of ~30 frontend system-design problems (news feed, autocomplete, chat, Google Docs-style editor, image carousel, data table with virtualization, e-commerce PDP, design system, micro-frontend shell, offline-first app…), seeded like `workout_library`.
- Structured editor using the **RADIO** framework: Requirements · Architecture · Data model · Interface (API) · Optimizations (perf, a11y, i18n, security). 45-min timer.
- Self-score rubric per section (deterministic), then **AI review** of the write-up against a rubric (gaps, trade-offs missed, what a lead interviewer would push on). This is exactly the kind of AI use the product principles allow (reviewing), uncached.
- Revisit scheduling: re-drill the weakest prompt after 14 days.
- Schema: `design_prompts` (seeded, global), `design_drills` (user, prompt_id, sections jsonb, self_scores jsonb, ai_review, duration, created_at).

### 3.2 Story Bank — behavioral & leadership (P0 · M)
- STAR entries (Situation, Task, Action, Result + metrics), tagged by competency: ownership, conflict, mentoring, influencing without authority, ambiguity, technical decision/trade-off, failure & learning, delivery under pressure, cross-team collaboration, raising the bar (quality/process).
- **Coverage grid** (deterministic): which competencies have ≥1 strong story, which are empty → feeds the readiness matrix.
- **Rehearse mode:** random "Tell me about a time…" prompt for an uncovered/weak competency; type or dictate an answer; **AI critique** (structure, specificity, "I vs we", missing result/metric, leadership signal). Uncached.
- Schema: `stories` (title, competencies text[], situation, task, action, result, metrics, strength 1–5, last_rehearsed_at).

### 3.3 Lead Journal — become the tech lead, not just interview as one (P1 · M)
Short entries logged from the web or Telegram ("decided to use RSC for the dashboard because…"):
- Types: **Decision (ADR-lite: context → options → decision → consequences)** · Mentoring/1:1 · Code review insight · Incident/postmortem · Win/impact.
- Weekly digest: "this week you made 3 decisions, mentored twice" (deterministic).
- **Promote to story:** one click turns an entry into a Story Bank draft — your real work becomes interview material automatically.
- Fulfils the long-standing "second brain of notes/decisions" goal in CLAUDE.md; entries become Ask Brain context.
- Schema: `lead_journal` (type, title, body, tags text[], promoted_story_id, created_at). Telegram: new `log_decision` / `log_mentoring` intents on the Planner bot (no new bot).

### 3.4 Flashcards with spaced repetition (P0 · M)
- Cards created automatically from every **wrong quiz answer** (Career topic quiz + Learning resource quiz — question, correct option, explanation already stored) plus manual cards.
- SM-2-style scheduling (deterministic): due queue feeds Today's Prep warm-up; 5–10 cards/day cap.
- Replaces the fixed 14-day "needs revision" nudges with real spaced repetition.
- Schema: `flashcards` (front, back, topic, source, ease, interval_days, due_date, reps).

### 3.5 Mock Interview mode (P1 · L)
Timed rounds that mirror a real loop, scored and saved:
- **Rapid-fire concepts** (15 min, from the quiz generator), **UI coding** (45 min: link-out + timer + self-report + paste solution for AI review), **System design** (a drill under interview conditions), **Behavioral** (3 random competencies from Story Bank).
- Round scores feed the readiness matrix; Saturday of the weekly rotation.
- AI only where it reviews (UI-coding solution review, behavioral critique).

### 3.6 Showcase / Portfolio (P2 · S)
Log of visible artifacts a lead candidate is asked about: blog posts, talks, OSS PRs, side projects, internal tech talks. Monthly target (e.g. 1 artifact). Links out; feeds the Career Mentor context and resume bullets.

---

## 4. Improvements to existing modules

### Career (P0–P1)
- **Expand `QUIZ_TOPICS`** to the senior surface: + Accessibility, Testing, Web Security, CSS Architecture, State Management, Design Systems, Web Vitals, Build Tooling, Micro-frontends (S).
- Interview Prep tab becomes the Readiness matrix + quiz grid; applications get a **pipeline funnel** (applied → screen → onsite → offer rates) (S).
- Job Alerts: filter by *lead/senior/staff* titles and show match % vs readiness, not just keyword fit (S).
- Remove the unused read-only Skills context or replace it with readiness cells (S).

### Coding (P1)
- Feed the main-practice block of Today's Prep instead of 4 independent daily picks (the 4 pools stay browsable in Practice Log).
- **Topic coverage map** vs. the interview surface (which topics you've never practiced) (S).
- Per-question **timer + "explain your approach" note** (notes column exists), saved with the outcome — builds the habit of narrating trade-offs, which lead interviews grade (S).
- Difficulty ladder per topic (easy → medium → hard progression instead of random within rotation) (M).

### Learning (P1)
- **Fill missing links** (your backlog): 9 resources have no URL (e.g. *Effective TypeScript*, Harry Roberts' web-perf guide, Emma Bostian's design-system course). Add verified links; make URL required when the source is a known book/course (S).
- **Tracks instead of a flat list:** "Tech Lead UI" syllabus (architecture, design systems, perf, a11y, testing strategy, leading teams) with ordered resources and % complete (M).
- **Key takeaways** field per completed resource (3 bullets) → auto-creates flashcards (S).
- Daily read becomes the Concept block of Today's Prep.

### Planner (P1)
- **Weekly review** (Sunday): planned vs done, prep sessions, top 3 for next week — deterministic summary + optional AI reflection (existing Brain weekly reflection, cached) (M).
- Keep auto-tasks minimal: Today's Prep is one task, not 4–5.

### Dashboard (P1)
- Hero row: **Life Score + Interview Readiness** side by side; Today's Prep card replaces the long Daily Mission checklist's coding/reading lines.
- Module Scores gains a "Prep" ring (session consistency).

### Health & Finance (P2 — maintain, don't expand)
- Health: sleep/recovery isn't tracked; interview-week mode (lighter workouts, protein reminders) is a cheap cross-module tie-in (S).
- Finance: move the "Suggest budgets" to a monthly Telegram nudge on the 1st (S).

### Remove / simplify (P1)
- Retire low-value surfaces: Code Mentor / Study Coach / Health Coach generic recommendations widgets (≤1 open each) — keep Ask Brain + the AI reviews above.
- Astrology: keep as-is, no further investment.

---

## 5. UI v2 — better UI *and* interview-grade engineering

Each item is both a visible improvement and a concrete story for "tell me how you raised the quality bar":

| # | Item | Why it matters in a lead interview | Size |
|---|---|---|---|
| U1 | **Design-system page** (`/design-system`): tokens (color/spacing/type/radius, light+dark), all shared components with states | "How would you build a design system?" — show one | M |
| U2 | **Command palette (⌘K)** + keyboard shortcuts (`g d` dashboard, `n` new task, `?` help) | Accessibility, focus management, power-user UX | M |
| U3 | **Accessibility pass**: axe in CI, visible focus rings, landmark roles, `prefers-reduced-motion`, color-contrast check on both themes, keyboard-only walkthrough of every page | Senior UI loops always probe a11y | M |
| U4 | **Testing**: Vitest for pure logic (`calculations.ts`, `daily-core.ts`, scoring, SRS) + Playwright smoke on every page at 1440px and 393px | "What's your testing strategy?" — show the pyramid | M |
| U5 | **Performance budget**: Lighthouse CI + bundle analyzer, route-level budgets, measure INP/LCP on Dashboard | Web Vitals questions, with your own numbers | S |
| U6 | **Consistent page shell**: shared PageHeader (title, status chips, primary action), shared empty/loading/error states, unified card density | Visual polish; removes per-page drift | M |
| U7 | **Motion & feedback**: subtle transitions on tab/card changes, toast for optimistic actions with Undo, skeletons everywhere | Perceived performance | S |
| U8 | **Mobile-first prep**: Today's Prep usable one-handed at 393px; PWA install + offline read of today's session | Offline/PWA is a classic system-design follow-up | M |
| U9 | **ADRs for the above** in the Lead Journal | Turns the work into interview stories | S |

Design process: new screens (Prep, Drills, Story Bank, Lead Journal, Flashcards) get designed in the Claude Design project first, then synced — per CLAUDE.md, the design file stays the UI source of truth.

---

## 6. Proposed phasing

| Phase | Scope | Outcome |
|---|---|---|
| **v2.0 — Prep core** (~2 weeks) | Prep module shell + Today's Prep (2.1) · Readiness matrix (2.2) · Flashcards (3.4) · Story Bank (3.2) · expanded quiz topics · Learning missing links | One daily session; behavioral prep exists; readiness visible |
| **v2.1 — Lead depth** (~2 weeks) | System Design Drills (3.1) · Lead Journal (3.3) · Mock Interview (3.5) · company prep kit (2.3) · Coding/Learning feed into Prep | Full interview loop covered |
| **v2.2 — UI quality** (~1–2 weeks, can interleave) | U1–U9 | App becomes a portfolio artifact |
| **v2.3 — polish** | Weekly review, Showcase, dashboard hero, retire unused widgets, Health/Finance small items | Tighter, calmer app |

---

## 7. Product-principle check (CLAUDE.md)
- **AI only where it reviews/coaches:** design-drill review, story critique, mock-answer review, company prompts (cached). Scheduling, readiness, SRS, coverage, rotation — all deterministic.
- **Reduces decisions:** one daily session instead of ~9 checkboxes; readiness names the next 3 focus areas.
- **Reuses modules:** quiz generator, coding pools, JD analysis, daily reads, Brain, Telegram bots.
- **Serves the long-term goal directly:** Staff/Lead Frontend + second brain of decisions.

## 8. Decisions needed
1. Confirm **Prep** as a new top-nav module (and whether Coding moves under it or stays separate).
2. Which v2.0 items to start with (recommended order: quiz topics + missing links → Flashcards → Story Bank → Today's Prep → Readiness matrix).
3. Design-first in Claude Design for new screens, or build a first version from the existing design language and sync the design after?
4. Target interview window (e.g. "ready by Dec 2026") — lets Today's Prep ramp intensity and the readiness matrix show a countdown.
