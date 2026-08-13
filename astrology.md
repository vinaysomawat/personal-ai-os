# Personal OS — Astrology Module: Full Scope

Single consolidated spec — supersedes the earlier two-part `CHANGES-astrology-module.md`
(fundamentals + scope increase). This is the complete picture: what's already built, what's
being added, and the ground rules that apply throughout.

## Ground rules (apply to every phase below)

This module is architecturally different from every other module in one important way: **the
core output (planetary positions, houses, dasha periods, panchang, divisional charts) must
come from real astronomical calculation, never from AI.** Per Product Principle 2 ("rule
engine before AI"), Claude's role is strictly narration/interpretation of deterministically-
computed data — the same boundary Finance's `computePurchaseScenario()` or Health's
`calculateDailyTargets()` already enforce elsewhere in the app. An AI asked to "generate a
horoscope" from scratch would hallucinate planetary positions; that's not acceptable for
something presented as a real chart.

**Privacy**: birth date/time/place is more identifying than most data elsewhere in this app.
Standard RLS (`user_id`-scoped, 4 policies) applies same as every other table — no special
handling needed beyond what the app already does everywhere, but worth being deliberate that
this table holds more sensitive personal data than most.

---

## Part 1 — Fundamentals (status: complete)

- Ephemeris spike validated (planetary position calculation engine confirmed correct against
  a known reference chart)
- Natal chart calculation working: sidereal positions via Lahiri ayanamsa correction, Lagna
  (ascendant) from birth time/place/timezone, rashi + nakshatra + pada per planet, whole-sign
  house placement
- **North Indian style** chart display (fixed diamond/square layout, houses in fixed
  positions, rashi numbers marked per house)
- **Vimshottari Dasha** — the primary/default dasha system — full Mahadasha/Antardasha
  timeline computed once at profile save and validated against a known reference
- Data model: `astrology_profile` (one row/user — `birth_date`, `birth_time`,
  `birth_place_name`, `birth_lat`, `birth_lng`, `birth_timezone`, `natal_chart` jsonb holding
  the full computed chart)
- AI Gateway task `astrology_reading` (Sonnet) established, taking a period
  (`daily`/`monthly`/`yearly`) plus already-computed chart/transit context — never computing
  positions itself

## Part 2 — Yogini Dasha (status: next up per original sequencing)

Second dasha system, added alongside Vimshottari rather than replacing it — commonly used
for quicker/near-term checks.

- 36-year cycle, also keyed off the Moon's natal nakshatra, different period-assignment table
  than Vimshottari
- Stored in the same `natal_chart` jsonb alongside the Vimshottari timeline (both static once
  computed, both keyed off the same birth nakshatra — no separate table needed)
- Validated against a known reference chart before trusting it, same bar as Vimshottari
- UI: Current Dasha strip shows Vimshottari Mahadasha/Antardasha as the primary line, Yogini
  period as a secondary line beneath it — supplementary, not a replacement for the primary
  display

## Part 3 — Scope increase (this round)

Six items plus a Hindi language toggle, in recommended build order. Every new calculation
below is deterministic, never AI — same ground rule as Part 1.

### 3.1 Panchang engine (foundational — build first among these)

The daily Hindu calendar: tithi, nakshatra-of-the-day (distinct from natal nakshatra), yoga,
karana, sunrise/sunset, and inauspicious windows (Rahu Kalam, Yamaganda, Gulika Kalam).
Global/calendar-wide, no birth data required — computed from the same ephemeris engine
already in place.

- New table `panchang_daily` (no `user_id`, global pool — same pattern as `coding_questions`/
  `workout_library`): `date`, `tithi`, `nakshatra`, `yoga`, `karana`, `sunrise`, `sunset`,
  `rahu_kalam_start/end`, `yamaganda_start/end`, `gulika_kalam_start/end`. Computed once per
  day, idempotent, reused everywhere "today's panchang" is needed rather than recomputed per
  request.
- **Today's Panchang** card on the Astrology page — foundational because Dashboard
  integration, the Telegram push, and richer daily readings all depend on this data existing.
- Location-dependent (sunrise/sunset/kalam windows shift by location) — defaults to the birth
  place's coordinates unless a separate "current location" setting is added; flag this as a
  decision point if you're not usually in your birth city.

### 3.2 Gochara (transit) analysis

Current planetary positions relative to the **natal** chart — the standard companion to dasha
for prediction (dasha says *which* life theme is active, gochara says *how* current sky
conditions affect it).

- `astrology/gochara.ts` (deterministic): for each planet's current sidereal position,
  compute house-from-Moon and house-from-Lagna relative to the natal chart. A simple first
  pass surfaces all current transits with house placement; Ashtakavarga-based transit
  significance scoring is a reasonable **later** addition, not required here.
- **Moon transit specifically** gets one dedicated deterministic flag: `isChandrashtama` —
  true when the transiting Moon sits in the 8th house from the natal Moon, a well-defined
  traditional rule-of-thumb marking an emotionally lower/more cautious day. This, plus the
  transiting Moon's current house-from-natal-Moon generally, is the concrete astronomical
  basis the mood forecast (§3.7) is built from — not an AI guess.
- Feeds directly into `astrology_reading`'s existing prompt context alongside the active
  dasha period — no new AI task, just richer context into the one that already exists.

### 3.3 Navamsa (D9) divisional chart

A second chart derived mathematically from the natal (Rashi/D1) chart via a fixed divisional
formula — traditionally used for marriage/dharma strength and confirming a planet's "real"
strength beyond its D1 placement.

- Pure function over already-computed D1 positions (`astrology/navamsa.ts`) — no new
  ephemeris calls. Computed once at profile save (or lazily on first view), cached in
  `natal_chart` jsonb.
- Second chart card, same North Indian visual style as D1, a toggle/tab between "Rashi (D1)"
  and "Navamsa (D9)" rather than two permanently-stacked diagrams.
- Feeds into `astrology_reading`'s context too, same pattern as Gochara.

### 3.4 Dashboard integration

This module doesn't map to the existing Learn/Build/Perform/Recover pillar grouping — treat
it as ungrouped in nav (same as Finance) with its own small Dashboard presence.

- **Today's Dasha + Panchang strip** — current Vimshottari Mahadasha/Antardasha (primary) +
  Yogini period (secondary) + today's tithi/nakshatra. Pure data display, no AI, reuses
  already-computed values — same "cheap to add, no new query" pattern as Quick Stats.
- Optional, lower priority: fold a one-line Gochara flag into Needs Attention/Today's Focus
  via the existing shared `src/lib/signals.ts` `rankSignals()` layer — the same pattern every
  other module's `signals.ts` already uses, not a parallel mechanism.

### 3.5 Telegram bot

New bot (`TELEGRAM_BOT_TOKEN_ASTROLOGY`), same webhook pattern as every other module.

- **Daily cron** (`astrology-daily`, alongside the existing ~8:30-9:15am IST cluster): sends
  the day's Panchang summary + daily `astrology_reading`. Idempotent per day.
- Read commands: "today's reading", "this month's reading", "current dasha", "today's
  panchang". This module's data is read-mostly (no logging/CRUD equivalent to expenses or
  tasks), so the bot is simpler than most — mostly a push + read commands, no add/undo
  surface needed unless Outcome Journal feedback gets a Telegram path too.

