# PRD: Daily Operating System (DOS)

Version: 1.0

Status: Nearly complete (reviewed 2026-07-23) — this is the current live Dashboard (`/dashboard`, README.md §1), the most-built of all five phases. Built: Header (Life Score + streaks), Section 1 What's Changed, Section 2 Today's Mission, Section 3 Needs Attention, Section 5 Quick Actions (Quick Add), Section 6 Today's Insight, Section 7 Evening Reflection, plus the Sidebar Widget (as `QuickStats.tsx`, deliberately page-level rather than in the global nav sidebar — see README for why). Not built: Section 4 "Today's Schedule" — the one section explicitly and deliberately skipped, per README's own note, because it needs a real Calendar integration to have actual clock-times to show; without one, a "timeline" would just re-list Today's Mission's items with fake times.

Priority: Highest

Owner: Personal OS

Dependencies: Today's Schedule is blocked on the same missing Calendar integration named in Phase 3's Dependencies — this is the one place across all 5 PRDs where that gap directly blocks a named, scoped section rather than a whole category of features.

Next Actions: This PRD is close enough to done that the only remaining scoped work is Today's Schedule, and that's entirely gated on deciding whether to build a Calendar integration — there's no smaller buildable slice of it worth doing standalone.

---

# Vision

Personal OS should have ONE screen that answers everything I need to know today.

Instead of opening multiple modules:

Health

Finance

Career

Learning

Planner

Coding

The Daily Operating System aggregates everything into one intelligent, actionable dashboard.

This becomes the application's home page.

It should be the only page I need to open most days.

---

# Philosophy

The dashboard should answer four questions:

1. What changed?
2. What should I do?
3. What needs attention?
4. Am I moving toward my goals?

Nothing else.

No unnecessary charts.

No information overload.

---

# Design Principles

## Action over Analytics

Never show information without a possible action.

Bad

Calories
1380

Good

420 calories remaining

---

## Delta over Absolute

Always show change.

Bad

Weight
107.8kg

Good

107.8kg

↓ -0.4kg since yesterday

---

## Today's Context Only

This page is about TODAY.

Historical analysis belongs elsewhere.

---

## One Screen

Everything important fits without scrolling on a laptop.

Scrolling should reveal details,

not required information.

---

# Layout

---------------------------------------------------

Header

Good Morning Vinay 👋

Tuesday, 21 July

Life Score

Energy Score

Mood (optional)

Current Streaks

---------------------------------------------------

Section 1

What's Changed

---------------------------------------------------

Section 2

Today's Mission

---------------------------------------------------

Section 3

Needs Attention

---------------------------------------------------

Section 4

Today's Schedule

---------------------------------------------------

Section 5

Quick Actions

---------------------------------------------------

Section 6

Today's Insights

---------------------------------------------------

Section 7

Evening Reflection (visible after 6 PM)

---------------------------------------------------

---

# Section 1

What's Changed

Purpose

Quickly understand what's different since yesterday.

Examples

↓

Weight -0.4kg

↑ Coding streak 18 days

↓ Budget remaining ₹1200

Workout completed

Interview added

Expense logged

Life Score +3

Every item links to its source module.

No AI required.

Pure deterministic comparison.

---

# Section 2

Today's Mission

Maximum

Five tasks.

Generated from existing Planner + Personal Brain.

Examples

□ Complete Chest Workout

□ Solve one Medium problem

□ Read Angular Signals article

□ Stay under ₹500

□ Reach 150g protein

Every task has

Priority

Estimated duration

Module

Complete button

Completion updates Life Score instantly.

---

# Section 3

Needs Attention

Show only things requiring action.

Examples

⚠ EMI due tomorrow

⚠ Protein target behind

⚠ Interview in two days

⚠ Coding streak at risk

⚠ Expense category exceeds budget

Maximum

Three items.

Anything more indicates prioritization failed.

---

# Section 4

Today's Schedule

Unified timeline.

Examples

09:00 Work

12:30 Lunch

18:30 Gym

20:00 Coding

22:00 Reflection

Calendar events

Planner tasks

Workout

Study sessions

appear together.

---

# Section 5

Quick Actions

Designed for logging in under five seconds.

Buttons

+ Expense

+ Weight

+ Workout

+ Meal

+ Task

+ Note

Forms should be minimal.

Remember previous values where possible.

---

# Section 6

Today's Insights

One AI-generated insight.

Examples

"You've been most productive after morning workouts this month."

"You usually overspend on Fridays."

"You've consistently hit your protein target for six days."

Only one insight.

High quality over quantity.

---

# Section 7

Evening Reflection

Visible after 6 PM.

Automatically summarizes:

Completed tasks

Missed tasks

Calories

Protein

Money spent

Coding progress

Workout

Life Score change

Ends with

Tomorrow's top priority.

Maximum

200 words.

---

# Sidebar Widget

Persistent compact widgets.

Current Streak

Today's Budget

Protein Remaining

Steps Remaining

Workout Status

Coding Status

---

# Smart Behaviors

Morning

Focus on planning.

Afternoon

Focus on progress.

Evening

Focus on completion.

Night

Focus on reflection.

The same dashboard changes throughout the day.

---

# Animations

Life Score changes animate.

Mission completion updates instantly.

New achievements celebrate briefly.

Cards should never jump during updates.

---

# Mobile

Cards stack vertically.

Quick Actions become floating action button.

Timeline collapses.

Reflection becomes bottom sheet.

---

# Performance

Dashboard loads in under 500ms.

Use cached AI insight.

All other cards should be deterministic.

No blocking AI requests during initial load.

---

# Success Criteria

When I open Personal OS in the morning,

I immediately know:

What changed.

What matters.

What I should do.

What can wait.

Without opening any other module.

---

# Future Enhancements (Out of Scope)

- Voice briefing
- Wearable integration
- Calendar sync
- Smart home actions
- Email summarization

These belong to future phases.

This PRD focuses only on creating the perfect daily operating screen using existing project capabilities.