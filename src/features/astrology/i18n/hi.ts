import type { Nakshatra, Planet, Rashi, Yogini } from '../types'

// Flat dictionary, not a full i18n library (next-intl/i18next) — one
// module's worth of static strings doesn't justify that dependency weight
// (astrology.md 3.6). Revisit only if Hindi support later expands beyond
// this module. Planet/rashi/nakshatra/yogini names are standard Devanagari
// transliterations a Hindi-reading user actually expects from Vedic terms
// (मंगल for Mars), not machine-translated dictionary words.
//
// Server-side consumers too (2026-08-18): the Telegram astrology bot
// (`telegram/modules/astrology.ts`) and the `astrology-daily` cron always
// reply in Hindi (no per-user language setting exists, and the web page's
// own EN/हिं toggle is client-only `localStorage`, unreachable from either
// server context) — both import these same plain-data dictionaries rather
// than duplicating a second copy. `panchang`/`tithi`/`yoga`/etc. keys were
// re-added here for that reason, having been removed as web-UI-unused when
// the Panchang card left the Astrology page (2026-08-14) — they're real
// dictionary entries again, not dead weight.

export type Lang = 'en' | 'hi'

export const UI_HI: Record<string, string> = {
  subtitle: 'वैदिक ज्योतिष · जन्म कुंडली · दशा समयरेखा',
  birthDetails: 'जन्म विवरण',
  birthDate: 'जन्म तिथि',
  birthTime: 'जन्म समय',
  birthTimeLabel: 'जन्म समय (24 घं.)',
  birthPlace: 'जन्म स्थान',
  latitude: 'अक्षांश',
  longitude: 'देशांतर',
  utcOffset: 'यूटीसी ऑफ़सेट',
  save: 'सहेजें',
  cancel: 'रद्द करें',
  computingChart: 'कुंडली की गणना हो रही है…',
  currentDasha: 'वर्तमान दशा',
  until: 'तक',
  yoginiLabel: 'योगिनी',
  natalChart: 'जन्म कुंडली',
  rashiChart: 'राशि (D1)',
  navamsaChart: 'नवमांश (D9)',
  lagna: 'लग्न',
  moonNakshatra: 'चंद्र नक्षत्र',
  pada: 'पद',
  horoscope: 'राशिफल',
  today: 'आज',
  thisMonth: 'इस महीने',
  thisYear: 'इस वर्ष',
  getReading: '{period} का फल जानें',
  readingTransits: 'गोचर पढ़ा जा रहा है…',
  remediation: 'उपाय',
  remediationDisclaimer: 'पारंपरिक उपचारात्मक मार्गदर्शन है, यह चिकित्सा या वित्तीय सलाह नहीं है।',
  editBirthDetails: 'जन्म विवरण संपादित करें',
  characteristics: 'आपकी विशेषताएँ',
  favorableFor: 'अनुकूल',
  avoid: 'बचें',
  moodForecast: 'मनोदशा पूर्वानुमान',
  moodForecastDisclaimer: 'पारंपरिक ज्योतिषीय व्याख्या है, यह आपकी वास्तविक भावनाओं का विवरण नहीं है।',
  mahadasha: 'महादशा',
  antardasha: 'अंतर्दशा',
  todayReading: 'आज का फल',
  todayAstrology: 'आज की ज्योतिष',
  thisMonthReading: 'इस महीने का फल',
  thisYearReading: 'इस वर्ष का फल',
  panchang: 'आज का पंचांग',
  tithi: 'तिथि',
  paksha: 'पक्ष',
  nakshatraOfDay: 'नक्षत्र',
  yoga: 'योग',
  karana: 'करण',
  sunrise: 'सूर्योदय',
  sunset: 'सूर्यास्त',
  rahuKalam: 'राहु काल',
  yamaganda: 'यमगण्ड',
  gulikaKalam: 'गुलिक काल',
  choghadiya: 'चौघड़िया',
  choghadiyaNow: 'अभी चौघड़िया',
  choghadiyaGood: 'शुभ',
  choghadiyaNeutral: 'सामान्य',
  choghadiyaBad: 'अशुभ',
}

export const PLANET_HI: Record<Planet, string> = {
  Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'बृहस्पति',
  Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
}

