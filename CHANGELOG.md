# Changelog

One line per shipped change, newest first. Sourced from commit messages —
append here whenever you deploy, same cadence as the version bump.

## 2026-10-21

- **Boss Ladder removed.** The Bosses tab is gone, along with "fight" / "read" on Telegram and the bosses-left line in the 7:30am and 9:30pm messages. Ratings from past fights stay in the Question Bank and still count toward readiness. Daily questions, mocks and "drill" cover the same practice.
- **AI engineering prep track.** A new Question Bank category with 67 questions on LLMs, embeddings, vector databases (Pinecone Serverless, Qdrant, FAISS, ChromaDB, pgvector), RAG, agentic RAG, agents, human-in-the-loop, frameworks (LangChain, LlamaIndex, Hugging Face) and evals. Each question has key points for the AI review. It's a new readiness area too (gate 70), with a daily quota, a Boss Ladder fight, "drill rag" and "fight rag" on Telegram, and a link in AI-company prep. Readiness dips at first, since the new area counts as a blind spot until you've answered a few.

## 2026-10-20

- **Mood and energy check-in.** The 9:30pm message now ends by asking how you feel. Reply "mood 3 energy 4" to log it. The Dashboard shows the last 14 days under the Hunt Hero, and if your mood has been 2 or lower on 5 of the last 7 days, the morning message adds one gentle line about talking to a friend or calling Tele-MANAS (14416). No AI involved.
- **A kinder coach.** Coach lines now say what you got done first ("3/5 blocks done"), then the one next step, with no "undone" or "behind" wording. Outreach plus 2 other blocks counts as a good day. That shows as a ✓ in the evening review and turns Today's score green, even under 90%.
- **A weekly rest day.** Sunday by default; you can change it next to the level switch. That day has no plan, the streak carries over, the score shows "Rest day", there's no 1pm nudge, and the coach sends short messages instead: walk, gym, see people, plus a week-so-far summary in the evening. The weekly forecast now comes the evening before.
- **Pace runs 9am–7pm.** Ahead/behind is now measured against a 10-hour day instead of 8am–10pm. That includes the 1pm nudge and the Prep pace line.
- **No more Max level.** Load levels are Light 4h, Steady 6h and Intense 8h, and Steady is the default. A saved Max (12h) now counts as Intense.
- **Dashboard shows outreach first.** A new "Outreach this week" tile (sent / target, replies, screens) leads the Hunt Hero. The "Pace today" tile is gone; pace still shows on Prep.
- **Outreach is the first block of every day.** "Outreach × 10" (90 min): send 5 referral messages and apply to 5 roles posted in the last 48h. It ticks itself once you've logged 10 for the day, on the Interviews page or by telling the Career bot, and an undo un-ticks it. The 7:30am message starts with "Start with outreach: 0/10".
- **Daily questions are back; the Boss Ladder is its own tab.** Today has the question plan again ("× N" questions per category, sized by hours, plus the focus timer and Telegram start / pause / done). Boss fights moved to a new Bosses tab as extra practice: the fight answers still count toward Today's question blocks, and "fight" / "read" still work on Telegram. The 7:30am and 9:30pm messages add a line with bosses left and days to your deadline. Angular stays out of readiness, and its daily quota is now 0.

## 2026-10-19

- **Boss Ladder replaces the daily checklist.** Every readiness area under its gate is now a boss, hardest gap first. You beat one in a short timed fight: 5 questions (1 problem for UI coding and DSA), graded at the end, and you win with an average at the gate and no answer under 5. A lost fight leaves a Fix card of the key points you missed, and the rematch unlocks once you've read it. The day is 2–5 fights by load level (the mock is one of them), and the header shows bosses left, days to your deadline and the pace needed. Fights also run on Telegram ("fight", "fight system design", "read"). Removed: question quotas, the STAR-stories and interview-redo blocks, the focus timer (and Telegram start / pause / done), and Angular as a readiness area (its questions stay in the Question Bank). Accessibility now counts its rated answers, and Leadership counts Tech-lead answers.
- **Hours to complete in the Question Bank.** Picking a category now shows roughly how many hours its remaining questions will take, rounded up to whole hours. The Coverage card shows the same for each category and in total.

