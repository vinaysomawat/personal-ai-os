'use client'

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
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
        className="flex items-center justify-center w-7 h-7 rounded-full border border-border-strong text-fg-secondary hover:text-fg-primary hover:border-accent/40 transition-colors shrink-0">
        <Settings2 size={13} />
      </button>
      {open && (
        <Modal title="Coding Settings" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className={modalLabelClass}>Assignment Mode</label>
              <select value={settings.mode} onChange={e => setSettings(s => ({ ...s, mode: e.target.value as CodingSettings['mode'] }))}
                className={modalSelectClass}>
                <option value="rotation">Rotation (weekday difficulty mix)</option>
                <option value="fixed">Fixed count per day</option>
              </select>
            </div>
            {settings.mode === 'fixed' && (
              <div>
                <label className={modalLabelClass}>Questions per Day</label>
                <input type="number" min={1} max={10} value={settings.fixed_count}
                  onChange={e => setSettings(s => ({ ...s, fixed_count: parseInt(e.target.value) || 1 }))}
                  className={modalInputClass()} />
              </div>
            )}
            <button
              onClick={() => setSettings(s => ({ ...s, telegram_notify: !s.telegram_notify }))}
              className="flex items-center justify-between w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-[10px] text-[13px] text-fg-primary"
            >
              <span>Telegram notifications</span><span>{settings.telegram_notify ? 'On' : 'Off'}</span>
            </button>
            <div className="flex justify-end gap-2.5 mt-1.5">
              <button onClick={() => setOpen(false)} className={modalCancelButtonClass}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={modalSaveButtonClass}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
