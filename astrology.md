# Change: New Module — Astrology (Vedic Horoscope)

## Context

A new module giving daily/monthly/yearly Vedic horoscope readings, predictions, and
remediation suggestions, computed from a real natal chart (birth date, time, place).

This is architecturally different from every other module in one important way: **the core
output (planetary positions, houses, dasha periods) must come from real astronomical
calculation, never from AI.** Per Product Principle 2 ("rule engine before AI"), Claude's role
here is strictly narration/interpretation of deterministically-computed data — the same
boundary Finance's `computePurchaseScenario()` or Health's `calculateDailyTargets()` already
enforce. An AI asked to "generate a horoscope" from scratch would hallucinate planetary
positions; that's not acceptable for something presented as a real chart.

## Scope

**In scope (phased — see Implementation phases below):**
- One-time natal chart calculation from birth date/time/place (Lagna/ascendant, planetary
  positions in Vedic rashis, nakshatra + pada per planet, North Indian chart layout)
- **Vimshottari Dasha** as the primary/default dasha system (120-year cycle, most widely used
  for general predictions)
- **Yogini Dasha** as a second system, added right after Vimshottari is working — a shorter
  36-year cycle keyed off the Moon's nakshatra, commonly used for quicker/near-term checks
  alongside Vimshottari rather than replacing it
- Daily / Monthly / Yearly horoscope readings, each combining deterministic transit
  calculation (current planetary positions relative to the natal chart) with one AI-narrated
  interpretation
- Remediation suggestions, sourced from a curated deterministic reference table, narrated
  by AI — not AI-invented remedies
- A visual chart display (North Indian style kundli diagram)

**Out of scope for this pass:**
- Compatibility/matching charts (kundli milan) — separate feature, not requested
- Muhurta (auspicious timing) lookups — separate feature
- Prescriptive gemstone/expensive-ritual recommendations without clear caveats (see Notes
  below on responsible scope for remediation content)

## Architecture

### Calculation engine (deterministic, no AI)

Use a local ephemeris library rather than a third-party API, per your stated preference —
no recurring API cost, no external data sharing, chart math happens entirely in your own
deployment.

- **Recommended library**: `swisseph` (Node bindings to the Swiss Ephemeris C library — the
  same astronomical engine most professional astrology software uses) for raw planetary
  positions. Alternative if `swisseph`'s native bindings are painful in your Vercel deploy
  target: a pure-JS ephemeris package (evaluate `astronomia` or similar) — flag this as a
  spike/research task before committing, since native bindings can be finicky on serverless.
- **Sidereal correction**: Vedic astrology uses the sidereal zodiac, not the tropical zodiac
  most Western astrology software defaults to. Apply the Lahiri ayanamsa correction (the
  standard used by most Indian astrology software/panchang) to every planetary longitude
  before deriving rashi/nakshatra — this is the single most important correctness detail in
  the whole module; getting it wrong silently produces a Western-style chart mislabeled as
  Vedic.
