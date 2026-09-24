# Changelog

One line per shipped change, newest first. Sourced from commit messages —
append here whenever you deploy, same cadence as the version bump.

## 2026-09-24

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