### 3.6 Hindi language toggle

Scoped to this module for now — the same pattern could extend app-wide later, but isn't
assumed here.

- **Toggle**: small EN/हिं button, same visual treatment and `localStorage`-persisted pattern
  as the existing theme toggle — no DB column or new settings UI needed.
- **Static UI chrome**: a lightweight local dictionary (`src/features/astrology/i18n/hi.ts`,
  flat `{ key: string }` map) rather than a full i18n library (`next-intl`/`i18next`) — one
  module's worth of static strings doesn't justify that dependency weight. Revisit only if
  Hindi support later expands beyond this module.
- **Planet/nakshatra/house names**: standard Devanagari transliterations (मंगल for Mars, गुरु
  for Jupiter), not literal dictionary translations — matches what a Hindi-reading user
  actually expects from Vedic terms.
- **Dynamic AI content** (readings, remediation narration): a `language` param (`en`/`hi`) on
  `astrology_reading`'s prompt generates natively in Hindi — not a separate translation call
  after the fact, which would double the AI cost per reading for no benefit.
- **Caching**: the language instruction becomes part of the prompt, so `ai_cache`'s existing
  `sha256(model::system::prompt)` key naturally produces distinct cache entries per language
  with no extra code — both languages cache independently per period.
- **Telegram**: if extended to the bot later, the same `language` param threads through the
  same `astrology_reading` call — no separate mechanism needed.