// Short 1-2 char labels for the kundli chart cells — Hindi equivalent of
// the English 2-letter abbreviations (Su/Mo/Ma/...).
export const PLANET_ABBR_HI: Record<Planet, string> = {
  Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु', Jupiter: 'गु',
  Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के',
}

export const RASHI_HI: Record<Rashi, string> = {
  Mesha: 'मेष', Vrishabha: 'वृषभ', Mithuna: 'मिथुन', Karka: 'कर्क', Simha: 'सिंह', Kanya: 'कन्या',
  Tula: 'तुला', Vrishchika: 'वृश्चिक', Dhanu: 'धनु', Makara: 'मकर', Kumbha: 'कुंभ', Meena: 'मीन',
}

export const NAKSHATRA_HI: Record<Nakshatra, string> = {
  Ashwini: 'अश्विनी', Bharani: 'भरणी', Krittika: 'कृत्तिका', Rohini: 'रोहिणी', Mrigashira: 'मृगशिरा', Ardra: 'आर्द्रा',
  Punarvasu: 'पुनर्वसु', Pushya: 'पुष्य', Ashlesha: 'आश्लेषा', Magha: 'मघा', 'Purva Phalguni': 'पूर्व फाल्गुनी', 'Uttara Phalguni': 'उत्तर फाल्गुनी',
  Hasta: 'हस्त', Chitra: 'चित्रा', Swati: 'स्वाति', Vishakha: 'विशाखा', Anuradha: 'अनुराधा', Jyeshtha: 'ज्येष्ठा',
  Mula: 'मूल', 'Purva Ashadha': 'पूर्वाषाढ़ा', 'Uttara Ashadha': 'उत्तराषाढ़ा', Shravana: 'श्रवण', Dhanishta: 'धनिष्ठा', Shatabhisha: 'शतभिषा',
  'Purva Bhadrapada': 'पूर्वभाद्रपद', 'Uttara Bhadrapada': 'उत्तरभाद्रपद', Revati: 'रेवती',
}

export const YOGINI_HI: Record<Yogini, string> = {
  Mangala: 'मंगला', Pingala: 'पिंगला', Dhanya: 'धान्या', Bhramari: 'भ्रामरी',
  Bhadrika: 'भद्रिका', Ulka: 'उल्का', Siddha: 'सिद्धा', Sankata: 'संकटा',
}

// Panchang value names — same Sanskrit terms in both languages, script-only
// difference (panchang.ts's TITHI_NAMES/YOGA_NAMES/KARANA_*/DAY_CYCLE/
// NIGHT_CYCLE are the exact keys here; these functions return plain
// `string`, not a typed union, so this is a plain lookup, not a Record over
// a shared type like PLANET_HI/RASHI_HI above).
export const TITHI_HI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी',
  Panchami: 'पंचमी', Shashthi: 'षष्ठी', Saptami: 'सप्तमी', Ashtami: 'अष्टमी',
  Navami: 'नवमी', Dashami: 'दशमी', Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी',
  Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी', Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
}

export const YOGA_HI: Record<string, string> = {
  Vishkambha: 'विष्कम्भ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य',
  Shobhana: 'शोभन', Atiganda: 'अतिगण्ड', Sukarma: 'सुकर्मा', Dhriti: 'धृति',
  Shoola: 'शूल', Ganda: 'गण्ड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव',
  Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र', Siddhi: 'सिद्धि',
  Vyatipata: 'व्यतीपात', Variyana: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव',
  Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ', Shukla: 'शुक्ल',
  Brahma: 'ब्रह्म', Indra: 'इन्द्र', Vaidhriti: 'वैधृति',
}

export const KARANA_HI: Record<string, string> = {
  Kimstughna: 'किंस्तुघ्न', Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव',
  Taitila: 'तैतिल', Garija: 'गरज', Vanija: 'वणिज', Vishti: 'विष्टि',
  Shakuni: 'शकुनि', Chatushpada: 'चतुष्पाद', Naga: 'नाग',
}

export const CHOGHADIYA_NAME_HI: Record<string, string> = {
  Udveg: 'उद्वेग', Chal: 'चल', Labh: 'लाभ', Amrit: 'अमृत',
  Kaal: 'काल', Shubh: 'शुभ', Rog: 'रोग',
}

export const PAKSHA_HI: Record<string, string> = { Shukla: 'शुक्ल', Krishna: 'कृष्ण' }