## 2026-10-15

- **Blocker chips removed from the War Mode header.** The red per-area chips under the readiness score are gone; the blocker count stays on the readiness tile.
- **Weak answers come back.** Any question you scored under 7 returns after 1, 2 or 4 days (lower score, sooner), and up to 40% of each question block's daily count goes to these redos before new questions. They're marked with an amber dot and "Redo · was N/10". Until now, 49 of the 50 answers rated 5 or lower had never been retried.
- **New Question Bank category: FE architecture & lead.** 90 questions for senior, lead and architect rounds: rendering strategy, bundling, monorepos, micro-frontends, performance at scale, CI/CD and feature flags, security, design systems, and leading teams (RFCs, ADRs, tech debt, incidents). It gets about 9% of the daily plan (Theory drops from 12% to 10%), counts toward System design readiness, and can be drilled with "drill architecture" on Telegram.
- **No tick boxes on Today's Mission.** Blocks can't be ticked by hand any more: question blocks complete when their questions are answered, the mock round when it's saved, and company prep and STAR stories from the focus timer's ✓. Each row shows a read-only done mark.
- **Outreach removed from War Mode.** The Outreach/wk field in the War header, the Outreach tile on the dashboard and the outreach and follow-up lines in the 7:30am mission are gone. Logging outreach on the Interviews page and the Career bot is unchanged.
- **JS functions and UI coding ordered by importance.** Both tabs now start with what interviews ask most — debounce, throttle, Promise.all, bind, deep clone, event emitter for JS; typeahead, todo list, tabs, modal, carousel, data table, infinite scroll for UI coding — and leave the niche multi-part sequels for last, instead of alphabetical order.

## 2026-10-14

- **Bigger daily score on the dashboard.** Today's score is now its own full-width card: the score large, blocks done, 7-day average and best day, and a 14-day bar chart with each day's score and a line at the 90 target. The other five tiles sit in one row below.
- **Question blocks tick only when the quota is met.** The focus timer's ✓, the tick box on a Today row and Telegram "done" could mark a question block complete with questions still left. Now a question block ticks itself once you've answered its "× N"; the timer shows only pause and stop for it, the tick box stays greyed out until then, and "done" on Telegram tells you how many are left.
- **Empty answer = Skip.** In the Question Bank, a question with nothing typed shows Skip instead of Next: it moves on without counting the question as done. Type even a short note (e.g. "solved, two pointers") and Next marks it complete as before.
- **Repeat questions start blank.** A Question Bank question you answered on an earlier day no longer shows your old answer in the box — answer it from memory. Going back to one you answered today still shows what you wrote.
- **Algorithms cleaned up and ordered by importance.** The Algorithms tab had 255 JS-function and UI-coding problems duplicated into it from the old Coding module; they're gone (your progress on them moved to the copies in their own tabs). The 92 real algorithm problems now run must-haves first (two-pointer, sliding window, trees, graphs, the Blind-75 core) instead of alphabetically.
- **Questions from my resume.** A new Question Bank category, From my resume, with 85 questions an interviewer would ask about the current resume: the walkthrough and why-leaving questions, each job (SS&C, Shiprocket, Biofourmis, Novopay), Personal OS and the listed skills. Each has key points for what a strong answer covers. It gets a daily War Mode block (8% share), counts toward Behavioral readiness, and "drill resume" works on Telegram.

## 2026-10-12