---

### 3.7 Mood forecast (astrology-derived, not self-reported)

Not a check-in — you don't log anything here. This answers "how will my mood tend to run
today" purely from the day's computed astrological context, the same way the daily reading
answers "what's favorable/what to avoid."

- No new table, no new AI task. `moodForecast` becomes one more field in the existing
  structured daily reading output (see §3.9's `{summary, favorableFor, avoid, remediation}` —
  add `moodForecast: string` there), generated from the same call, same cache window.
- **Deterministic basis**: the transiting Moon's house-from-natal-Moon and the
  `isChandrashtama` flag (§3.2) are the concrete traditional inputs — the Moon governs mind/
  mood in Vedic astrology, so its current transit relative to your natal Moon is the real
  astronomical anchor for this, not an AI invention. The active dasha period and today's tithi
  (from Panchang) add secondary context.
- **Framing**: presented explicitly as traditional astrological interpretation/reflection, not
  a clinical or diagnostic claim about your actual emotional state — keep the tone
  constructive and even-handed (e.g. "a good day to slow down and avoid snap decisions" rather
  than alarmist predictions). This should never read as the app asserting something about how
  you *actually* feel — it's a traditional-practice forecast you can take or leave, same
  spirit as the remediation content's framing.

### 3.8 Characteristics / personality profile

A one-time narrative describing your characteristics/tendencies as read from the natal chart —
Lagna (ascendant) qualities, Moon sign (mind/emotional nature), strong and weak planetary
placements, nakshatra qualities. This is a stable read (doesn't change day to day, unlike the
daily/monthly/yearly readings), so it's built and cached differently from those.

- New AI Gateway task `astrology_characteristics` (Sonnet), fed the natal chart, Navamsa (once
  built), and planetary strength/dignity data — narrates traits/tendencies, strengths, and
  areas of caution in plain language, grounded only in the computed chart data (same
  anti-hallucination stance as every other narrative task in the app).
- **Caching**: this only needs to regenerate when the natal chart itself changes (i.e. birth
  details are edited) — there's no calendar-boundary expiry the way daily/monthly/yearly
  readings have. Effectively long-lived by default since the prompt only changes when its
  input (the chart) changes; no special TTL logic needed beyond the existing
  `sha256(model::system::prompt)` cache key naturally producing a fresh entry only when the
  chart data in the prompt actually differs.
- Displayed as a "Your Characteristics" card, separate from the daily/monthly/yearly reading
  tabs — this is who-you-are context, not a forecast.

### 3.9 Daily productivity layer

The concrete productivity-boosting piece: today's astrological context turned into an
actionable checklist rather than only prose to read.

- **Structured daily reading output** — change `astrology_reading`'s response shape for the
  `daily` period from one prose block into strict JSON: `{summary, favorableFor: string[],
  avoid: string[], remediation: string[], moodForecast: string}` (moodForecast per §3.7),
  parsed with the same regex-extract + try/catch fallback pattern `brain_decision`/
  `recommendations.ts` already use elsewhere, defaulting to a plain summary-only card on any
  parse failure rather than erroring. `favorableFor`/`avoid` are short actionable phrases
  (e.g. "good day for financial decisions," "avoid signing new agreements") grounded in the
  day's dasha + gochara + panchang context — monthly/yearly periods can stay prose-only, since
  "avoid X today" doesn't translate to a month/year scale the same way (mood forecast is also
  daily-only for the same reason — a "mood for the month" isn't a meaningful traditional
  reading the way a day's Moon transit is).
- **Choghadiya** (auspicious/inauspicious time-blocks within the day, a standard practical
  layer many Vedic-astrology-aware people already use for scheduling) — extend the Panchang
  engine (3.1) with a `choghadiya` jsonb column on `panchang_daily`: the day split into 8
  labeled blocks (e.g. Amrit/Shubh/Labh as favorable, Rog/Kaal as unfavorable), computed
  deterministically from sunrise/sunset, no new AI call. Surfaced as a small time-block strip
  on the Astrology page and optionally in the Telegram daily push — this is the single most
  directly "productivity" piece of the whole module, since it's the part that could actually
  inform when you schedule something today.
- **Optional Dashboard signal**: once the structured `avoid[]` list exists, a strongly-flagged
  item (e.g. "avoid major decisions today" type content) can feed into Needs Attention via the
  existing shared `src/lib/signals.ts` `rankSignals()` layer (already noted as optional in
  §3.4) — this is what actually closes the loop from "have to remember to check the Astrology
  page" to "shows up where I already look every morning."

