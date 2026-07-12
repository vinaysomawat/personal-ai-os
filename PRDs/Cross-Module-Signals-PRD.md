# Vinay AI OS — Cross-Module Signals PRD

## Objective
Make modules inform each other instead of staying isolated, per Product Principle 5 (PRD-v2) / Principle 4 (CLAUDE.md): *"Learning improves Career. Health improves Productivity. Productivity improves Coding. Coding improves Career."* One instance of this already exists (Coding streak → Career). This PRD defines the pattern so it can be repeated deterministically instead of wired ad hoc each time, and scopes exactly two new signals to build now.

### Principles
- A signal is a **deterministic read** over data that already exists — never a new AI call. AI only *consumes* a signal as extra context; it never *computes* one (Principle 2/3).
- **Pull, not push.** The consuming module imports a pure function from the producing module and calls it at read time. No event bus, no message queue, no new "signals" table — this is a single-user app running in one Node process; a function call already *is* the integration.
- A signal must have a named source, a formula, and at least one real consumer before it's built. No speculative "might be useful" signals — see Non-Goals.
- Signals are additive only in this phase: they add information (a badge, a context line, an Insight), never suppress or gate existing behavior.

---

# 1. Reference Pattern (already shipped — not new work)

**Coding streak → Career**, in `src/features/career/actions.ts`:
```ts
const { computeCodingStats } = await import('@/features/coding/daily-core')
const codingStats = await computeCodingStats(supabase, user.id)
// returned as codingStreak: codingStats.currentStreak
```
Consumed in `CareerView.tsx` two ways: a `🔥 {N}-day coding streak — feeds interview readiness` badge on the profile card, and a line appended to the context string passed into `askCareerMentor()`.

This is the template every new signal below follows: **producer exports a pure stats function → consumer dynamic-imports it at read time → surfaced as a badge and/or an AI-context line, using the exact same phrasing convention.**

---

# 2. Signal: Learning → Career

## Goal
Interview readiness should reflect actual recent study activity, not just the static skills list and application pipeline Career already scores on.

## Requirements
- Add `computeLearningStats(supabase, userId)` to `src/features/learning/` (new file `stats.ts`, or alongside existing actions — mirrors `computeCodingStats`'s shape and streak algorithm exactly: walk backward from today over distinct `study_logs.date`s, today allowed to be pending without breaking the streak).
- Returns `{ studyStreak: number, completedCount: number, inProgressCount: number, needsRevisionCount: number }`. `needsRevisionCount` reuses the existing `getResourcesNeedingRevision()` rule (§6 of README) rather than re-deriving it.
- `career/actions.ts`'s `getCareerData()` calls this the same way it already calls `computeCodingStats`, returns `learningStreak`/`learningStats` alongside `codingStreak`.
- `CareerView.tsx`: a `📚 {N}-day study streak` badge next to the existing 🔥 coding-streak badge, shown when `studyStreak > 0`.
- `askCareerMentor()`'s context string gets one more line, matching the existing coding-streak sentence's tone: e.g. `Learning: {N}-day study streak, {completedCount} resources completed, {needsRevisionCount} flagged for revision.`

## Non-Requirements
- No attempt to classify which *categories* of resource are "career-relevant" — the existing `Resource.category` field is free text with no taxonomy, and inventing one just for this would be exactly the kind of premature abstraction CLAUDE.md warns against. All resources count.

## Acceptance Criteria
- Career page shows the study-streak badge when applicable; the coding-streak badge's existing behavior is unchanged.
- `askCareerMentor` context includes the new line; zero new `askAI` calls introduced (the signal itself is a DB read, not a model call).
- `npm run build` passes.

---

# 3. Signal: Health → Productivity

## Goal
The Dashboard should surface it when poor recovery (low sleep, or a declining Health Score trend) might be worth factoring into today's plan — informational only, never blocking.

## Requirements
- Extend `computeInsights()` in `DashboardView.tsx` (the existing deterministic Insights candidate list — no new scoring system) with one more candidate:
  - If today's `sleep_hours < 6` (stricter than the existing `<7` "aim for 7-8h" insight already in the list — this is a distinct, higher-concern threshold) → `😴 Only {X}h sleep last night — today might be a lighter-task day`.
  - If the last 3 consecutive `life_score_logs.health_score` values are each lower than the one before → `📉 Health score has dropped for 3 days straight — worth a look`.
- Both conditions are computed from data `getDashboardData()` already fetches (today's `health_metrics`, the `life_score_logs` history) — no new query, no new cross-module import needed, since Dashboard already aggregates every module.
- Insert both into `computeInsights()`'s existing priority-ordered list; keep the existing 5-item cap (`items.slice(0, 5)`) — new candidates compete for a slot on the same terms as what's already there, they don't get a reserved slot.

## Non-Requirements
- **No suppression of other nudges.** A low-sleep signal must never hide or downgrade an existing Today's Focus/evening-checkin item (e.g. it must not make an overdue task look less urgent). Purely additive.
- No new Health Score formula change — this reads the existing formula's output, it doesn't alter it.

## Acceptance Criteria
- Dashboard Insights shows the new line(s) only when the condition is true; with no low-sleep day and no 3-day decline, Insights renders exactly as it does today.
- Existing Insights items and their relative order are unaffected.
- `npm run build` passes.

---

# 4. Non-Goals (explicit — do not build these as part of this PRD)
- No generic pub/sub, event bus, or `signals`/`cross_module_events` table.
- No AI-generated signals — every signal is a deterministic read.
- No new aggregate "readiness score" distinct from the existing Life Score — avoid score sprawl.
- No behavior gating/suppression triggered by a signal (see §3 Non-Requirements) — informational only in this phase.
- No settings UI to toggle individual signals on/off — ship the two above hardcoded; only add configurability if it turns out to be annoying in practice.
- Finance → Career (e.g. a "financial pressure" flag feeding salary-negotiation answers) and any Planner → Health signal are **candidate backlog only** — not scoped here, not to be wired ad hoc later without their own short spec addendum.

# 5. Implementation Order
1. `computeLearningStats()` — pure function, no UI changes yet. Verify streak math against real `study_logs` data before wiring consumers.
2. Wire Learning → Career (badge + mentor context) exactly mirroring the existing Coding → Career pattern.
3. Health → Productivity Insights candidates (smallest, fully contained inside `DashboardView.tsx`, no cross-module import).
4. Per CLAUDE.md's post-task checklist: update README.md's Career and Dashboard sections to document both new signals before considering this done.
5. Only after 1–4 ship and prove out cleanly, revisit the §4 candidate backlog — each additional signal gets its own short addendum to this PRD (Goal/Requirements/Acceptance Criteria), not ad hoc code.