- **Load levels and a daily score.** The War Mode strip and the "interview-ready by" date are gone; War Mode is always on. Pick the day's load in the War header — Light 4h, Steady 6h, Intense 8h, Max 12h — and the plan resizes (each level now fills its hours exactly). The dashboard's Target tile is now **Today's score** (0–100, how much of today's plan you've done) with the last 7 days as bars. Pace is unchanged.
- **Removed the practice kits and the AI-assisted mock.** The `practice-kits/` folder, the 6 AI-assisted questions and the AI-assisted Mock round are gone. Wednesday's mock is now code review (as is Thursday's), big-tech and AI-company prep suggest a code-review mock, and the AI-assisted coding readiness area is fed by code review alone.
- **Story prompts and outreach target.** Three new Story Bank prompts: a feature you owned end to end including the API, an AI tool giving a wrong answer you caught, and shipping outside your usual stack. The default weekly outreach target is now 25 (an existing saved target is kept).
- **Company segments.** Outreach and companies now carry a segment (big tech, Indian product, startup, AI company, service, remote/global). The Pipeline funnel filters by segment and shows sent, reply % and screen % per segment, so you can see which segments convert. The Career bot fills the segment for well-known companies. Company prep picks its mock and topics by segment (e.g. big tech → AI-assisted + algorithms + system design; startup → backend + full-stack design + a deep-dive story).
- **Plan rebalanced for a broad search.** New daily shares (UI coding 18%, system design 13%, theory 12%, backend 12%, JS functions 10%, AI-native 9%, algorithms 9%, Angular 6%, behavioral 6%, code review 5%) and a new mock rotation: Mon machine coding, Tue behavioral, Wed AI-assisted, Thu code review, Fri machine coding, Sat system design, Sun frontend screen. Backend and code review count fully toward the Life Score practice score; AI-assisted rounds count 1.5×.
- **Full-stack system design.** Every system-design question now also grades the backend half (API shape, data model, caching, auth, the scaling bottleneck), and six new prompts cover AI chat with RAG, an AI agent with approvals, LLM search with fallbacks, a collaborative editor, a notification service and a SaaS admin dashboard with RBAC.
- **AI-assisted codebase round.** Six practice kits in `practice-kits/` (data table, autocomplete, streaming chat, file uploader, todo sync, live dashboard), each a small multi-file app with 3 real, reproducible planted bugs, a feature to add and something to optimize. A new 60-minute AI-assisted Mock round links a kit, shows which 20-minute stage you're in, and grades your write-up (changes, bugs and how you verified them, AI suggestions you rejected) on verification and AI judgment. It makes up half of the AI-assisted coding readiness area.
- **Code review practice.** 15 AI-generated pull requests with planted bugs (XSS, auth holes, races, stale closures, accessibility, N+1 queries) in the Question Bank and as a 2-PR Mock round. Each is graded on which issues you found, how you ranked them and how good your fixes are. A new readiness area, AI-assisted coding (gate 75), counts code review now and the AI-assisted round once it lands; code review also feeds Testing.
- **Backend & APIs.** A new Question Bank category with 45 questions for full-stack loops (API design, Node/Next.js server, auth, data, caching, AI backend), its own readiness gate (70), a daily quota, "drill backend" on Telegram, and one backend question in every Frontend screen mock (replacing the TypeScript slot).

## 2026-10-11

- **Answer button and follow-up practice.** Each theory, Angular, system-design, behavioral and AI-native question has an Answer button that shows a model answer (generated once per question, then free). Reading it before you answer marks the attempt as studied, not rated. The review's follow-up question can now be answered and reviewed in place, in the Question Bank and the Story Bank.
- **Pace instead of hours.** The day is 8am–10pm; the dashboard and Prep now show how far ahead or behind you are (e.g. "Behind 1h 16m — 5% done, 14% of day gone"), with partial credit for every question answered. Focused minutes are no longer shown or scored; the focus timer stays as a work aid. Hours/day is now "Daily load" and only sizes the plan.
- **Story Bank ratings and history.** Rehearsals now get a 1–10 rating from the same checklist scoring as the Question Bank (STAR points, your own contribution, numbers, length). Past rehearsals open to show the question, your answer and the full review, with "Retry this prompt" to improve it.
- **Honest answer ratings.** The AI no longer picks the 1–10 number (it drifted to 4–6 whatever you said). It checks off each key point as covered, partial or missing and scores correctness, depth and clarity; the rating is calculated from that, so a thorough answer can reach 9–10 and a one-liner lands at 2–3. The review shows the checklist and the breakdown. Spoken answers are graded as spoken, ignoring transcription slips. Same scoring for Telegram drills.
- **Focus without a separate screen.** Start focus now takes you straight to the work with the timer in a small floating bar (progress like 3/7, pause, finish, stop). The timer stops itself the moment the block's questions for today are done.
- **Question Bank: pick, answer, get reviewed.** Every question in a category is listed so you choose what to answer (Skip is gone). Any real answer gets an AI review before Next. The review is now a structured card: rating and verdict, ✓ correct vs ✗ missing/wrong, numbered fixes, and the follow-up question set apart.

