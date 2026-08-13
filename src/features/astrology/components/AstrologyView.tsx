'use client'

import { useEffect, useState } from 'react'
import { Pencil, Check, X, Languages } from 'lucide-react'
import Card from '@/components/Card'
import { upsertAstrologyProfile, getAstrologyReading, getStructuredDailyReading, getAstrologyCharacteristics, getAstrologyProfile } from '../actions'
import { getTodaysPanchang } from '../panchang-actions'
import { getCurrentDasha, getCurrentYogini } from '../chart-calculations'
import { getRemediation } from '../remedies'
import { todayIST } from '@/lib/date'
import KundliChart from './KundliChart'
import { UI_HI } from '../i18n/hi'
import type { Lang } from '../i18n/hi'
import type { AstrologyProfile, ChoghadiyaBlock, DailyReading, PanchangDaily, ReadingPeriod } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const TABS: { key: ReadingPeriod; en: string; hiKey: keyof typeof UI_HI }[] = [
  { key: 'daily', en: 'Today', hiKey: 'today' },
  { key: 'monthly', en: 'This Month', hiKey: 'thisMonth' },
  { key: 'yearly', en: 'This Year', hiKey: 'thisYear' },
]

// Persisted the same way as ThemeProvider's theme choice (localStorage key,
// read in a mount effect rather than during the initial render so the first
// client render still matches the server's English-only HTML — otherwise
// this would hit the same hydration-mismatch trap ThemeProvider's own
// comment documents). Scoped to this module only per astrology.md 3.6, not
// a global app-wide language setting.
const LANG_STORAGE_KEY = 'astrology-lang'

// key -> English fallback text, so the rest of the component can call
// t('someKey', 'English default') instead of a lang ? UI_HI.x : 'x' ternary
// at every call site.
function useAstrologyLang() {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'hi' || stored === 'en') setLang(stored)
  }, [])
  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en'
    setLang(next)
    localStorage.setItem(LANG_STORAGE_KEY, next)
  }
  const t = (key: keyof typeof UI_HI, en: string) => (lang === 'hi' ? UI_HI[key] ?? en : en)
  return { lang, toggleLang, t }
}

