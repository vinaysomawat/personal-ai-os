'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { upsertHealthProfile } from '../actions'
import { ACTIVITY_LEVELS } from '../types'
import type { HealthProfile, ActivityLevel, Gender } from '../types'
import { useEscapeKey } from '@/lib/use-escape-key'
import { useFormValidation } from '@/lib/use-form-validation'
import FieldError from '@/components/FieldError'

interface Props {
  profile: HealthProfile | null
  onClose: () => void
  onSaved: (profile: HealthProfile) => void
}

export default function HealthProfileForm({ profile, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  useEscapeKey(onClose)
  const { invalidFields, validate, onFieldInput } = useFormValidation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate(e.currentTarget)) return
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const payload = {
      age: parseInt(fd.get('age') as string) || null,
      gender: (fd.get('gender') as Gender) || null,
      height_cm: parseFloat(fd.get('height_cm') as string) || null,
      target_weight_kg: null,
      activity_level: (fd.get('activity_level') as ActivityLevel) || null,
      workout_days_per_week: parseInt(fd.get('workout_days_per_week') as string) || null,
      food_preference: (fd.get('food_preference') as string) || null,
      goal_deadline: null,
    }
    await upsertHealthProfile(payload)
    onSaved({
      id: profile?.id ?? '',
      user_id: profile?.user_id ?? '',
      updated_at: new Date().toISOString(),
      ...payload,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-fg-primary">Health Profile</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-secondary"><X size={16} /></button>
        </div>
        <p className="text-xs text-fg-tertiary mb-4">One-time setup — used to calculate your daily calorie/macro targets and health score. If your BMI is above normal, targets carry a gradual deficit toward a normal BMI (auto-computed from height, no target weight needed); otherwise they&apos;re maintenance. Your current weight comes from today&apos;s metric log.</p>
        <form onSubmit={handleSubmit} noValidate onInput={onFieldInput} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-fg-tertiary uppercase tracking-wider">Age</label>
              <input name="age" type="number" required defaultValue={profile?.age ?? ''} placeholder="29" className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors ${invalidFields.has('age') ? 'border-red-500' : 'border-surface-3'}`} />
              <FieldError show={invalidFields.has('age')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg-tertiary uppercase tracking-wider">Gender</label>
              <select name="gender" required defaultValue={profile?.gender ?? 'male'} className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-fg-secondary outline-none focus:border-accent transition-colors ${invalidFields.has('gender') ? 'border-red-500' : 'border-surface-3'}`}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <FieldError show={invalidFields.has('gender')} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-fg-tertiary uppercase tracking-wider">Height (cm)</label>
            <input name="height_cm" type="number" required defaultValue={profile?.height_cm ?? ''} placeholder="183" className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors ${invalidFields.has('height_cm') ? 'border-red-500' : 'border-surface-3'}`} />
            <FieldError show={invalidFields.has('height_cm')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-fg-tertiary uppercase tracking-wider">Activity level</label>
            <select name="activity_level" required defaultValue={profile?.activity_level ?? 'moderate'} className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-fg-secondary outline-none focus:border-accent transition-colors ${invalidFields.has('activity_level') ? 'border-red-500' : 'border-surface-3'}`}>
              {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <FieldError show={invalidFields.has('activity_level')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-fg-tertiary uppercase tracking-wider">Workout days/week</label>
            <input name="workout_days_per_week" type="number" min="0" max="7" defaultValue={profile?.workout_days_per_week ?? ''} placeholder="4" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-fg-tertiary uppercase tracking-wider">Food preference</label>
            <input name="food_preference" defaultValue={profile?.food_preference ?? ''} placeholder="Indian + Non-Veg" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-fg-secondary text-sm hover:bg-surface-3 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-60 active:scale-95 transition">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