## 2026-10-10

- **Voice mode**: a 🎙 Speak button on every answer box (Question Bank, Mock Round, Story Bank rehearsal, Interviews' answers). Record, stop, and your words appear as text (Groq Whisper, tuned for frontend terms), with how long you spoke and a filler-word count. No AI-budget cost; only the text is kept.
- One name for the mode: everything that said "Job Hunt Mode" (the Prep settings strip, the daily plan label, the Daily bot) now says **Interview War Mode**, matching the War header and the 7:30am message.
- **v4.0 — Job Hunt Focus.** The app now centers on the job hunt. **Dashboard**: in Job Hunt Mode a Hunt Hero (readiness and tier, days to target, next interview, outreach this week, focused time, runway) replaces Life Score and Quick Stats. **Interviews**: a new Pipeline tab (outreach log with follow-ups, a 5-week funnel from outreach to offers, and the current bottleneck) with a weekly outreach target (default 15). Questions you're asked in real interviews go into the Question Bank and come back as a "Redo" block until they rate 7+. A booked round within 72h puts a company-prep block first. After each round the Career bot asks for a debrief. Real pass/fail outcomes now count toward readiness. **Prep**: a new ✅ Interview-ready tier below TOP 1%. **Telegram**: reply DRILL on the Daily bot for a spoken question, rated with length and filler count. The 7:30am message adds company prep, outreach progress, follow-ups and debriefs owed. **Finance**: Runway (liquid savings ÷ average spend) replaces Net Worth. **AI budget**: answer reviews now share the interactive reserve with Telegram, so a digest can't starve them.
- v4.0 — **Removed**: the Coding page and bot (Prep's Question Bank replaces it; `/coding` redirects there — delete the Coding bot in BotFather), daily journal, morning briefing, evening check-in and reflection, health tips, What's Changed, Module Scores, Bot Activity, Today's Insight, the Brain's Decide / Reflect / Monthly tabs and pattern mining, Finance's Payment Calendar and purchase simulator, Health's weekly report and daily plan, and the Career Mentor. In Job Hunt Mode the astrology push and the weekly/monthly digests pause. 16 unused tables and 5 unused columns were dropped (rows backed up locally first). The README was rewritten to describe only the current app; history lives here and in git.

## 2026-10-09

- **v3.5 — prep realigned to the market.** New Angular section in the Question Bank (40 questions: signals, change detection, RxJS, NgRx, SSR, architecture) with its own readiness gate. New 90-minute Machine coding Mock Round, now the daily mock on Mon/Wed/Fri. Readiness discounts small samples (fewer than 5 answers), so areas can't look ready on 2–3 results. The Job Hunt plan fits the day (6h): question blocks get what's left after the mock and STAR stories, STAR stories get double time until every competency has a story, and shares lean toward machine coding, system design and Angular.

## 2026-10-08

- v3.4.1: Interviews moved to `/interviews` (`/career` and `/interview` redirect there). Prep's Job Hunt plan no longer has an Applications block — its hour goes to Question Bank practice, weighted toward the weakest areas.
- **v3.4 — Career → Interviews.** Add a company only once a phone screen is booked; track its rounds (type, date, interviewer, outcome); prep for it specifically (on-demand JD analysis with priority topics linking into Prep, AI interview guidance, mock links); and keep every question interviewers asked with your answer and how it went (Question Log across companies). Job Alerts, the Topic Quiz and the Applied stage are gone. The next interview shows in Prep's War header and the morning coach message; an interview within 48h tops Needs Attention. The Career bot handles phone screens, rounds and logged questions.
- **v3.3 — Learning removed.** The resource tracker, daily read, AI/tech tip, the Learning Telegram bot and its four AI tasks are gone. Life Score is now Health 30 / Finance 25 / Career 25 / Coding 20 (Learning's 20% redistributed); Daily Mission, digests, Explain My Score, Monthly Review and the Brain no longer mention it. Prep's normal plan uses a concept quiz instead of the daily read. Resource data is kept in the database and the export.

## 2026-10-07

- **v3.2 — Interview War Mode.** Prep's Today tab is now a War Room: one "do this now" block with a full-screen focus timer, readiness gates with a weakest-area penalty (NOT READY until every area clears its bar, plus mock average ≥8/10), a revision queue and weakest-topic scores built from stored AI answer ratings, a plan that gives the weakest areas the most time, and a weekly "if you interviewed tomorrow" forecast. The Daily Telegram bot coaches the day (7:30am mission, 1pm behind-pace nudge, 9:30pm review) and takes START / PAUSE / DONE. Target moved to Nov 18.
- **v3.1** — Prep: Mock Round gets a one-click AI review of the whole round (one call, ~$0.01): a 1–10 rating and a note for every answer, an overall score, verdict, likely outcome, what worked and the top fixes — saved with the round. New **Mock Interview Calendar** keeps every round with its answers and review. The Questions tab's AI review now rates each answer 1–10 too.
- **v3.0 — Planner removed.** The task list, its nav item, Quick Add's Task option, the Plan Coach and the Executive Summary are gone. Coding picks, daily reads and workouts no longer create Planner tasks, and tasks no longer feed Daily Mission, Needs Attention, the Brain, the briefing, the evening check-in or the evening reflection. The Planner Telegram bot is now the **Daily** bot (briefing, digests, reminders; all scheduled messages unchanged). Task data is kept in the database and the export.
- Prep: **Mock Round** replaces Flashcards — timed Frontend screen / Behavioral / System design rounds over the Question Bank, unseen questions first, with key points and an AI interviewer review on each answer afterwards. Today's Prep and Job Hunt Mode schedule a daily round.
- Prep: no more Missed / Partial / Confident grading anywhere — every question is just Skip or Next, with AI review on request. Coverage shows practiced/total.

## 2026-09-24

- UI v2.2a: Dashboard loads ~1s faster (score-history query batched, score write deferred until after the response); every page has its own layout-matched loading skeleton; one shared page header and one stat-tile style (matching the design) across all pages, with extra detail lines on Finance/Coding/Health tiles; cards no longer stretch into empty space; informational text moved to a readable-contrast color; Settings shows "Astrology Daily" instead of a raw job id.
- Astrology on Telegram: crisp bullet layout for the daily push and every bot reply (1-line gist, ≤3 favorable / ≤2 avoid bullets, 1-line mood; panchang one line per item), with tighter AI prompts (shared with the web page) for short sentences. Fixed "my characteristics" replying "[object Object]".
- **v2.0 — new Prep module** (`/prep`, `ROADMAP-v2.md`): Today's Prep (one sequenced ~50-min daily session with a weekday focus rotation), a 12-area Interview Readiness matrix for senior/lead frontend loops, Flashcards with spaced repetition (auto-created from every wrong quiz answer — 35 on first load), and a Story Bank for behavioral/leadership STAR stories with AI feedback on rehearsed answers. Prep is in the top nav and replaces Planner in the mobile bottom bar.
- Career: topic quiz expanded from 10 to 18 topics (Accessibility, Testing, Web Security, CSS Architecture, State Management, Design Systems, Micro-frontends, Build Tooling added).
- Learning: added verified links for the 9 resources that had none.
- Dashboard: Coding score now blends volume with consistency (practice days), Learning score counts completions in the last 30 days (new `resources.completed_at`), Needs Attention no longer repeats the budget, module rings colored by score, one "Coding practice" Daily Mission item.
- Learning: an unread daily read carries over instead of a new one piling up; "Daily reads this month" tile; the completion quiz is optional (nudge instead of gate).
- Coding: unfinished picks carry over (one open pick per type) with a swap button; streak and calendar count days you actually practiced.
- Cross-module: stale auto-generated Planner tasks (3+ days) are cleaned up daily; Weak Areas no longer lists topics with zero struggles; Career no longer counts rejected applications as active; budget tile reads "Over ₹X".
- Health: workout "Change" picker, activity-level check, Weight Trend card, Today's Food list, Workouts/Week tile, one shared workout streak, week-based workout calendar, no red 0 each morning.
- Finance: debt shown as outstanding principal (net worth corrected), month-end pace, budget suggestions, Family/Travel categories, loan months auto-decrement, portfolio details.

## 2026-09-23

- Fixed every Telegram bot (Health included) silently falling back to its "help" cheat-sheet whenever the AI daily budget was exhausted — a background task (the daily-read recommender's web search) could spend the whole day's ceiling in one call, indistinguishable from the bot failing to understand a message. Removed web search entirely from the AI gateway (`recommendDailyRead`/`recommendResources` were the only callers; a single call was seen pulling back 80k+ tokens, over the entire daily budget by itself), added a budget reserve on both the daily *and* monthly ceilings so background/on-demand AI tasks can never fully starve interactive Telegram traffic, and gave a budget cutoff its own distinct bot reply (worded correctly for whichever ceiling actually tripped) instead of the generic help menu. Also: the daily-read AI-fallback pick no longer surfaces a model-guessed URL as if it were a real link (it has no review step before reaching the user, unlike the Learning page's AI-suggested-resources flow), and a transient DB error while checking AI spend now fails open instead of breaking the calling page/bot.

## 2026-09-02

- Fixed the floating Quick Add button (+) permanently overlapping content at the true bottom of a page's scroll (e.g. Coding's "Recommended for You", Finance's "Just Added") — increased the shared page wrapper's bottom padding to clear the button's full fixed-position footprint on both mobile and desktop.
- Finance: "Just Added" now stretches to match "By Category"'s height instead of sitting far shorter with dead space below it.
- Fixed the Finance Telegram bot's "monthly summary" command silently failing for every 30-day month (April, June, September, November) and February — it hardcoded the query's upper date bound to the 31st, which isn't a valid date for those months, so Postgres rejected the whole query and the bot fell back to "No expenses in {month}."

## 2026-09-01

- Planner: added "Clear Completed" — bulk-deletes every completed task (UI + DB) after one confirm, instead of requiring one delete-and-confirm per task.
- Planner: "Pending Tasks by Day" now shows the cumulative pending-task backlog by real calendar day (last 7 days), instead of a per-weekday-name histogram that reset every week and never showed actual dates.

## 2026-08-24

- Dashboard: fixed Evening Reflection disappearing at midnight — it now stays visible until 5am the next morning, and correctly reflects on yesterday's activity (not the just-started, nearly-empty new day) when viewed post-midnight.

## 2026-08-23

- Coding: replaced each daily-pick card's separate "Open" button with a small external-link icon beside the question title; "Mark Solved"/"Mark Answered" is now the full-width button alone (the link icon stays visible even after a question is completed).
- Coding: the whole daily-pick card body is now clickable to open the question link in a new tab, not just the small icon.
- Dashboard: Life Score v2 — every module score is now a blend of today's quality-aware daily score and its trailing-7-day average (60/40), instead of a pure daily snapshot that could sit high forever just because something was logged, regardless of whether the value was actually good (the bug that prompted this: eating well over a fat-loss calorie target didn't move the score).
- Health's sub-score now reuses the real nutrition/activity calorie-and-protein-accuracy formula instead of a presence-only "was something logged" check.
- Finance's sub-score bands are smoothed (no more 15-point cliff at 90% of budget); Career's sub-score now rewards recurring activity (quiz attempts in the last 30 days, job alerts tracked into applications) instead of one-time static fillers; Coding's sub-score weights algorithm/system-design questions higher than quiz/JS-function/UI-coding picks.
- Explain My Score now shows each module's full "today · this week avg → blended" breakdown instead of just a single delta-from-yesterday number.

## 2026-08-22

- Coding: "Today's Algorithm Question" now sits in the same row as Today's Quiz/JS Function/UI Coding (4 cards, was standalone full-width above them).
- Coding: those 4 cards now stretch to equal height with their Open/Mark button rows bottom-aligned in a column, instead of sitting at whatever height each card's own content produced. `Card` now stretches to fill its grid cell by default (`h-full flex flex-col`). Algorithm Question's inner pick card dropped its own nested background/border (flush with the outer card now that it's usually the only item) but kept the flex context that pins its button to the bottom.

## 2026-08-21

- Learning: removed study-time logging entirely (Log Study Session modal, per-resource Log button, Study Calendar, `study_logs` table) — along with everything downstream of it that had no other data to run on: the revision auto-re-add feature, Dashboard's matching Needs Attention nudge, the Dashboard "Learning Streak" stat and Daily Mission item, and Career's study-streak badge.
- Learning: quiz results now show every question with its own options (correct answer green, a wrong pick red), not just a text list of the misses.
- Coding: moved "Today's Algorithm Question" into the shared Card component (title now renders inside the card); put the Open/Mark Solved and Open/Mark Answered buttons on one row with shortened link text ("Open" instead of "Open on {source}"); removed the Easy/Medium/Hard breakdown box.
- Coding: paired Weak Areas with the Contribution Calendar (half-width each) instead of pairing the Calendar with the Algorithm Question card, which is now standalone/full-width.
- Career: Job Alerts is no longer a tab — it's a passive daily feed, so it always renders as its own card below Applications regardless of which tab is active.
- Health: removed the ad-hoc Workouts log card from the web page (still loggable via Telegram, still read by the Health Score); replaced it with the Health Tip of the Day card, paired with the Workout Calendar.

## 2026-08-20

- Converted Career and Finance to tabbed layouts — both had grown to 5+ stacked full-width sections, violating the app's own "5+ sections belongs in tabs" density rule (Career was the rule's own cited example, but had never actually been converted). Finance's tabs also regroup Loans/Investments/Goals into their own "Portfolio" tab instead of an arbitrary shared column.
- Removed Recurring Expenses entirely (table, cron, UI, Telegram commands); redesigned Payment Calendar into a simple day-by-day "what did I spend today" log (Logged/None) instead of tracking recurring due-dates.
- Fixed the Health Score's Nutrition reason text, which always named the protein gap even when calories were the bigger miss (protein's target is high enough its gap was almost always >20g, permanently winning) — now shows whichever of the two is actually worse that day.
- Added this changelog page (`/changelog`, linked from the version string in the header).
- Added AI-derived "Updated {relative time}" freshness timestamps to Career's Recommended Topic and Interview Guidance, and Astrology's Characteristics card.
- Fixed 5 "always send" cron AI tasks that silently sent a blank paragraph on AI failure instead of a clear fallback message.
- Added a "Spend by Module" cost breakdown to Settings' AI Budget card.
- Consolidated every Risk/Automation Rule/Opportunity threshold into one file (`src/lib/thresholds.ts`).
- Documented the app's single-user security model; fixed a signup-lockdown ordering gap in the deploy instructions.
- Pinned `swisseph-wasm` to an exact version; audited and documented a real bundle-size leak into the shared Telegram webhook route.
- Removed an unused gamification (XP/level/streak) computation that was writing to the database on every Dashboard load for a UI element that had already been removed.
- Dropped 5 orphaned database tables and 8 dead columns that had zero remaining code readers.
- Redesigned Job Alerts: added Ashby as a third source alongside Greenhouse/Lever, plus deterministic salary/skill-match scoring ("Top Fit" postings).
- Removed a dead "Start" button from the Daily Workout card — it had no effect anywhere downstream.
- Fixed Planner's "Pending Tasks by Day" chart, which was grouping by a field (`due_date`) the web UI has no way to set.
- Labeled Coding's algorithm-question card "Today's Algorithm Question," matching the other daily pick cards.
- Split Dashboard's Daily Mission coding item into 4 (algorithm/quiz/JS Function/UI Coding) — it was silently requiring all 4 to be done while showing as one item.
- Fixed the Workout Planner to follow a real fixed 4-day split (chest/back/shoulders-legs/recovery) instead of picking randomly, which could skip a muscle group for weeks by chance.
- Fixed the Learning page's Study Calendar placement to match the current design.

## Earlier

Not itemized before this date — see `git log` for full history.
