# Ask Brain — Decide Tab Audit — design's `isDecideTab` block vs. repo

Source of truth: the `isDecideTab` block inside the design's "Ask Brain panel" (decoded design script). Cross-checked against `src/features/brain/components/DecisionHelper.tsx` and `DecisionCard.tsx`, which render inside `BrainPanel.tsx`'s "Decide" tab.

**Scope note:** the design's Decide tab is **entirely static mock content** — a single hardcoded example ("Should I take the Google offer over staying?") with no `{{ }}` data bindings anywhere except the Action Items list, and critically, **no question input at all** (the bottom input/Send row only appears for the Ask tab — `isAskTab`). The repo's Decide tab is a real, working feature: a question input, quick-suggestion chips, a loading state, and a live AI-backed answer. This audit covers the **decision-card content and styling** only — it does not propose removing the working input/ask functionality just because the static mockup doesn't show one, per the same "preserve real functionality over literal mock-matching" call made on Resource Quiz and Investment's SIP fields earlier.

**Also out of scope, flagged for awareness:** the tab-selector style (design: underline-indicator tabs, 13px/600, transparent bg, 2px accent bottom-border when active — repo: filled-pill segmented control, `bg-accent text-white` when active) and the panel header/shell (design: 14px/700 title + plain "✕" glyph in a dedicated `var(--card-pad-lg)`-padded header — repo: the shared `AIAdvisorProvider` dropdown header, used by all 6+ module advisor triggers app-wide). Both are shared-shell concerns affecting every advisor tab/panel, not just Decide — same category of issue as the Executive Summary panel-shape question from last time. Not fixing either here without a separate go-ahead, since the blast radius is app-wide.

Status legend: MATCH / MISMATCH / MISSING / OPEN (a real functionality-vs-mock tradeoff, not a style bug).

---

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| 1 | Question echo | A line above the card showing the literal question asked, in quotes: `"..."`, 12.5px tertiary | **FIXED** | Added an `askedQuestion` state to `DecisionHelper.tsx` (captured at ask-time, independent of the live-editable input) and render `"{askedQuestion}"` at `text-[12.5px] text-fg-tertiary` above the card. Live-verified. |
| 2 | Card container | The whole answer (reasoning/tradeoffs/actions) sits inside one visually distinct block: `bg-surface-2`, 10px radius, 14px padding, 13px base font, 1.5 line-height | **FIXED** | `DecisionCard`'s root is now `bg-surface-2 rounded-[10px] p-[14px] text-[13px] leading-[1.5]`. |
| 3 | Decision line + confidence badge row | `justify-content: space-between`, `align-items: flex-start`, gap 10px, mb-6 | **FIXED** | `flex items-start justify-between gap-2.5`. |
| 4 | Confidence badge | 10px/700, background/color from a semantic pair (e.g. `good-soft`/`good`), 10px radius, 3px/9px padding, label is **just the confidence tier** (no "confidence" suffix) | **FIXED** | `text-[10px] font-bold rounded-[10px] px-[9px] py-[3px]`; label is now just "High"/"Medium"/"Low"; color mapping switched to the theme's `good`/`warn`/`risk` tokens. |
| 5 | Reasoning text | 13px (inherited from card), secondary color, mb-10, **no label above it** | **FIXED** | Now inherits the card's `text-[13px]` (removed the separate `text-sm` override). |
| 6 | "Tradeoffs" section label | Literal text **"Tradeoffs"** (no hyphen), 11px, tertiary, uppercase, 0.4px tracking, mb-4 | **FIXED** | Copy corrected, `text-[11px] tracking-[0.4px]`. |
| 7 | Tradeoffs content shape | One flowing paragraph — the design's mock combines its tradeoffs into a single sentence, not a bulleted list | OPEN (kept) | Repo still renders `decision.tradeoffs` as a bulleted list — kept, since the underlying data is a real array. |
| 8 | "Action Items" section label | Literal text **"Action Items"** (both words capitalized), same label style as row 6 | **FIXED** | Copy and sizing corrected to match row 6. |
| 9 | Action item bullet | Plain **"·" (middle dot)**, secondary color — a neutral list marker | **FIXED** | Accent checkmark replaced with a plain "·" in `text-fg-tertiary`. |
| 10 | Action item gap | 4px between items | **FIXED** | `flex flex-col gap-1` (4px). |

---

## Summary

All 9 MISMATCH rows and the 1 MISSING row (question echo) are **FIXED**. Row 7 stays OPEN by design (kept the bulleted list over the mock's single-paragraph example, since the real data is an array).

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser in both light and dark theme — asked a real Decide-tab question ("Should I switch jobs?") and confirmed the question echo, boxed card, "Medium" confidence badge (no "confidence" suffix, correct warn-token color), and both "TRADEOFFS"/"ACTION ITEMS" sections with the neutral "·" bullets all render correctly.
