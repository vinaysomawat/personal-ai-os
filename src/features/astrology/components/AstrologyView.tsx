'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import Card from '@/components/Card'
import { upsertAstrologyProfile, getAstrologyReading, getAstrologyProfile } from '../actions'
import { getCurrentDasha, getCurrentYogini } from '../chart-calculations'
import { getRemediation } from '../remedies'
import { todayIST } from '@/lib/date'
import KundliChart from './KundliChart'
import type { AstrologyProfile, ReadingPeriod } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const TABS: { key: ReadingPeriod; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'monthly', label: 'This Month' },
  { key: 'yearly', label: 'This Year' },
]

// Matches Career Profile's compact inline-editable field grid (same label/
// value type scale) rather than a standalone form card — birth details are
// write-once in practice, so this shouldn't dominate the page the way a
// prominent setup form would. Unlike Career's per-field ProfileField (each
// field saves independently), every field here is edited together in one
// pass: the natal chart is a function of all of them at once, so editing
// just one in isolation would leave the stored chart inconsistent with the
// rest until the others were also re-saved.
function BirthDetailsCard({ profile, onSaved }: { profile: AstrologyProfile | null; onSaved: () => void }) {
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
      <Card title="Birth Details" padding="p-3.5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5">
            <div><p className={labelClass}>Birth Date</p><input name="birthDate" type="date" required defaultValue={profile?.birth_date} className={fieldClass} /></div>
            <div><p className={labelClass}>Birth Time (24h)</p><input name="birthTime" type="time" required defaultValue={profile?.birth_time} className={fieldClass} /></div>
            <div><p className={labelClass}>Birth Place</p><input name="birthPlaceName" type="text" required defaultValue={profile?.birth_place_name} placeholder="Mumbai, India" className={fieldClass} /></div>
            <div><p className={labelClass}>Latitude</p><input name="birthLat" type="number" step="any" required defaultValue={profile?.birth_lat} placeholder="19.076" className={fieldClass} /></div>
            <div><p className={labelClass}>Longitude</p><input name="birthLng" type="number" step="any" required defaultValue={profile?.birth_lng} placeholder="72.877" className={fieldClass} /></div>
            <div><p className={labelClass}>UTC Offset</p><input name="birthTimezone" type="number" step="any" required defaultValue={profile?.birth_timezone} placeholder="5.5" className={fieldClass} /></div>
          </div>
          {error && <p className="text-xs text-risk">{error}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-colors">
              <Check size={12} /> {saving ? 'Computing chart…' : 'Save'}
            </button>
            {profile && (
              <button type="button" onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-fg-tertiary text-xs hover:bg-surface-2 transition-colors">
                <X size={12} /> Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card title="Birth Details" padding="p-3.5" action={
      <button onClick={() => setEditing(true)} aria-label="Edit birth details" className="text-fg-quaternary hover:text-fg-secondary transition-colors">
        <Pencil size={13} />
      </button>
    }>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5">
        <div><p className={labelClass}>Birth Date</p><p className="text-[13.5px] font-medium text-fg-primary">{profile ? formatDate(profile.birth_date) : '—'}</p></div>
        <div><p className={labelClass}>Birth Time</p><p className="text-[13.5px] font-medium text-fg-primary">{profile?.birth_time ?? '—'}</p></div>
        <div><p className={labelClass}>Birth Place</p><p className="text-[13.5px] font-medium text-fg-primary">{profile?.birth_place_name ?? '—'}</p></div>
      </div>
    </Card>
  )
}

export default function AstrologyView({ initialProfile }: { initialProfile: AstrologyProfile | null }) {
  const [profile, setProfile] = useState(initialProfile)
  const [tab, setTab] = useState<ReadingPeriod>('daily')
  const [readings, setReadings] = useState<Partial<Record<ReadingPeriod, string>>>({})
  const [readingLoading, setReadingLoading] = useState(false)

  const handleSaved = async () => {
    setProfile(await getAstrologyProfile())
    setReadings({})
  }

  const loadReading = async (period: ReadingPeriod) => {
    if (!profile) return
    setReadingLoading(true)
    const text = await getAstrologyReading(profile, period)
    setReadings(prev => ({ ...prev, [period]: text }))
    setReadingLoading(false)
  }

  const selectTab = (period: ReadingPeriod) => {
    setTab(period)
    if (!readings[period]) loadReading(period)
  }

  const today = todayIST()
  const currentDasha = profile ? getCurrentDasha(profile.natal_chart.vimshottariDasha, today) : null
  const currentYogini = profile ? getCurrentYogini(profile.natal_chart.yoginiDasha, today) : null
  const remediation = profile ? getRemediation(profile.natal_chart) : []
  const moon = profile?.natal_chart.planets.find(p => p.planet === 'Moon')

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Astrology</h1>
        <p className="text-xs text-fg-tertiary mt-0.5">Vedic horoscope · natal chart · dasha timeline</p>
      </div>

      <BirthDetailsCard profile={profile} onSaved={handleSaved} />

      {profile && (
        <>
          {currentDasha && (
            <div className="bg-accent-soft border border-accent-border rounded-[14px] px-4 py-3 flex flex-wrap items-center gap-3.5">
              <p className="text-[10.5px] font-bold text-accent-strong uppercase tracking-[0.4px]">Current Dasha</p>
              <p className="text-[13.5px] font-bold text-fg-primary">
                {currentDasha.mahadasha.lord} Mahadasha / {currentDasha.antardasha.lord} Antardasha
              </p>
              <p className="text-xs text-fg-secondary">until {formatDate(currentDasha.antardasha.endDate)}</p>
              {currentYogini && (
                <p className="text-[11.5px] text-fg-tertiary ml-auto">
                  Yogini: {currentYogini.lord}, until {formatDate(currentYogini.endDate)}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,380px)_1fr] gap-[var(--grid-gap)] items-start">
            <Card title="Natal Chart">
              <p className="text-[11px] text-fg-tertiary mb-3">
                {formatDate(profile.birth_date)} · {profile.birth_time} (UTC{profile.birth_timezone >= 0 ? '+' : ''}{profile.birth_timezone}) · {profile.birth_place_name}
              </p>
              <KundliChart lagnaRashi={profile.natal_chart.lagna.rashi} planets={profile.natal_chart.planets} />
              {moon && (
                <p className="text-[10.5px] text-fg-tertiary text-center mt-3">
                  Lagna: {profile.natal_chart.lagna.rashi} · Moon Nakshatra: {moon.nakshatra}, Pada {moon.nakshatraPada}
                </p>
              )}
            </Card>

            <div className="flex flex-col gap-[var(--grid-gap)]">
              <Card title="Horoscope">
                <div className="flex border-b border-surface-3 mb-3">
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => selectTab(t.key)}
                      className={`px-3 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${
                        tab === t.key ? 'text-accent border-accent' : 'text-fg-tertiary border-transparent hover:text-fg-secondary'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {readingLoading && !readings[tab] && <p className="text-sm text-fg-tertiary">Reading the transits…</p>}
                {!readingLoading && !readings[tab] && (
                  <button onClick={() => loadReading(tab)}
                    className="px-4 py-2 rounded-[8px] bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
                    Get {TABS.find(t => t.key === tab)?.label} Reading
                  </button>
                )}
                {readings[tab] && <p className="text-[12.5px] leading-[1.6] text-fg-secondary">{readings[tab]}</p>}
              </Card>

              {remediation.length > 0 && (
                <Card title="Remediation">
                  <div className="flex flex-col gap-2.5">
                    {remediation.map(r => (
                      <div key={r.title} className="bg-surface-2 rounded-[10px] px-3 py-2.5">
                        <p className="text-xs font-bold text-fg-primary mb-0.5">{r.title}</p>
                        <p className="text-[11.5px] leading-[1.5] text-fg-secondary">{r.text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-fg-tertiary mt-2.5">Traditional remedial guidance, not medical or financial advice.</p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
