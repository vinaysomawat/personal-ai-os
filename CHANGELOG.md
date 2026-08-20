# Changelog

One line per shipped change, newest first. Sourced from commit messages —
append here whenever you deploy, same cadence as the version bump.

## 2026-08-20

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
