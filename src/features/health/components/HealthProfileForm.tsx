'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { upsertHealthProfile } from '../actions'
import { ACTIVITY_LEVELS } from '../types'
import type { HealthProfile, ActivityLevel, Gender } from '../types'

interface Props {
  profile: HealthProfile | null
  onClose: () => void
  onSaved: (profile: HealthProfile) => void
}

export default function HealthProfileForm({ profile, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-200">Health Profile</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">One-time setup — used to calculate your maintenance calorie targets, macros, and health score. Goal is overall fitness across nutrition, activity, and sleep, not a target weight. Your current weight comes from today&apos;s metric log.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 uppercase tracking-wider">Age</label>
              <input name="age" type="number" required defaultValue={profile?.age ?? ''} placeholder="29" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 uppercase tracking-wider">Gender</label>
              <select name="gender" required defaultValue={profile?.gender ?? 'male'} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Height (cm)</label>
            <input name="height_cm" type="number" required defaultValue={profile?.height_cm ?? ''} placeholder="183" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Activity level</label>
            <select name="activity_level" required defaultValue={profile?.activity_level ?? 'moderate'} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
              {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Workout days/week</label>
            <input name="workout_days_per_week" type="number" min="0" max="7" defaultValue={profile?.workout_days_per_week ?? ''} placeholder="4" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Food preference</label>
            <input name="food_preference" defaultValue={profile?.food_preference ?? ''} placeholder="Indian + Non-Veg" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
