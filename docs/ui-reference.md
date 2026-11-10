# UI Reference (screen-by-screen)

Top-to-bottom layout of every page.

## Dashboard (`/dashboard`)

1. `PageHeader` "Dashboard" — right: date · dasha link (or greeting; greeting only in Interview War Mode)
2. **Your turn** + **Daily Mission** `lg:grid-cols-2 items-start`
3. **Hunt Hero** — a full-width **Today's score** card (`ScoreCard` in `HuntHero.tsx`; stacks on mobile, `sm:flex-row`): left — the score at 40px in its tone (green on a good day whatever the %), "/ 100", level · blocks done x/y (+ "✓ good day"), 7-day avg · best (14d); right — a 14-day bar chart (96px; 13 past days by whole blocks from `recentScores` + today with partial credit; bars toned 90+ (or a good day) good / 70+ accent / 40+ warn / else risk, value above each bar, today full-opacity and bold, no-plan days as a stub, dashed target line at 90; date labels "Tue 14" / "Today" on `sm+`, every other day as a bare number on mobile). Below it 4 tiles `grid-cols-2 sm:grid-cols-4` (Readiness, Mock average, Revision due, Runway). (The Life Score ring + Quick Stats layout is not shown while War Mode is always on.)
4. **Life Score Trend** (not in Interview War Mode)

App-wide: Quick Add FAB; Ask Brain in the header.

## Prep (`/prep`)

1. Header — "Prep" + 🔥 streak, 🎯 today's focus, 📅 Interview-ready by {date}, then the pace as plain text ("Pace: Behind 37m", green ahead / red behind; hover for % done · % of day gone · full days of 7). No stat tiles.
2. Tabs: Today / Interview / Questions / Mock Round / Story Bank
3. **Today** — **Today header** ("Today · {window}" + "· 🎤 interview {time}" or "· 🎤 interviews {time}, {time}"; coach line; pace line: Ahead/Behind · % of plan done · % of the day gone · blocks; buttons **🎤 Interview today** (**🎤 Interviews** once one is set), **✎ Edit today**, **✎ Default plan**) → when editing, the editor in place: **Edit today** (`lg:grid-cols-[1fr_320px] items-start`: left — "Day starts" time input, the 🎤 Interview today box (time, minutes, company/round, the warm-up / debrief note), the ☕ Meals & breaks box (one row per meal: start – end time inputs, its length, its name; then Add break; per break: start – end time inputs, its length, an optional name, ✕), the item list (⠿ drag handle, name — an input for your own slots, "· slot N" on extra slots — minutes input, ✂ split, ✕), "Add a slot…" select (items already in the day read "— another slot") + Add, Save / Cancel; right — the Preview: time range + label per row, and "Doesn't fit: …" in amber) or **Default plan** (sessions: name, start – end time inputs, gap label, the sessions' total time; "Minutes per day · the same every day": one row per plan key with a minutes input (`sm:grid-cols-2`), the mock an on/off "Sun · Tue · Thu · Sat"; the total line (red when over the sessions' time); Save / Cancel) → otherwise the full-width **Timeline** (header "{window} · ends {time}" + "· N min over" in amber; one compact row per slot `grid-cols-[50px_1fr_auto] sm:grid-cols-[124px_1fr_auto]`: start time on mobile / full range from `sm`, label — blocks bold with ✓ when done, meals / breaks / Flex muted, warm-up / interview / debrief in accent — an amber "moved" tag, minutes, and ⏱ Start / Go on the current, next or moved block; each row has a 3px left border by state — now accent, done good, moved warn, other blocks grey, life slots none; the current row accent-tinted, past rows dimmed; the over-hint and "Doesn't fit today" lines under it). FocusBar in the navbar (minutes left + progress + Pause / Finish / Stop) while focusing; no full-screen overlay.
4. **Interview** `lg:grid-cols-[340px_1fr] items-start` — left: **New interview prep** (company, role; date, time (IST), minutes; round select; JD textarea; **Build prep plan**) above **Interviews · N** (rows with a coloured left border — selected accent, upcoming warn, past grey: company · role, date · time · round · "researched"); right, for the selected prep: a header card (date · length · round, the role read, JD skill chips, delete), a Retry row when the AI plan is missing, then `xl:grid-cols-2`: **Likely questions** (numbered, type chip + why) | **Plan until the interview** (time → task) above **Focus areas** (+ likely rounds, prepare for, ask them); then `xl:grid-cols-2`: **Practise from your bank** (WEAK / UNSEEN / REVIEW tag · title · category; coverage per area: % practised, avg rating; stories to have ready) | **Interview experiences online** (known for (model knowledge); the skill's summary, reported process, reported questions with ×count and source, sources with dates — or the `/interview-prep` hint; search links for the last 12 months)
5. **AI Engineer** (no tab, opens at `/prep?tab=ai`) `lg:grid-cols-[1fr_340px] items-start` — left: **Today's step** (header: W{n} · stage {s} · x/5 steps, or "starts {date}" / "path finished"; "Step i of 5 · Job Copilot", the step title, its task, "Done when …", a **Learn first · {concept}** box with the plain explanation, the week's links, **Mark step done**; once all 5 are ticked: "write it up" + **Mark week shipped**) above the **week card** (W{n} · title, date range; the goal; `md:grid-cols-2` **Concepts** (term — plain explanation) beside **Steps** (5 checkboxes, title + "Done when", ticked rows green and struck through); the interview line as a quote; theme topic chips opening Questions filtered; on this and past weeks **Mark week shipped** / **Edit** + **Undo** with the proof link and key-number chip → modal: proof link (http/https only), key number, notes (placeholder = the interview line) → `saveRoadmapWeek()` / `undoRoadmapWeek()`). Right: **The path** (header: shipped/11 · steps/55; the Job Copilot pitch; the 4 stages, each with its weeks as rows: status circle (✓ shipped green · this week accent · past and not shipped amber · upcoming grey), title, x/5 steps · start date; clicking a week shows it in the week card) above **AI topic mastery** (each AI-engineering topic with its stage S1–S4: answered/total, average rating chip (≥7 green, ≥5 amber, else red), progress bar; sorted by stage then lowest average, this week's topics in accent, later stages dimmed; click opens Questions on that topic).
6. **Questions** `lg:grid-cols-[1fr_340px]` — Sprint (header: answered today · planned minutes · questions · ≈ hours to complete; category chips with today's answers · planned minutes (✓ green when today's block is done — the same done state as the Today timeline, from focus time or answers), topic select, then `xl:grid-cols-[272px_1fr]`: scrollable question list | answer panel — question, answer, key points / link · 🎙 Speak + word count, structured AI review card (Answer follow-up → nested answer box + review), model answer panel (streams in, with Stop / Retry), Answer / Hide answer · Review → Next; below `xl` list and panel alternate with "← All questions") + Coverage (seen/total · % · green gain from new questions today · ≈ hours to complete per category; header: overall % in accent + green "+x% today" + total, with an overall accent bar on top) Each question has a Learn bar under its title: its topics with links that open in a new tab.
7. **Mock Round** — format picker (6) + Mock Interview Calendar; running round (progress, countdown, answer, 🎙 Speak + word count, Skip/Next); round detail (review box, every question with rating + note; your answers only right after the round)
8. **Story Bank** — competency coverage → `lg:grid-cols-2`: Rehearse (prompt + shuffle, linked story, answer, 🎙 Speak + word count, Get feedback, review card; Recent rehearsals: expandable rows with rating chip → prompt, answer, review card, Retry this prompt) + Stories; story modal

