# PRD: Phase 3 – Zero Friction Personal OS

Version: 1.0

Status: Ready

Priority: Critical

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

# Integration Layer

**Descoped 2026-07-21.** This section (Google Calendar, Gmail, GitHub, Browser Activity, Bank SMS, Weather providers) is not planned — the OAuth/credential-storage lift is a categorically bigger and riskier undertaking than the rest of this PRD, and GitHub specifically was already tried once (pre-dates this PRD) and abandoned (`GITHUB_USERNAME`/`GITHUB_TOKEN` never configured, silently zeroing the Coding score — it now derives from in-app activity instead). Every other section of this PRD that depended on this layer (Background Timeline, the Automatic Activity dashboard section, parts of Smart Logging, and a few Weekly Pattern Mining / Automation Rules examples) stays explicitly out of scope for the same reason — see `README.md` for exactly which examples were built vs. excluded.

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
