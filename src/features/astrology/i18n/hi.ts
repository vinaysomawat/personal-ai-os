import type { Nakshatra, Planet, Rashi, Yogini } from '../types'

// Flat dictionary, not a full i18n library (next-intl/i18next) — one
// module's worth of static strings doesn't justify that dependency weight
// (astrology.md 3.6). Revisit only if Hindi support later expands beyond
// this module. Planet/rashi/nakshatra/yogini names are standard Devanagari
// transliterations a Hindi-reading user actually expects from Vedic terms
// (मंगल for Mars), not machine-translated dictionary words.

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
  gochara: 'गोचर',
  characteristics: 'आपकी विशेषताएँ',
  favorableFor: 'अनुकूल',
  avoid: 'बचें',
  moodForecast: 'मनोदशा पूर्वानुमान',
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
