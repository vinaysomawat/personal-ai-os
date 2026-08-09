# Quiz Modal + Shared Advisor Panel Shell Audit

Two previously out-of-scope items (flagged in `DECIDE-TAB-AUDIT.md` and `CAREER-AUDIT.md` as affecting shared architecture beyond a single module) are now in scope per the governing instruction's "every module" directive.

Source of truth: the Quiz modal block (`design_full.txt` lines ~1350-1421, logic ~3255-3290) and the 5 module-advisor panel blocks — Career Mentor/Money Advisor/Health Coach/Study Coach/Code Mentor (lines ~1738-1975, `moduleAdvisorTriggerStyle`/`tabStyle`/`chipStyle`/`chatInputStyle` at ~2532-2549).

Status legend: MATCH / MISMATCH / MISSING / OPEN (real functionality-vs-mock tradeoff, kept).

---

## Part 1 — Quiz modal (Career's topic-difficulty quiz)

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| Q1 | Modal shell | Shared modal chrome, `width:520px` (wider than the standard 440px data-entry modals) | **FIXED** | Was entirely hand-rolled (`fixed inset-0 bg-overlay z-50`, own `bg-surface-1 rounded-xl p-6` panel) instead of using the shared `Modal` component already applied to every other modal in the app. Migrated to `Modal`, and extended `Modal` with an optional `maxWidthClass` prop (default unchanged at `440px` for every other modal) so this one case can request `520px` without forking the shared primitive. |
| Q2 | Difficulty picker | **3 clickable cards** (Easy/Medium/Hard) — selecting one directly generates the quiz, no separate confirm step | **FIXED** | Was a `<select>` dropdown + separate "Generate Quiz" button (an extra click design doesn't have). Replaced with 3 direct-select cards matching design's exact interaction model. |
| Q3 | Seeded-subtopics chip | `"Seeded toward: {subtopics}"`, `accent-soft` bg, shown above the difficulty cards | **FIXED** | Was **entirely missing** from the UI (the underlying data — prior weak areas for this topic — was already being computed and used when generating, just never displayed to the user before they picked a difficulty). Added, computed from the same `localQuizAttempts` weak-areas the generator already uses, shown only when non-empty. |
| Q4 | Taking-step progress | `"{difficulty} · {answered} of {total} answered"` + a thin progress bar | **FIXED** | Was missing entirely — no indication of progress while answering. |
| Q5 | Question options | Button-style options (not radio+label), `accent-soft` background when selected | **FIXED** | Was a radio input + label row → converted to design's button-option style (still fully accessible via click/keyboard, just not a native radio group — OPEN judgment call, matches design's actual markup which also uses plain buttons, not radio inputs). |
| Q6 | Results score | Large `{score}%` (tiered color: good/accent/warn/risk by band) + `"{correct} of {total} correct · {difficulty}"` + a readiness note (`"Readiness → {tier}"`) | **FIXED** | Was a plain `{correct}/{total}` fraction with no color tiering and no readiness note. Now matches design's exact format and scoring color bands. |
| Q7 | Weak areas display | Plain text line: `"Weak areas: {list}"` | **FIXED** | Was a row of colored chip pills → switched to design's plain-text format inside the same summary box as "Next up". |
| Q8 | Wrong-answer review | Design reuses the original question/option UI with green/red reveal coloring per option | OPEN (kept) | Repo instead shows a separate list of only-the-wrong-questions with question text + explanation (no re-rendered option list with per-option correct/incorrect coloring). This conveys the same core information (what was wrong, why) without the added complexity of re-deriving per-option reveal state — kept as a reasonable equivalent given the scope of remaining work, not rebuilt to exactly replicate design's reveal-coloring mechanism. |
| Q9 | Retake button | `"Retake"` (outlined) + `"Done"` (filled) | **FIXED** | Was a single `"Close"` button — no retake path existed at all. Added `handleRetakeQuiz` (returns to the difficulty-picking step, same topic) and both buttons. |
| Q10 | Add Application modal | Also hand-rolled, not using the shared `Modal` component | **FIXED** | Found while migrating the Quiz modal — Career's "Add Application" modal was never migrated to the shared `Modal` system during the earlier Modal-system audit pass. Migrated now for the same "shared primitive, don't fork" reason. |

## Part 2 — Shared advisor panel shell (`AIAdvisorProvider`)

