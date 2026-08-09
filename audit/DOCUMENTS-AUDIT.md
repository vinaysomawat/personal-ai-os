# Documents Audit — design's `isDocuments` block vs. repo

Source of truth: the `isDocuments` template block (decoded design script) plus its companion state/logic (`filteredDocuments`, `docsWrapStyle`, `d.rowStyle`, `selectDoc`/`newDoc`/`saveDoc`/`closeDoc`, `docCharCountLabel`, `summarizeDoc`/`askDocAI`). Cross-checked against `src/features/documents/components/DocumentsView.tsx`.

Status legend: MATCH / MISMATCH / MISSING (design element absent from repo) / OPEN (a real constraint or judgment call, not a straightforward style bug).

---

| # | Element | Design spec | Verdict | Detail |
|---|---|---|---|---|
| 1 | Overall structure | One continuous region — sidebar and editor share a single `border-right`, no gap, no card wrapper around either side; editor pane sits directly on page background (`var(--bg)`), not inside a card | **FIXED** | Rebuilt as one flex row: sidebar has `border-r border-surface-3`, editor has no card/border/bg of its own — the whole view now sits directly on page background, no gap between panes. |
| 2 | Container height | `calc(100vh - 67px)` | OPEN | Unchanged — `h-[calc(100vh-7.5rem)] md:h-[calc(100vh-6rem)]` stays, calibrated to this app's real chrome. |
| 3 | Sidebar width | `min(280px, 100vw)`, `flex: 1 1 280px`, `min-width: 220px` | **FIXED** | `md:w-[280px] md:min-w-[220px]`. |
| 4 | Sidebar padding | `var(--card-pad-md)` (16px comfortable) | **FIXED** | `p-4` (16px). |
| 5 | Search input | surface-2 bg, border, 8px radius, 9px/12px padding, 12.5px, placeholder **"Search title, content, tags..."**, no icon | **FIXED** | Icon removed; `bg-surface-2 rounded-[8px] px-3 py-[9px] text-[12.5px]`; placeholder text now matches exactly. |
| 6 | New Document button | Full-width, accent bg, white text, 8px radius, 9px padding, 12.5px/**600**, literal text **"+ New Document"** | **FIXED** | Icon removed, literal text restored, `py-[9px] rounded-[8px] text-[12.5px] font-semibold`. |
| 7 | Document list gap | 8px | **FIXED** | `flex flex-col gap-2`. |
| 8 | Document row container | 10px radius, 10px/12px padding; selected = `accent-soft` bg + `accent-border`; unselected = `surface-2` bg + transparent border | **FIXED** | `rounded-[10px] px-3 py-2.5`; selected now uses the theme's `bg-accent-soft border-accent-border` tokens instead of hardcoded opacity; unselected is `bg-surface-2 border-transparent`. |
| 9 | Document row icon | None — row is text-only | **FIXED** | `FileText` icon removed from every row. |
| 10 | Title + date layout | Title (13px/700) and delete "✕" share one row (`justify-between`); date sits on **its own line below**, 10.5px tertiary | **FIXED** | Date moved to its own line below the title row. |
| 11 | Delete button visibility | Always visible, plain "✕" text glyph, 12px quaternary | **FIXED** | Hover-only opacity toggle removed; `Trash2` icon replaced with a plain "✕" glyph. Live-verified. |
| 12 | Preview text | 11.5px secondary, truncated to **90 chars** + "…", `mt-5` | **FIXED** | `slice(0, 90)` + "…", `text-[11.5px] text-fg-secondary mt-[5px]`; the "Empty" fallback text was removed (design has none). |
| 13 | Tag pills | 10px text, `surface-2` bg, tertiary text, **5px radius**, 2px/7px padding, max 2 tags | **FIXED** | `text-[10px] bg-surface-2 rounded-[5px] px-[7px] py-0.5`. Live-verified: on unselected rows the pill background is literally identical to the row background per the design's own computed values (a source quirk, not a repo bug) — text color is still the only visual separator, exactly as specified. |
| 14 | Row date format | Short style, e.g. **"Jul 24"** | **FIXED** | New `formatShortDate()` helper (`toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`) replaces the raw ISO slice. |
| 15 | Sidebar empty state | Centered, 24px/12px padding, 🗂️ emoji at 20px, message conditional on **whether any documents exist at all** ("No documents yet — create one." vs "No documents match your search.") | **FIXED** | Inline empty state (no longer the shared `EmptyState` component) with the 🗂️ emoji and the exact conditional copy, based on the unfiltered `docs` list length. |
| 16 | Main pane empty state | Centered, **no icon**, "Select a document or create a new one" at 13.5px tertiary | **FIXED** | Icon removed; `text-[13.5px] text-fg-tertiary`. |
| 17 | Editor header — title input | 20px / **700**, transparent, no border | **FIXED** | `text-[20px] font-bold`. |
| 18 | Editor header — tags input | Fixed **220px** width, surface-2 bg, border, 7px radius, 7px/10px padding, 12px | **FIXED** | `w-[220px] rounded-[7px] px-[10px] py-[7px]`. |
| 19 | Editor header — Save button | accent bg, white text, 7px radius, 8px/14px padding, 12.5px/**600**, dynamic label ("Create" for new, "Save" for existing) | **FIXED** | `px-3.5 py-2 rounded-[7px] text-[12.5px] font-semibold`; Create/Save label logic unchanged. |
| 20 | Editor header — Close control | **Bordered text button**: outline (`border-strong`), 7px radius, 8px/12px padding, 12.5px secondary, literal text **"Close"** | **FIXED** | Icon-only `X` button replaced with a bordered text button reading "Close". |
| 21 | Content textarea | **Sans font** (`font-family: inherit`), 14px/1.6 line-height, **primary** text color, bg = page background (`var(--bg)`) | **FIXED** | `font-mono` removed (now inherits the app's sans font); color changed to `text-fg-primary`; background now correctly shows through to the page background since the editor no longer has its own card `bg-surface-1`. Live-verified. |
| 22 | Char count footer | Present: `"{N} characters · eligible for auto-summary"` or `"{N} characters · {300-N} more for auto-summary"`, 11px quaternary, border-top | **FIXED** | Added — computed from live `editContent.length`, rendered unconditionally whenever a doc is open (new or existing), matching the design's placement outside the `isExistingDoc` block. Live-verified: showed "67 characters · 233 more for auto-summary". |
| 23 | AI panel — header row | **None** | **FIXED** | The "✨ ASK AI" header row (Sparkles icon + uppercase label) removed entirely — panel now goes straight from the optional answer block to the button row, matching source. |
| 24 | AI answer block | Plain `surface-2` bg, 8px radius, 10px/12px padding, 12.5px secondary, `white-space: pre-line` | **FIXED** | Accent-tinted callout replaced with plain `bg-surface-2 rounded-[8px] px-3 py-2.5`; the `max-h-32` scroll cap was removed. Live-verified via a real Summarise call. |
| 25 | Summarise control | A proper **button**: outline (`border-strong`), 7px radius, 8px/12px padding, 12px secondary, sits in the same row as the question input | **FIXED** | Now a bordered button (`border-border-strong rounded-[7px]`) in the same row as the question input, not a bare text link in a header row. |
| 26 | Question input | 12.5px, **primary** text, placeholder **"Ask AI about this document..."** | **FIXED** | `text-[12.5px] text-fg-primary`, placeholder copy corrected. |
| 27 | Ask button | **Text button**: accent bg, white text, 7px radius, 8px/14px padding, 12px/600, literal label **"Ask"** | **FIXED** | Icon-only `Send` button replaced with a text button reading "Ask" (or "..." while pending). |

---

## Summary

All 25 MISMATCH rows and the 1 MISSING row (char-count/auto-summary footer) are **FIXED**, including the structural single-region layout change (row 1). Only row 2 (container height) remains OPEN, and correctly so — it's calibrated to this app's real header/padding chrome, not a literal copy target.

Verified: `tsc --noEmit` and `eslint` both clean. Live-checked in the browser in both light and dark theme — opened an existing document, confirmed the sans-font/primary-color textarea rendering directly on page background, the char-count footer, the plain-surface AI answer block via a real Summarise call, and the bordered Close/Ask text buttons.