## Full data model

| Table | Key columns |
|---|---|
| `astrology_profile` | one row/user — `birth_date`, `birth_time`, `birth_place_name`, `birth_lat`, `birth_lng`, `birth_timezone`, `natal_chart` (jsonb: D1 positions/houses/nakshatras, Vimshottari timeline, Yogini timeline once built, Navamsa chart once built) |
| `panchang_daily` | date, tithi, nakshatra, yoga, karana, sunrise, sunset, rahu_kalam_start/end, yamaganda_start/end, gulika_kalam_start/end, choghadiya (jsonb — 8 labeled time-blocks) — global, no `user_id` |

## AI Gateway

Two tasks: `astrology_reading` (Sonnet, period+language-scoped, see cache strategy below) and
`astrology_characteristics` (Sonnet, one-time/long-lived — see §3.8). Both take
already-computed context (dasha state, gochara transits, navamsa placements, chart data) —
neither ever computes positions itself.

### Reading cache strategy (explicit per-period TTL)

Each period caches until its underlying context actually goes stale, not on a flat timer —
same principle CLAUDE.md's "minimize Anthropic API usage" guidance already applies to
`daily_briefing`/`weekly_digest`/`monthly_digest` (a 6h TTL rather than none, because a
same-day on-demand duplicate shouldn't re-spend an API call for byte-identical output). Here
the natural staleness boundary is the calendar period itself, so expiry is set to the period's
actual end rather than a fixed duration:

- **Daily** (`period: 'daily'`): `expires_at` = next midnight IST. A repeat request for
  "today's reading" — whether from the web page, a page refresh, or the Telegram bot's
  "today's reading" command — hits the cache and costs nothing, all day, until the transit
  context actually changes at the next day boundary.
- **Monthly** (`period: 'monthly'`): `expires_at` = midnight IST on the 1st of next month.
  One AI call covers the whole month's worth of repeat views/bot requests.
- **Yearly** (`period: 'yearly'`): `expires_at` = midnight IST on next Jan 1. One AI call
  covers the whole year.

Mechanically this reuses the existing `ai_cache` table and its `sha256(model::system::prompt)`
key exactly as-is — no schema change needed. Two things naturally keep the cache correct
without extra logic:
- The prompt itself changes when the underlying gochara/dasha context changes (e.g. a dasha
  transition mid-month), so even within a still-valid TTL window, a genuinely different
  prompt produces a different cache key and a fresh call — the calendar-boundary expiry is a
  ceiling, not a guarantee against earlier legitimate change.
- Language (§3.6) and period are both part of the prompt, so daily/monthly/yearly and
  English/Hindi all cache independently of each other, with no cross-contamination.

Set each `askAI()` call's `cacheTTLSeconds` dynamically per period (computed as "seconds until
the next calendar boundary" at call time) rather than a hardcoded constant like `SIX_HOURS` —
this is the one AI Gateway task in the app where the correct TTL genuinely varies per call
rather than being fixed per task, so this is a distinct pattern worth calling out; don't
copy-paste a fixed-TTL constant here as an approximation.

Remediation content is grounded in a curated deterministic reference table (traditional
remedial measures keyed by planetary affliction pattern), not left to the model to invent —
same anti-hallucination discipline as every other module's recommender (Coding's
`recommend_coding_questions` never inventing a question outside its candidate list is the
direct precedent). Frame remediation as general traditional guidance, not prescriptive
medical/financial advice — avoid the AI suggesting specific costly purchases (gemstones, etc.)
without clearly caveating that these are traditional practices.

## UI summary (Astrology page, `/astrology`)

1. Birth details form (one-time / editable) → triggers chart (re)calculation
2. Rashi (D1) / Navamsa (D9) chart card, North Indian style, tab/toggle between the two
3. **Your Characteristics** card — one-time narrative from `astrology_characteristics`
4. Current Dasha strip — Vimshottari primary, Yogini secondary
5. Today's Panchang card, including the Choghadiya time-block strip
6. Daily / Monthly / Yearly reading tabs (reusing the existing pill-tab pattern from Money
   Advisor/Health Coach) — Daily shows the structured Favorable-for / Avoid / Mood Forecast /
   Remediation breakdown; Monthly/Yearly stay prose
