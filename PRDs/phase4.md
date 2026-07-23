# PRD: Phase 4 – Autonomous Personal Chief of Staff

Version: 1.0

Status: Mostly complete for the pieces buildable without external integrations (reviewed 2026-07-23) — see README.md's Dashboard/AI Gateway sections for the as-built spec. Built: Executive Memory (career bio field, deliberately not the PRD's other speculative fields — see README), Goal Engine (`src/features/goals/`), Risk Engine, Opportunity Engine (both in `daily-briefing` cron + Dashboard's Needs Attention), Decision Engine (Ask Brain's Decide tab), Daily Briefing, Weekly Executive Review (Reflect tab), Monthly Board Meeting (Monthly tab), Scenario Simulation (`finance_scenario` task in `finance-advisor.ts`). This PRD's own "Executive Dashboard" section was explicitly superseded by Phase 5's Daily Operating System and folded into it (see README §1's "third rewrite" note) rather than built as a separate piece. Not built: Time Allocation Optimizer (no time-tracking data source exists to study), Autonomous Planning (no overnight job prepares tomorrow's workout/study/coding selections in advance — today's assignments are generated same-morning via cron, not the night before), and a literal "Executive Inbox" UI (Dashboard's Needs Attention card covers the same ground functionally — risks/decisions/signals in one ranked list — but isn't framed as an inbox with resolve/dismiss semantics beyond the existing dismiss-and-it's-gone pattern).

Priority: Highest

Dependencies: Time Allocation Optimizer needs a time-tracking data source that doesn't exist anywhere in the app (no module logs how time was actually spent, only what was completed) — this is a genuinely new capability, not an integration gap like Phase 3's. Autonomous Planning has no hard blocker; it just hasn't been built as a dedicated overnight cron.

Next Actions: Given Executive Dashboard is already superseded and Time Allocation Optimizer needs net-new tracking this app doesn't do elsewhere, the next realistic slice is Autonomous Planning — a night-before cron that pre-selects tomorrow's workout/study topic/coding difficulty using the same signals the morning-of crons already compute, just run 12 hours earlier and written to a table the morning crons read from instead of recomputing.

---

# Vision

Personal OS is no longer an assistant.

It becomes my Chief of Staff.

Its responsibility is not to answer questions.

Its responsibility is to ensure my life keeps moving forward.

Instead of asking

"What should I do?"

the system already knows.

---

# Philosophy

Current evolution

Tracker

↓

Dashboard

↓

AI Advisor

↓

Personal Brain

↓

Automation

↓

Chief of Staff

---

# Definition of Success

Every morning I should receive a briefing that is almost exactly what I would have written for myself.

I should rarely need to ask questions.

The system should already know what matters.

---

# New Architecture

Create

src/features/chief/

chief/

planner.ts

reasoning.ts

executive-memory.ts

priority-engine.ts

daily-briefing.ts

goal-engine.ts

reflection.ts

decision-engine.ts

risk-engine.ts

---

# Executive Memory

This is NOT chat history.

This is long-term memory.

Store things like

Current goals

Current salary

Upcoming baby

Current employer

Target companies

Current health trend

Investment philosophy

Workout preference

Study habits

Sleep pattern

Financial constraints

Personality traits

Recurring mistakes

Recurring strengths

Never ask twice.

---

# Goal Engine

Goals become first-class objects.

Examples

Lose body fat

Become Staff Engineer

Increase savings

Read 25 books

Reach 100 coding streak

Every recommendation should align with active goals.

---

# Priority Engine

Every morning rank life.

Example

1.

Interview tomorrow

Priority 100

2.

EMI due

Priority 90

3.

Workout overdue

Priority 75

4.

Coding streak

Priority 65

5.

Learning revision

Priority 60

Ignore everything else.

---

# Risk Engine

Instead of reporting data.

Predict problems.

Examples

You may miss your coding streak tomorrow.

Protein intake has declined for six days.

You're likely to exceed your budget.

Your interview preparation is behind schedule.

Weight trend predicts a plateau.

Emergency fund will fall below target.

Missed workouts correlate with work travel.

Every risk includes:

Probability

Impact

Suggested action

---

# Opportunity Engine

Not only risks.

Detect opportunities.

Examples

You have a free Saturday.

Book a trek.

Salary credited.

Invest ₹25,000 into SIP.

Three interview invites.

Increase interview practice.

Three weeks without leave.

Take a break.

---

# Decision Engine

User asks

Should I buy this car?

Brain evaluates

Finances

Goals

Upcoming expenses

Emergency fund

Loan burden

Historical spending

Future salary

Returns

Decision

Pros

Cons

Confidence

Recommendation

---

# Executive Dashboard

Replace passive widgets.

Morning Brief

Top Priorities

Critical Risks

Best Opportunity

Today's Schedule

Decision Queue

Weekly Goal Progress

Everything else secondary.

---

# Daily Briefing

Automatically generated.

Sections

Good Morning

Yesterday

Today's priorities

Meetings

Health

Money

Career

Warnings

One motivational insight

Maximum

250 words

---

# Weekly Executive Review

Every Sunday

Achievements

Failures

Habits

Patterns

Goal progress

Top priority next week

Executive summary

---

# Monthly Board Meeting

Like a CEO review.

Questions answered

Did I move closer to my goals?

What wasted my time?

What produced the highest ROI?

What should stop?

What should start?

---

# Scenario Simulation

Ask

"If I buy a ₹15L car..."

Brain simulates

Cash flow

Savings

Emergency fund

Goals

Retirement

Travel

Baby expenses

Returns projection.

---

# Time Allocation Optimizer

Brain studies

Where time goes.

Suggests

Reduce YouTube.

Increase interview practice.

Move workout earlier.

Schedule learning after dinner.

---

# Executive Inbox

Instead of notifications.

Maintain an inbox.

Examples

Needs attention

Decision required

High priority

Waiting for you

Resolved automatically

Exactly like a CEO inbox.

---

# Autonomous Planning

Every night

Tomorrow's schedule prepared.

Workout selected.

Study topic chosen.

Coding selected.

Priority tasks reordered.

Meals suggested.

Everything ready before wake-up.

---

# Success Criteria

The application should feel like

an intelligent human Chief of Staff

instead of

an AI chatbot.
