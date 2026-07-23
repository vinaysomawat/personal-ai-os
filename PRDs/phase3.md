# PRD: Phase 3 – Zero Friction Personal OS

Version: 1.0

Status: Partially complete (reviewed 2026-07-23) — see README.md's Dashboard/Scheduled jobs/AI Gateway sections for the as-built spec. Built: Daily Auto Journal (`daily-journal` cron), Automation Rules (2 of the 4 example rules — "salary credited → SIP" and "weekend free → trek" are the two skipped, see Dependencies), Weekly Pattern Mining (5 of 8 example pattern types implemented in `brain/signals.ts`), Memory Evolution (Goals threaded into Brain context), Notification Intelligence (`computeStaleMetrics()` in the `evening-checkin` cron). Not built: Smart Logging (all five examples — gym photo, receipt, meal photo, GitHub commit, calendar meeting — need vision/OCR or an external integration none of which exist), Background Timeline, and the dedicated "Automatic Activity" Dashboard section (its content was absorbed into "What's Changed" instead, which is deterministic-log-based rather than auto-detected-from-photos).

Priority: Critical

Dependencies: The entire unbuilt half of this PRD (Smart Logging, most of Automation Rules, three more Pattern Mining types) is blocked on the same thing — no Calendar, Gmail, or GitHub integration exists or is currently planned. This isn't a per-item gap to close individually; it's one missing integration layer this whole PRD's "observe life automatically" premise depends on.

Next Actions: Building any single piece of Smart Logging (e.g. meal-photo → calories via Claude vision, since `telegram_vision` already exists in the AI Gateway for a different purpose) would be the smallest real step toward this PRD's actual vision, rather than adding more of the deterministic pieces that don't need it.

---

# Vision

The user should spend less than 60 seconds per day interacting with Personal OS.

Everything else should happen automatically.

The system should observe life instead of asking the user to log life.

---

# Success Metrics

Manual logging reduced by at least 80%.

The dashboard should remain accurate even if the user doesn't open the app for several days.

The user should feel that Personal OS "knows what happened."

---

# Guiding Principle

Every manual action should trigger one question:

"Can the computer discover this automatically?"

If yes, automate it.

---

# Smart Logging

Replace manual logging.

Examples:

Gym photo

↓

Workout detected

Receipt

↓

Expense created

Restaurant bill

↓

Expense

Meal photo

↓

Calories

Protein

GitHub commit

↓

Coding activity

Calendar meeting

↓

Planner context

---

# Background Timeline

Create a timeline.

Examples:

09:00 Office

12:30 Lunch

14:00 Interview

18:00 Workout

20:00 Solved LeetCode

22:00 Read React article

Generated automatically.

---

# Daily Auto Journal

Every night:

Generate

"What happened today"

Include

Work

Learning

Health

Finance

Career

Highlights

Challenges

Wins

One paragraph.

---

# Memory Evolution

Brain should remember:

Recurring behaviors

Preferences

Goals

Achievements

Failures

Repeated questions

Long-term trends

---

# Weekly Pattern Mining

Detect things like:

Always productive Tuesday mornings.

Overspend after salary.

Workout consistency drops during travel.

Coding increases after gym.

Best interview performance after 8 hours sleep.

---

# Automation Rules

Examples:

Interview tomorrow

↓

Reduce workout intensity

↓

Increase React revision

Salary credited

↓

Suggest SIP investment

Weekend free

↓

Recommend trekking

High calorie yesterday

↓

Adjust today's target

---

# Notification Intelligence

Replace reminders.

Instead send only meaningful notifications.

Bad:

Log your weight.

Good:

You haven't logged weight for five days and your trend prediction is becoming unreliable.

---

# Dashboard

New section:

Automatic Activity

Everything detected automatically.

No manual logging required.

---

# Success Criteria

The user should feel:

"I barely touch this app.

Yet it knows my life."