7. Remediation card
8. EN/हिं language toggle

Nav: ungrouped item (same tier as Finance), not folded into the Learn/Build/Perform/Recover
pillars.

## Build order (full sequence)

1. ~~Spike, natal chart, Vimshottari~~ — done (Part 1)
2. Yogini Dasha (Part 2)
3. Panchang engine (3.1)
4. Gochara analysis (3.2)
5. Navamsa D9 chart (3.3)
6. Dashboard integration (3.4)
7. Telegram bot (3.5)
8. Hindi language toggle (3.6) — can be built in parallel with any of 3–7 once the base page
   exists, since it has no dependency on Panchang/Gochara/Navamsa
9. Characteristics/personality profile (3.8) — depends only on the natal chart (Part 1),
    could actually be built earlier in the sequence if you want it sooner; placed last here
    only because it was the most recently scoped, not because it's blocked on anything above
10. Daily productivity layer — structured reading output (incl. mood forecast, §3.7) +
    Choghadiya (3.9) — Choghadiya depends on the Panchang engine (3.1) existing; the
    structured output change (including mood forecast) is a small modification to the
    existing `astrology_reading` task and has no other dependency

## Acceptance criteria

- [ ] Natal chart positions are sidereal (Lahiri ayanamsa), not tropical
- [ ] Lagna calculation correctly accounts for birth time + place + timezone
- [ ] Chart displays in North Indian (fixed house position) style
- [ ] Vimshottari is the default/primary dasha system every reading references
- [ ] Yogini timeline computed and stored the same way as Vimshottari, validated against a
      known reference, presented as supplementary not a replacement
- [ ] Panchang values validated against a known reference for a specific date; computed once
      per day and reused, not recomputed per request
- [ ] Gochara transit-vs-natal placements correct relative to both Moon and Lagna reference
      points (confirm which is the default your readings actually use)
- [ ] Navamsa mapping validated against a known reference chart's D9 positions
- [ ] Dashboard card adds no new query — reuses already-computed dasha/panchang data
- [ ] Telegram daily push idempotent per day, same as every other daily cron
- [ ] Daily readings cache until next midnight IST, monthly until the 1st of next month,
      yearly until next Jan 1 — verified via `ai_cache.expires_at` on a real generated row for
      each period, not just assumed from the code
- [ ] A repeat "today's reading" request (web reload or Telegram command) within the same day
      costs zero additional AI spend — confirm via `ai_usage_logs`' cache-hit flag
- [ ] `cacheTTLSeconds` for `astrology_reading` is computed dynamically per call (seconds to
      the next calendar boundary), not a hardcoded constant borrowed from another task
- [ ] Hindi toggle translates all static chrome via the local dictionary; new readings are
      requested in Hindi directly, not machine-translated after generation
- [ ] Hindi and English readings for the same period cache independently
- [ ] Planet/nakshatra/house names in Hindi mode use standard Devanagari transliterations
- [ ] `astrology_reading` never receives raw birth data beyond what's needed for that specific
      reading — computed positions/dasha state only, keeping the AI strictly interpretive
- [ ] Remediation suggestions trace back to the curated reference table, never free AI
      invention
- [ ] Mood forecast is derived entirely from computed astrological data (transiting Moon's
      house-from-natal-Moon, `isChandrashtama` flag, active dasha, today's tithi) — never
      self-reported and never an AI invention disconnected from that computed basis
- [ ] Mood forecast is presented as traditional astrological interpretation, not a clinical or
      diagnostic claim about your actual emotional state — tone stays constructive, not
      alarmist
- [ ] `isChandrashtama` and the transiting-Moon-from-natal-Moon calculation are validated
      against a known reference before trusting them, same bar as every other gochara output
- [ ] `astrology_characteristics` regenerates only when the natal chart's underlying birth
      details change — not on every page view
- [ ] Daily reading's structured output (`favorableFor`/`avoid`/`moodForecast`/`remediation`)
      falls back gracefully to a summary-only card on any JSON parse failure, same as
      `brain_decision`'s existing fallback pattern
- [ ] Choghadiya blocks are computed deterministically from sunrise/sunset, no AI call
      involved

## Explicitly out of scope

Compatibility/matching charts (kundli milan) and Muhurta (auspicious-timing lookups for
specific events) — neither selected in this round. Revisit only if a specific need comes up.