// Matches Career Profile's compact inline-editable field grid (same label/
// value type scale) rather than a standalone form card — birth details are
// write-once in practice, so this shouldn't dominate the page the way a
// prominent setup form would. Unlike Career's per-field ProfileField (each
// field saves independently), every field here is edited together in one
// pass: the natal chart is a function of all of them at once, so editing
// just one in isolation would leave the stored chart inconsistent with the
// rest until the others were also re-saved.
function BirthDetailsCard({ profile, onSaved, t }: { profile: AstrologyProfile | null; onSaved: () => void; t: (key: keyof typeof UI_HI, en: string) => string }) {
  const [editing, setEditing] = useState(!profile)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const birthLat = parseFloat(fd.get('birthLat') as string)
    const birthLng = parseFloat(fd.get('birthLng') as string)
    const birthTimezone = parseFloat(fd.get('birthTimezone') as string)
    if (Number.isNaN(birthLat) || Number.isNaN(birthLng) || Number.isNaN(birthTimezone)) {
      setError('Latitude, longitude, and UTC offset must all be numbers.')
      return
    }
    setSaving(true)
    try {
      await upsertAstrologyProfile({
        birthDate: fd.get('birthDate') as string,
        birthTime: fd.get('birthTime') as string,
        birthPlaceName: fd.get('birthPlaceName') as string,
        birthLat, birthLng, birthTimezone,
      })
      setEditing(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = 'bg-surface-2 border border-accent rounded px-2 py-1 text-[13.5px] text-fg-primary outline-none w-full'
  const labelClass = 'text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-[5px]'

  if (editing) {
    return (
      <Card title={t('birthDetails', 'Birth Details')} padding="p-3.5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5">
            <div><p className={labelClass}>{t('birthDate', 'Birth Date')}</p><input name="birthDate" type="date" required defaultValue={profile?.birth_date} className={fieldClass} /></div>
            <div><p className={labelClass}>{t('birthTimeLabel', 'Birth Time (24h)')}</p><input name="birthTime" type="time" required defaultValue={profile?.birth_time} className={fieldClass} /></div>
            <div><p className={labelClass}>{t('birthPlace', 'Birth Place')}</p><input name="birthPlaceName" type="text" required defaultValue={profile?.birth_place_name} placeholder="Mumbai, India" className={fieldClass} /></div>
            <div><p className={labelClass}>{t('latitude', 'Latitude')}</p><input name="birthLat" type="number" step="any" required defaultValue={profile?.birth_lat} placeholder="19.076" className={fieldClass} /></div>
            <div><p className={labelClass}>{t('longitude', 'Longitude')}</p><input name="birthLng" type="number" step="any" required defaultValue={profile?.birth_lng} placeholder="72.877" className={fieldClass} /></div>
            <div><p className={labelClass}>{t('utcOffset', 'UTC Offset')}</p><input name="birthTimezone" type="number" step="any" required defaultValue={profile?.birth_timezone} placeholder="5.5" className={fieldClass} /></div>
          </div>
          {error && <p className="text-xs text-risk">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-colors">
              <Check size={12} /> {saving ? t('computingChart', 'Computing chart…') : t('save', 'Save')}
            </button>
            {profile && (
              <button type="button" onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-fg-tertiary text-xs hover:bg-surface-2 transition-colors">
                <X size={12} /> {t('cancel', 'Cancel')}
              </button>
            )}
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card title={t('birthDetails', 'Birth Details')} padding="p-3.5" action={
      <button onClick={() => setEditing(true)} aria-label={t('editBirthDetails', 'Edit birth details')} className="text-fg-quaternary hover:text-fg-secondary transition-colors">
        <Pencil size={13} />
      </button>
    }>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5">
        <div><p className={labelClass}>{t('birthDate', 'Birth Date')}</p><p className="text-[13.5px] font-medium text-fg-primary">{profile ? formatDate(profile.birth_date) : '—'}</p></div>
        <div><p className={labelClass}>{t('birthTime', 'Birth Time')}</p><p className="text-[13.5px] font-medium text-fg-primary">{profile?.birth_time ?? '—'}</p></div>
        <div><p className={labelClass}>{t('birthPlace', 'Birth Place')}</p><p className="text-[13.5px] font-medium text-fg-primary">{profile?.birth_place_name ?? '—'}</p></div>
      </div>
    </Card>
  )
}

const CHOGHADIYA_COLOR: Record<ChoghadiyaBlock['type'], string> = {
  good: 'bg-good-soft text-good border-good',
  neutral: 'bg-surface-2 text-fg-secondary border-surface-3',
  bad: 'bg-risk-soft text-risk border-risk-border',
}

function ChoghadiyaRow({ blocks, label }: { blocks: ChoghadiyaBlock[]; label: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-fg-tertiary uppercase tracking-[0.3px] mb-1">{label}</p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {blocks.map((b, i) => (
          <div key={i} className={`shrink-0 rounded-[7px] border px-2 py-1 ${CHOGHADIYA_COLOR[b.type]}`}>
            <p className="text-[10.5px] font-semibold whitespace-nowrap">{b.name}</p>
            <p className="text-[9.5px] opacity-80 whitespace-nowrap">{b.start}–{b.end}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PanchangCard({ panchang, t }: { panchang: PanchangDaily; t: (key: keyof typeof UI_HI, en: string) => string }) {
  const windows: [string, string, string][] = [
    [t('rahuKalam', 'Rahu Kalam'), panchang.rahu_kalam_start, panchang.rahu_kalam_end],
    [t('yamaganda', 'Yamaganda'), panchang.yamaganda_start, panchang.yamaganda_end],
    [t('gulikaKalam', 'Gulika Kalam'), panchang.gulika_kalam_start, panchang.gulika_kalam_end],
  ]
  const dayBlocks = panchang.choghadiya?.filter(b => b.period === 'day') ?? []
  const nightBlocks = panchang.choghadiya?.filter(b => b.period === 'night') ?? []
  return (
    <Card title={t('panchang', "Today's Panchang")}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-3">
        <div><p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-0.5">{t('tithi', 'Tithi')}</p><p className="text-[13px] font-medium text-fg-primary">{panchang.tithi}</p></div>
        <div><p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-0.5">{t('nakshatraOfDay', 'Nakshatra')}</p><p className="text-[13px] font-medium text-fg-primary">{panchang.nakshatra}</p></div>
        <div><p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-0.5">{t('yoga', 'Yoga')}</p><p className="text-[13px] font-medium text-fg-primary">{panchang.yoga}</p></div>
        <div><p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-0.5">{t('karana', 'Karana')}</p><p className="text-[13px] font-medium text-fg-primary">{panchang.karana}</p></div>
        <div><p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-0.5">{t('sunrise', 'Sunrise')}</p><p className="text-[13px] font-medium text-fg-primary">{panchang.sunrise}</p></div>
        <div><p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-0.5">{t('sunset', 'Sunset')}</p><p className="text-[13px] font-medium text-fg-primary">{panchang.sunset}</p></div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {windows.map(([label, start, end]) => (
          <div key={label} className="bg-surface-2 rounded-[8px] px-2.5 py-1.5">
            <p className="text-[10px] font-bold text-risk uppercase tracking-[0.3px]">{label}</p>
            <p className="text-[11.5px] text-fg-secondary">{start}–{end}</p>
          </div>
        ))}
      </div>
      {(dayBlocks.length > 0 || nightBlocks.length > 0) && (
        <div className="flex flex-col gap-2 pt-2.5 border-t border-surface-3">
          <p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">{t('choghadiya', 'Choghadiya')}</p>
          {dayBlocks.length > 0 && <ChoghadiyaRow blocks={dayBlocks} label="Day" />}
          {nightBlocks.length > 0 && <ChoghadiyaRow blocks={nightBlocks} label="Night" />}
        </div>
      )}
    </Card>
  )
}

export default function AstrologyView({ initialProfile }: { initialProfile: AstrologyProfile | null }) {
  const [profile, setProfile] = useState(initialProfile)
  const [tab, setTab] = useState<ReadingPeriod>('daily')
  // Monthly/yearly stay prose (readings); daily is the structured
  // {summary, favorableFor, avoid, moodForecast, remediation} shape
  // (astrology.md 3.9) — kept in a separate state rather than shoehorned
  // into the same Partial<Record<...,string>> map.
  const [readings, setReadings] = useState<Partial<Record<'monthly' | 'yearly', string>>>({})
  const [dailyReading, setDailyReading] = useState<DailyReading | null>(null)
  const [readingLoading, setReadingLoading] = useState(false)
  const [chartMode, setChartMode] = useState<'d1' | 'd9'>('d1')
  const [panchang, setPanchang] = useState<PanchangDaily | null>(null)
  const [characteristics, setCharacteristics] = useState<string | null>(null)
  const { lang, toggleLang, t } = useAstrologyLang()

  const handleSaved = async () => {
    setProfile(await getAstrologyProfile())
    setReadings({})
    setDailyReading(null)
    setCharacteristics(null)
  }

  const loadReading = async (period: ReadingPeriod) => {
    if (!profile) return
    setReadingLoading(true)
    if (period === 'daily') {
      setDailyReading(await getStructuredDailyReading(profile, lang))
    } else {
      const text = await getAstrologyReading(profile, period, lang)
      setReadings(prev => ({ ...prev, [period]: text }))
    }
    setReadingLoading(false)
  }

  const selectTab = (period: ReadingPeriod) => {
    setTab(period)
    const loaded = period === 'daily' ? dailyReading : readings[period]
    if (!loaded) loadReading(period)
  }

  // Language change invalidates every cached reading (each language's copy
  // comes from its own AI Gateway cache entry per astrology.md 3.6) — clear
  // so switching languages re-fetches in the new one instead of showing a
  // stale English/Hindi mismatch against the tab pills.
  useEffect(() => {
    setReadings({})
    setDailyReading(null)
    setCharacteristics(null)
  }, [lang])

  // Panchang is location-dependent (sunrise/sunset/kalam windows shift by
  // place) — defaults to the profile's birth-place coordinates, the only
  // location this app currently knows about (astrology.md 3.1).
  useEffect(() => {
    if (!profile) return
    getTodaysPanchang(profile.birth_lat, profile.birth_lng, profile.birth_timezone).then(setPanchang)
  }, [profile])

  // Characteristics (astrology.md 3.8) is a stable, effectively-permanently-
  // cached read off the chart alone — auto-loaded on view rather than
  // click-to-load like the daily/monthly/yearly readings, since a repeat
  // view costs nothing once cached.
  useEffect(() => {
    if (!profile) return
    getAstrologyCharacteristics(profile, lang).then(setCharacteristics)
  }, [profile, lang])

  const today = todayIST()
  const currentDasha = profile ? getCurrentDasha(profile.natal_chart.vimshottariDasha, today) : null
  const currentYogini = profile ? getCurrentYogini(profile.natal_chart.yoginiDasha, today) : null
  const remediation = profile ? getRemediation(profile.natal_chart, 3, lang) : []
  const moon = profile?.natal_chart.planets.find(p => p.planet === 'Moon')

  const chartLagna = chartMode === 'd1' ? profile?.natal_chart.lagna.rashi : profile?.natal_chart.navamsa.lagna
  const chartPlanets = chartMode === 'd1' ? profile?.natal_chart.planets : profile?.natal_chart.navamsa.planets

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Astrology</h1>
          <p className="text-xs text-fg-tertiary mt-0.5">{t('subtitle', "Vedic horoscope · natal chart · dasha timeline")}</p>
        </div>
        <button
          onClick={toggleLang}
          aria-label={lang === 'en' ? 'Switch to Hindi' : 'Switch to English'}
          className="flex items-center gap-1.5 px-3 h-[34px] rounded-full border border-surface-3 bg-surface-1 text-fg-secondary hover:text-fg-primary transition-colors shrink-0"
        >
          <Languages size={14} />
          <span className="text-xs font-semibold">{lang === 'en' ? 'हिं' : 'EN'}</span>
        </button>
      </div>

      <BirthDetailsCard profile={profile} onSaved={handleSaved} t={t} />

      {profile && (
        <>
          {currentDasha && (
            <div className="bg-accent-soft border border-accent-border rounded-[14px] px-4 py-3 flex flex-wrap items-center gap-3.5">
              <p className="text-[10.5px] font-bold text-accent-strong uppercase tracking-[0.4px]">{t('currentDasha', 'Current Dasha')}</p>
              <p className="text-[13.5px] font-bold text-fg-primary">
                {currentDasha.mahadasha.lord} Mahadasha / {currentDasha.antardasha.lord} Antardasha
              </p>
              <p className="text-xs text-fg-secondary">{t('until', 'until')} {formatDate(currentDasha.antardasha.endDate)}</p>
              {currentYogini && (
                <p className="text-[11.5px] text-fg-tertiary ml-auto">
                  {t('yoginiLabel', 'Yogini')}: {currentYogini.lord}, {t('until', 'until')} {formatDate(currentYogini.endDate)}
                </p>
              )}
            </div>
          )}

          {characteristics && (
            <Card title={t('characteristics', 'Your Characteristics')}>
              <p className="text-[12.5px] leading-[1.6] text-fg-secondary">{characteristics}</p>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-[var(--grid-gap)] items-start">
            <Card title={t('natalChart', 'Natal Chart')}>
              <div className="flex border-b border-surface-3 mb-3">
                {(['d1', 'd9'] as const).map(mode => (
                  <button key={mode} onClick={() => setChartMode(mode)}
                    className={`px-3 py-1.5 text-[12px] font-semibold border-b-2 -mb-px transition-colors ${
                      chartMode === mode ? 'text-accent border-accent' : 'text-fg-tertiary border-transparent hover:text-fg-secondary'
                    }`}>
                    {mode === 'd1' ? t('rashiChart', 'Rashi (D1)') : t('navamsaChart', 'Navamsa (D9)')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-fg-tertiary mb-3">
                {formatDate(profile.birth_date)} · {profile.birth_time} (UTC{profile.birth_timezone >= 0 ? '+' : ''}{profile.birth_timezone}) · {profile.birth_place_name}
              </p>
              {chartLagna && chartPlanets && (
                <KundliChart lagnaRashi={chartLagna} planets={chartPlanets} lang={lang} />
              )}
              {moon && (
                <p className="text-[10.5px] text-fg-tertiary text-center mt-3">
                  {t('lagna', 'Lagna')}: {profile.natal_chart.lagna.rashi} · {t('moonNakshatra', 'Moon Nakshatra')}: {moon.nakshatra}, {t('pada', 'Pada')} {moon.nakshatraPada}
                </p>
              )}
            </Card>

            <div className="flex flex-col gap-[var(--grid-gap)]">
              {panchang && <PanchangCard panchang={panchang} t={t} />}

              <Card title={t('horoscope', 'Horoscope')}>
                <div className="flex border-b border-surface-3 mb-3">
                  {TABS.map(tb => (
                    <button key={tb.key} onClick={() => selectTab(tb.key)}
                      className={`px-3 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${
                        tab === tb.key ? 'text-accent border-accent' : 'text-fg-tertiary border-transparent hover:text-fg-secondary'
                      }`}>
                      {t(tb.hiKey, tb.en)}
                    </button>
                  ))}
                </div>
                {(() => {
                  const loaded = tab === 'daily' ? dailyReading : readings[tab]
                  if (readingLoading && !loaded) return <p className="text-sm text-fg-tertiary">{t('readingTransits', 'Reading the transits…')}</p>
                  if (!readingLoading && !loaded) {
                    return (
                      <button onClick={() => loadReading(tab)}
                        className="px-4 py-2 rounded-[8px] bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
                        {lang === 'hi'
                          ? UI_HI.getReading.replace('{period}', t(TABS.find(tb => tb.key === tab)!.hiKey, ''))
                          : `Get ${TABS.find(tb => tb.key === tab)?.en} Reading`}
                      </button>
                    )
                  }
                  if (tab === 'daily' && dailyReading) {
                    return (
                      <div className="flex flex-col gap-3">
                        <p className="text-[12.5px] leading-[1.6] text-fg-secondary">{dailyReading.summary}</p>
                        {dailyReading.favorableFor.length > 0 && (
                          <div>
                            <p className="text-[10.5px] font-bold text-good uppercase tracking-[0.4px] mb-1">{t('favorableFor', 'Favorable For')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {dailyReading.favorableFor.map((f, i) => (
                                <span key={i} className="text-[11px] px-2 py-1 rounded-[6px] bg-good-soft text-good">{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {dailyReading.avoid.length > 0 && (
                          <div>
                            <p className="text-[10.5px] font-bold text-risk uppercase tracking-[0.4px] mb-1">{t('avoid', 'Avoid')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {dailyReading.avoid.map((a, i) => (
                                <span key={i} className="text-[11px] px-2 py-1 rounded-[6px] bg-risk-soft text-risk">{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {dailyReading.moodForecast && (
                          <div>
                            <p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1">{t('moodForecast', 'Mood Forecast')}</p>
                            <p className="text-[11.5px] leading-[1.5] text-fg-secondary">{dailyReading.moodForecast}</p>
                          </div>
                        )}
                        {dailyReading.remediation.length > 0 && (
                          <div>
                            <p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1">{t('remediation', 'Remediation')}</p>
                            <ul className="text-[11.5px] leading-[1.5] text-fg-secondary list-disc list-inside space-y-0.5">
                              {dailyReading.remediation.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  }
                  return <p className="text-[12.5px] leading-[1.6] text-fg-secondary">{readings[tab as 'monthly' | 'yearly']}</p>
                })()}
              </Card>

              {remediation.length > 0 && (
                <Card title={t('remediation', 'Remediation')}>
                  <div className="flex flex-col gap-2.5">
                    {remediation.map(r => (
                      <div key={r.title} className="bg-surface-2 rounded-[10px] px-3 py-2.5">
                        <p className="text-xs font-bold text-fg-primary mb-0.5">{r.title}</p>
                        <p className="text-[11.5px] leading-[1.5] text-fg-secondary">{r.text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-fg-tertiary mt-2.5">{t('remediationDisclaimer', 'Traditional remedial guidance, not medical or financial advice.')}</p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