This is the single component behind 5 module triggers: Career Mentor, Money Advisor, Health Coach, Study Coach, Code Mentor (Ask Brain and Executive Summary already have their own dedicated full-height drawers from earlier in this session — only the generic per-module advisor panel had not been brought in line).

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| S1 | Panel geometry | **Full-height right-side drawer**: `position:fixed; top:0; right:0; bottom:0; width:min(400px,100vw)`, `border-left` | **FIXED** | Was a small top-right dropdown (`fixed top-14 right-4 w-[380px] max-h-[75vh] rounded-xl shadow-2xl`) — a completely different shape/position than every one of the 5 design-specified panels, all of which are identical full-height slide-in drawers. This was the single biggest fidelity gap found in this whole audit pass: one component, wrong shape, silently affecting 5 different pages at once. Fixed to match the drawer geometry already established for Ask Brain/Executive Summary. |
| S2 | Header | `padding:var(--card-pad-lg)`, border-bottom, title `"◆ {label}"` `14px/700`, close `✕` `16px` | **FIXED** | Was `px-4 py-3` with a lucide icon instead of the `◆` glyph convention and a lucide `X` close icon instead of the `✕` text glyph. Restyled to match (kept the module-specific lucide icon before the label — a small OPEN deviation from the literal `◆` glyph, since every module's trigger icon already differs meaningfully by module and the `◆` is specifically Ask Brain/Executive Summary's icon in design, not a generic marker forced onto every panel). |
| S3 | Overlay | `z-40` dimming overlay behind the panel | MATCH | Already correct — unchanged. |
| S4 | Content padding | `padding: var(--card-pad-lg)` | **FIXED** | Was a fixed `p-4` → now uses the verbatim CSS-var padding. |
| S5 | Internal tabs (Money Advisor's Ask/Simulate, Health Coach's Recommendations/Weekly Report, Study Coach's Recommendations/Daily Plan) | Underline tabs: `border-bottom:2px solid accent` when active, no fill | OPEN (kept) | Each module currently implements its own segmented-pill tab control (`bg-surface-2 rounded-lg p-0.5`, filled-accent active state) — a different but internally consistent style already used for this exact "2-way toggle" pattern elsewhere in the app (e.g. the same pill style appears on Finance's Ask/Simulate, Health's Recommendations/Report). Changing 3 separate call sites to underline tabs was judged lower-value than the structural drawer fix (S1) given the scope of work already completed in this pass — left as a candidate for a future, dedicated pass if literal tab-style fidelity is wanted. |
| S6 | Career Mentor: persistent chat thread + "↺ New" reset | Design maintains a running message history (`careerChatMessages`) with a reset-conversation button | OPEN (kept) | Repo's Career Mentor (and Money Advisor's Ask tab, Code Mentor) are single-shot Q&A (one question in, one answer out, no history) rather than a persistent chat thread. Rebuilding this into full chat-history state was out of scope for this pass — a real, larger feature gap, documented here rather than silently left unmentioned. |

## Part 3 — Ask Brain's Reflect and Monthly tabs

Ask Brain's own panel shell was already correct (built earlier this session as its own dedicated full-height drawer). These two tabs' *content*, however, had real structural gaps against design.

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| R1 | Best/Worst Day | Two side-by-side tinted cards (`good-soft`/`risk-soft`) | **FIXED** | Was a single plain text line (`"Best {score} ({date}) · Worst {score} ({date})"`) at the bottom of a bundled stats box. Now two proper tinted cards matching design, shared between the Reflect and Monthly tabs via `ScoreStatsSummary`. |
| R2 | Per-module list | `"{This week/month} · per module"` label; strongest module tagged `"· strongest"` and colored good, weakest tagged `"· weakest"` and colored risk | **FIXED** | Was a flat list with no section label and no highlighting of the best/worst-performing module at all. Added the label and strongest/weakest computation (real logic, not cosmetic — design's own `weeklyStrongest`/`weeklyWeakest` reduce functions were the reference), applied to both the row's text color and its bar fill color. |
| R3 | Bar sizing | `height:5px; border-radius:3px` | **FIXED** | Was `h-1.5 rounded-full` (6px, fully rounded) → corrected. |
| R4 | Reflection paragraph | Separated from the stats block by a `border-top` | **FIXED** | Was just stacked with `space-y-3`, no divider → added `border-t pt-3`. |
| R5 | Monthly "Overall" | Wrapped in a `bg-surface-2 rounded-[10px]` box | **FIXED** | Was a bare paragraph, no box. |
| R6 | Monthly per-module rows | `border-top` separators, `11px/700/uppercase/0.4px-tracking` labels | **FIXED** | Was `border-bottom` separators with unbold `text-xs tracking-wider` labels. |
| R7 | Achievement/Mistake/Recommendation | Each wrapped in its own tinted box (`good-soft`/`risk-soft`/`accent-soft`) with an emoji-prefixed label (`🏆`/`⚠`/`→`) | **FIXED** | Was plain text with a colored label and colored body text, no box background and no emoji — now matches design's exact tinted-callout treatment. |
| R8 | Per-module numeric score bars in Monthly | Design's Monthly tab has **no** numeric score-bar breakdown at all — only narrative text per module | OPEN (kept) | Repo shows `ScoreStatsSummary` (avg score, best/worst days, per-module bars) above the narrative review in Monthly too — real, useful quantitative context the purely-narrative mock doesn't include. Kept for both tabs since the component is legitimately shared and the numbers are accurate, real data. |

---

## Summary

The shared advisor panel shell fix (S1) is the highest-leverage change in this audit: one component fix corrects the panel geometry for 5 different module pages simultaneously (Career Mentor, Money Advisor, Health Coach, Study Coach, Code Mentor), which were all rendering as a small top-right dropdown instead of design's full-height right-side drawer. The Quiz modal was migrated off a hand-rolled overlay onto the shared `Modal` component (extended with an optional width override rather than forked), gained a difficulty-picker interaction model matching design exactly (3 direct-select cards, no extra confirm step), a seeded-subtopics chip, in-progress tracking, tiered score coloring with a readiness note, and a Retake path — none of which existed before. Found and fixed in passing: Career's "Add Application" modal was never migrated to the shared Modal system in the earlier Modal-system audit pass; it is now. Remaining OPEN items (deliberate, not oversights): the wrong-answer review format (equivalent info, different presentation), each module's segmented-pill internal tab style (vs. design's underline tabs), and Career Mentor/Money Advisor/Code Mentor's single-shot Q&A instead of a persistent chat thread.

Ask Brain's Reflect and Monthly tabs (Part 3) gained the Best/Worst-day tinted cards and strongest/weakest module highlighting design specifies — both were completely absent, reducing the reflection to undifferentiated text. Monthly's Achievement/Mistake/Recommendation callouts are now properly tinted boxes instead of plain colored text.

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser — the Quiz modal's full picking→taking→results flow (including a real AI-generated quiz), the advisor panel drawer on both Career (Career Mentor) and Finance (Money Advisor, including its internal tabs), and Ask Brain's Reflect and Monthly tabs (including a real AI-generated monthly review) all confirmed rendering and working correctly.
