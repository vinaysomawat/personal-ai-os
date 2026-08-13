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
  panchang: 'आज का पंचांग',
  tithi: 'तिथि',
  nakshatraOfDay: 'नक्षत्र',
  yoga: 'योग',
  karana: 'करण',
  sunrise: 'सूर्योदय',
  sunset: 'सूर्यास्त',
  rahuKalam: 'राहु काल',
  yamaganda: 'यमगंड',
  gulikaKalam: 'गुलिक काल',
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
  transitingIn: 'गोचर',
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

// Panchang vocabulary that isn't already a Planet/Rashi/Nakshatra name —
// tithi/yoga/karana each have their own fixed 30/27/11-item Sanskrit lists.
export const TITHI_HI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी',
  Shashthi: 'षष्ठी', Saptami: 'सप्तमी', Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी',
  Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी', Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी',
  Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
}

export const YOGA_HI: Record<string, string> = {
  Vishkambha: 'विष्कुम्भ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन',
  Atiganda: 'अतिगण्ड', Sukarma: 'सुकर्मा', Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गण्ड', Vriddhi: 'वृद्धि',
  Dhruva: 'ध्रुव', Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र', Siddhi: 'सिद्धि', Vyatipata: 'व्यतीपात',
  Variyana: 'वरीयान्', Parigha: 'परिघ', Shiva: 'शिव', Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ',
  Shukla: 'शुक्ल', Brahma: 'ब्रह्म', Indra: 'इन्द्र', Vaidhriti: 'वैधृति',
}

export const KARANA_HI: Record<string, string> = {
  Kimstughna: 'किंस्तुघ्न', Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल',
  Garija: 'गरज', Vanija: 'वणिज', Vishti: 'विष्टि', Shakuni: 'शकुनि', Chatushpada: 'चतुष्पाद', Naga: 'नाग',
}

export const PAKSHA_HI: Record<string, string> = { Shukla: 'शुक्ल पक्ष', Krishna: 'कृष्ण पक्ष' }
