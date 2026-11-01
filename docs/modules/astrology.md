# Astrology (`/astrology`)

Vedic (sidereal) astrology. Charts are real astronomical calculation — Claude only narrates computed positions. Reached via the profile menu and the mobile More sheet. **Paused in Interview War Mode**: the daily push stops and Characteristics needs a Load click.

- **Ephemeris** (`ephemeris.ts`): `swisseph-wasm` (Swiss Ephemeris as WebAssembly — no native binding), Lahiri ayanamsa. `next.config.ts` bundles its wasm files for the route (`outputFileTracingIncludes`, `serverExternalPackages`).
- **Natal chart** (`chart-calculations.ts`, computed once at save into `astrology_profile.natal_chart`): rashi, nakshatra + pada, whole-sign houses from the Lagna, **Vimshottari Dasha** (Mahadasha + Antardasha), **Yogini Dasha** (`(nakshatra + 3) mod 8`), **Navamsa (D9)**. Rendered as a North Indian SVG kundli with a D1/D9 toggle.
- **Horoscope** — Today / This Month / This Year (`astrology_reading`, Haiku 5.5; cached until the period ends). Today is structured: one-line summary, Favorable For, Avoid, Mood Forecast (+ Chandrashtama warning). Prompt context: dasha + **Gochara** (`gochara.ts`, transits by house from Lagna and Moon) + D9.
- **Characteristics** — a one-time narrative (`astrology_characteristics`, 1-year cache).
- **Remediation** — up to 3 templated remedies (`remedies.ts`, not AI) for Saturn/Rahu/Ketu/Mars/Moon placements.
- **Panchang** (`panchang.ts`, cached per date in `panchang_daily`): tithi/paksha, nakshatra, yoga, karana, sunrise/sunset, Rahu Kalam / Yamaganda / Gulika windows, Choghadiya. Used by the Telegram bot and the daily push (no web card).
- **EN/हिं toggle** (localStorage `astrology-lang`; `i18n/hi.ts`); the Telegram bot and push always reply in Hindi.
