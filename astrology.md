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

## Full data model

| Table | Key columns |
|---|---|
| `astrology_profile` | one row/user — `birth_date`, `birth_time`, `birth_place_name`, `birth_lat`, `birth_lng`, `birth_timezone`, `natal_chart` (jsonb: D1 positions/houses/nakshatras, Vimshottari timeline, Yogini timeline once built, Navamsa chart once built) |
| `panchang_daily` | date, tithi, nakshatra, yoga, karana, sunrise, sunset, rahu_kalam_start/end, yamaganda_start/end, gulika_kalam_start/end — global, no `user_id` |

## AI Gateway

One task throughout: `astrology_reading` (Sonnet). Takes period + language + already-computed
context (dasha state, gochara transits, navamsa placements as they come online) — never
computes positions itself. Cached per period + language, TTL scoped to the period (daily
until end of day, monthly until end of month, yearly until end of year).

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
3. Current Dasha strip — Vimshottari primary, Yogini secondary
4. Today's Panchang card
5. Daily / Monthly / Yearly reading tabs (reusing the existing pill-tab pattern from Money
   Advisor/Health Coach)
6. Remediation card
7. EN/हिं language toggle

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
- [ ] Hindi toggle translates all static chrome via the local dictionary; new readings are
      requested in Hindi directly, not machine-translated after generation
- [ ] Hindi and English readings for the same period cache independently
- [ ] Planet/nakshatra/house names in Hindi mode use standard Devanagari transliterations
- [ ] `astrology_reading` never receives raw birth data beyond what's needed for that specific
      reading — computed positions/dasha state only, keeping the AI strictly interpretive
- [ ] Remediation suggestions trace back to the curated reference table, never free AI
      invention

## Explicitly out of scope

Compatibility/matching charts (kundli milan) and Muhurta (auspicious-timing lookups for
specific events) — neither selected in this round. Revisit only if a specific need comes up.