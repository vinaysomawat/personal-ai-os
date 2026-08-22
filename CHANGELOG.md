# Changelog

One line per shipped change, newest first. Sourced from commit messages —
append here whenever you deploy, same cadence as the version bump.

## 2026-08-22

- Coding: "Today's Algorithm Question" now sits in the same row as Today's Quiz/JS Function/UI Coding (4 cards, was standalone full-width above them).
- Coding: those 4 cards now stretch to equal height with their Open/Mark button rows bottom-aligned in a column, instead of sitting at whatever height each card's own content produced. `Card` now stretches to fill its grid cell by default (`h-full flex flex-col`).

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