## Finance (`/finance`)

1. Header — "💰 On pace to save X%" chip + 3-month average chip
2. Over-budget banner (conditional)
3. Stat tiles (4) — Monthly Salary (masked, inline edit, last raise), Portfolio, Total Debt, **Runway** (months, inline-edit liquid savings)
4. Tabs: **Expenses** (By Category with stats row + suggestions | Just Added, `lg:grid-cols-2`) · **Portfolio** (Loans | Investments | Financial Goals, `lg:grid-cols-3 items-start`) · **History** (Spending History bars + pie)
5. Money Advisor in the header; add modals for expense / loan / investment / goal

## Health (`/health`)

1. Header — Health Score chip (or yesterday's / nothing logged) + workout status chip
2. Profile setup banner (no profile yet)
3. Today's metrics — 4 editable tiles
4. **Daily Workout** + **Health Score** hero `lg:grid-cols-2` (activity-level notice at the bottom of the hero)
5. Targets row (4) — BMI, Calorie Target, Protein Target, Workouts / Week (4 wk)
6. **Weight Trend** + **Today's Food** `lg:grid-cols-2 items-start`
7. **Workout Calendar**
8. Health Coach in the header

## Astrology (`/astrology`)

1. Header + EN/हिं pill
2. **Birth Details** (inline grid, one save)
3. **Current Dasha** strip (Vimshottari + Yogini)
4. **Your Characteristics** (collapsed `<details>`; Load button in Interview War Mode)
5. **Natal Chart** (D1/D9 kundli) + **Horoscope** (Today / Month / Year) and **Remediation** `lg:grid-cols-[minmax(280px,380px)_1fr]`

## Settings (`/settings`)

1. **Account** — email · Export as JSON · Sign out
2. **AI Budget** (plan-style card with "% left" meters) + **System Health** (status tiles) `lg:grid-cols-2`
3. **Reminders** — list + New Reminder modal

## Docs (`/docs`, public)

1. Header — "V" logo + "Personal OS docs" (→ `/docs`) · GitHub ↗
2. `md:grid-cols-[180px_1fr]`: **page nav** (`DocsNav`: Overview · Architecture · AI Gateway · Self-hosting; a sticky sidebar on desktop, a scrollable pill row on phones; the current page accent-filled) + **content**
3. Content `lg:grid-cols-[1fr_190px]`: the page as a card (Architecture adds the request-flow diagram under its title; "Rendered from {file} — edit it on GitHub" at the bottom) + an **On this page** list of its `##` headings (desktop `lg` only)