- **Derived values** (`astrology/chart-calculations.ts`, pure functions, no AI, same pattern
  as Health's `calculations.ts`):
  - Rashi (sign) + degree per planet, from sidereal longitude
  - Nakshatra + pada per planet (27 nakshatras × 4 padas, a fixed lookup over the sidereal
    longitude range)
  - Lagna (ascendant) from birth time + place (requires accurate lat/long and timezone —
    get these right or the whole chart's house placements are wrong)
  - House placement of each planet (whole-sign houses is the standard/simplest Vedic system —
    use that rather than a more complex house system unless you have a specific reason not to)
  - **Vimshottari Dasha timeline** (primary/default system) — a deterministic 120-year cycle
    keyed off the Moon's nakshatra at birth; compute the full sequence of
    Mahadasha/Antardasha periods once and store it, since it never changes after birth. Build
    and validate this first — it's the system every reading defaults to.
  - **Yogini Dasha timeline** (second system, add once Vimshottari is validated) — a shorter
    36-year cycle, also keyed off the Moon's nakshatra at birth but with a different
    period-assignment table. Store alongside the Vimshottari timeline in the same
    `natal_chart` jsonb rather than a separate table, since both are static once computed and
    both key off the same birth nakshatra.

### Data storage

New table, `astrology_profile` (one row per user, same single-row-per-user pattern as
`career_profile`/`finance_profile`/`health_profile`):
- `birth_date`, `birth_time`, `birth_place_name`, `birth_lat`, `birth_lng`, `birth_timezone`
- `natal_chart` (jsonb) — the fully computed chart: planet positions, houses, nakshatras,
  full dasha timeline. Computed once on profile save, re-computed only if birth details are
  edited.

**Privacy note**: birth date/time/place is sensitive personal data. Standard RLS
(`user_id`-scoped, 4 policies) applies same as every other table — no special handling needed
beyond what the app already does everywhere else, but worth being deliberate that this table
holds more identifying information than most others in the schema.

### AI Gateway integration

New task: `astrology_reading` (Sonnet — this is interpretive/narrative work, same tier as
Career Mentor or Health Coach). Takes a period (`daily`/`monthly`/`yearly`), the natal chart,
and the current transit positions for that period (computed deterministically, passed in as
context — the AI never computes positions, only interprets already-computed ones, same
anti-hallucination stance as `recommend_coding_questions` never inventing a question outside
its candidate list).

- **Caching**: `daily` readings cache until end of day; `monthly` until end of month;
  `yearly` until end of year — same "cache until the underlying period changes" logic already
  used elsewhere (e.g. `evening_reflection`'s 6h TTL), just period-scoped instead of
  time-scoped. Two calls for the same natal chart + period + transit data are byte-identical,
  so this avoids real repeat cost.
- **Remediation**: prompt is grounded in a curated `astrology_remedies` reference (deterministic
  lookup table — traditional remedial measures keyed by planetary affliction pattern, e.g.
  weak/afflicted Saturn → standard remedies), not left to the model to invent. Frame output as
  general traditional guidance, not medical/financial/legal advice — avoid the AI suggesting
  specific costly purchases (gemstones, etc.) without clearly caveating that these are
  traditional practices, not something the app is asserting as necessary.

### UI

New module page `/astrology`, added to `TopNav`'s flat nav row (8th item) — or, given it
doesn't map to the existing Learn/Build/Perform/Recover pillars from earlier PRD thinking,
treat it as ungrouped the same way Finance is currently ungrouped in nav.

- **Natal chart card** — a kundli diagram in **North Indian style** (fixed diamond/square
  layout with houses in fixed positions, rashi numbers marked per house, planets placed by
  house) rendered as SVG, each house showing its occupying planets by standard abbreviation.
- **Today's Horoscope / This Month / This Year** — three cards or a tabbed view (reuse the
  existing pill-tab pattern from Money Advisor/Health Coach's multi-tab advisors), each
  showing the AI-narrated reading for that period.
- **Current Dasha** — a small always-visible strip showing the currently-active
  Vimshottari Mahadasha/Antardasha (e.g. "Venus Mahadasha / Mercury Antardasha, until
  [date]") as the primary display, with the current Yogini period shown as a secondary
  line once that system is built (Phase 5 below) — this is the single most load-bearing
  piece of context in Vedic prediction, worth surfacing prominently rather than burying it
  in the full chart.
- **Remediation** — a card listing current applicable remedies from the curated reference,
  narrated in plain language.

### Optional: Telegram bot

If you want a per-module bot (matching every other module's pattern): a daily cron
(`astrology-daily`, same slot pattern as `health-tip`/`learning-tip`) sending that day's
reading each morning. Lower priority than the web UI — build this only after the core chart
+ readings are working and you've confirmed you actually want a daily push.

## Implementation phases (recommend building in this order)

1. **Spike**: get `swisseph` (or chosen alternative) working in your dev environment,
   producing correct sidereal planetary positions for a known reference chart you can verify
   by hand against existing astrology software — do this before writing any app code, since
   an incorrect ephemeris silently produces a wrong chart with no obvious symptom.
2. **Natal chart**: birth-details form → `astrology_profile` table → one-time chart
   calculation → North Indian style chart display (no AI yet, no horoscope readings yet —
   just prove the chart itself is correct).
3. **Vimshottari Dasha**: compute and validate the full Mahadasha/Antardasha timeline against
   a known reference chart before moving on — this is the default system every reading will
   lean on, so it needs to be right before anything else builds on top of it.
4. **Daily horoscope**: transit calculation for "today" + `astrology_reading` AI task +
   caching, using Vimshottari as the active-period context. Validate the whole pipeline end
   to end on the smallest period before building monthly/yearly.
5. **Monthly + yearly horoscope**: same pipeline, different transit window and cache TTL.
6. **Yogini Dasha**: add the 36-year cycle calculation alongside Vimshottari in the same
   `natal_chart` structure, surface it as the secondary line in the Current Dasha strip, and
   let readings optionally reference it for near-term/quick-check context alongside the
   primary Vimshottari period.
7. **Remediation**: curated reference table + AI narration.
8. **Telegram bot** (optional, if still wanted after the above are live and used for a few
   weeks).

## Acceptance criteria

- [ ] Natal chart's planetary positions are sidereal (Lahiri ayanamsa), not tropical —
      spot-checked against a known reference before trusting the pipeline.
- [ ] Lagna (ascendant) calculation correctly accounts for birth time + place + timezone.
- [ ] Chart displays in North Indian (fixed house position) style.
- [ ] Vimshottari Dasha timeline is computed once at profile save, validated against a known
      reference, and doesn't silently recompute/drift on every page load.
- [ ] Vimshottari is the default/primary system referenced by daily/monthly/yearly readings;
      Yogini (once built) is presented as supplementary, not a replacement.
- [ ] Yogini Dasha timeline is computed and stored the same way as Vimshottari, keyed off the
      same birth nakshatra, and validated against a known reference before trusting it.
- [ ] `astrology_reading` never receives raw birth data in its prompt beyond what's needed for
      that specific reading — pass computed positions/dasha state, not the ephemeris
      calculation itself, to keep the AI strictly in an interpretive role.
- [ ] Remediation suggestions trace back to the curated reference table, not free AI
      invention — same anti-hallucination discipline as every other module's recommender.
- [ ] Daily/monthly/yearly readings are cached for their full period, not recomputed on every
      page load.

## Open questions for you before implementation starts

- Want the Telegram bot in the first pass, or web-only until the core module proves useful?
- Any dasha system beyond Vimshottari + Yogini worth supporting later (Ashtottari, etc.), or
  are these two sufficient for now?