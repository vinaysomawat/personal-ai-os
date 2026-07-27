'use client'

import { useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { upsertCodingSettings } from '../daily'
import type { CodingSettings } from '../daily-core'

export default function CodingSettingsPopover({ initialSettings }: { initialSettings: CodingSettings }) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await upsertCodingSettings(settings)
    setSaving(false)
    setOpen(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title="Settings" aria-label="Coding settings"
        className="flex items-center justify-center w-7 h-7 rounded-full border border-surface-3 text-fg-secondary hover:text-fg-primary hover:border-accent/40 transition-colors shrink-0">
        <Settings2 size={13} />
      </button>
      {open && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-fg-primary">Coding Settings</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-secondary"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-fg-tertiary uppercase tracking-wider">Assignment mode</label>
                <select value={settings.mode} onChange={e => setSettings(s => ({ ...s, mode: e.target.value as CodingSettings['mode'] }))}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-secondary outline-none focus:border-accent transition-colors">
                  <option value="rotation">Smart rotation (recommended)</option>
                  <option value="fixed">Fixed number per day</option>
                </select>
              </div>
              {settings.mode === 'fixed' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-fg-tertiary uppercase tracking-wider">Questions per day</label>
                  <input type="number" min={1} max={10} value={settings.fixed_count}
                    onChange={e => setSettings(s => ({ ...s, fixed_count: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent transition-colors" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
                <input type="checkbox" checked={settings.telegram_notify} onChange={e => setSettings(s => ({ ...s, telegram_notify: e.target.checked }))}
                  className="rounded border-surface-3" />
                Morning Telegram notification
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-fg-secondary text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-60 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
